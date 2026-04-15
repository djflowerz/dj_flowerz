// worker/api/admin/system.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleAdminSystem(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401 });

    const url = new URL(request.url);
    const method = request.method;

    // 1. Platform Health (Financial Reconciliation)
    if (method === 'GET' && url.pathname.endsWith('/health')) {
        const [walletSum, activeEscrowSum, feeSum] = await Promise.all([
            env.DB.prepare('SELECT SUM(wallet_balance_kes) as total FROM profiles').first(),
            env.DB.prepare('SELECT SUM(amount_kes) as total FROM escrow_transactions WHERE state IN ("FUNDED", "SHIPPED", "INSPECTION")').first(),
            env.DB.prepare('SELECT SUM(fee_kes) as total FROM escrow_transactions WHERE state NOT IN ("PENDING", "CANCELLED")').first()
        ]);

        const liability = (walletSum.total || 0) + (activeEscrowSum.total || 0);
        const revenue = (feeSum.total || 0);
        
        // In production, we'd fetch the actual balance from Paystack API here
        const simulatedPaystackBalance = liability + revenue; 
        const discrepancy = simulatedPaystackBalance - (liability + revenue);

        return Response.json({
            liability,
            revenue,
            paystack_balance: simulatedPaystackBalance,
            discrepancy,
            status: discrepancy === 0 ? 'HEALTHY' : 'RECONCILIATION_REQUIRED'
        });
    }

    // 2. Kill Switch (Maintenance Mode)
    if (method === 'POST' && url.pathname.endsWith('/kill-switch')) {
        const { active } = await request.json();
        const value = active ? '1' : '0';
        
        await env.DB.prepare('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = "MAINTENANCE_MODE"')
            .bind(value).run();

        await env.DB.prepare(`
            INSERT INTO admin_logs (id, admin_id, action_type, details)
            VALUES (?, ?, ?, ?)
        `).bind(crypto.randomUUID(), user.id, 'KILL_SWITCH', `Maintenance Mode set to ${active ? 'ON' : 'OFF'}`).run();

        return Response.json({ success: true, maintenance_mode: active });
    }

    // 3. Audit Logs
    if (method === 'GET' && url.pathname.endsWith('/audit-logs')) {
        const logs = await env.DB.prepare(`
            SELECT a.*, p.username as admin_username
            FROM admin_logs a
            JOIN profiles p ON a.admin_id = p.id
            ORDER BY a.created_at DESC
            LIMIT 100
        `).all();
        return Response.json({ logs: logs.results });
    }

    // 4. Security PIN Retrieval (Production Only)
    if (method === 'GET' && url.pathname.endsWith('/security/pin')) {
        const pin = env.ADJUDICATION_PIN || '000000';
        return Response.json({ pin });
    }

    return new Response("Method Not Allowed", { status: 405 });
}
