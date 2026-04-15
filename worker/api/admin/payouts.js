// worker/api/admin/payouts.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleAdminPayouts(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401 });

    const url = new URL(request.url);
    const method = request.method;

    // 1. Payout Queue: Released/Refunded deals awaiting manual M-Pesa
    if (method === 'GET' && url.pathname.endsWith('/queue')) {
        const rows = await env.DB.prepare(`
            SELECT 
                e.id, 
                e.seller_id, 
                e.buyer_id, 
                e.amount_kes, 
                e.seller_receives, 
                e.state, 
                e.item_description,
                sp.full_name as seller_name,
                sp.m_pesa_number as seller_phone,
                bp.full_name as buyer_name,
                bp.m_pesa_number as buyer_phone
            FROM escrow_transactions e
            JOIN profiles sp ON e.seller_id = sp.id
            JOIN profiles bp ON e.buyer_id = bp.id
            LEFT JOIN wallet_transactions w ON e.id = w.escrow_id AND w.status = 'COMPLETED'
            WHERE (e.state = 'RELEASED' OR e.state = 'RESOLVED' OR e.state = 'REFUNDED')
            AND w.id IS NULL
            ORDER BY e.released_at ASC
        `).all();

        return Response.json({ queue: rows.results });
    }

    // 2. CSV Export for Safaricom B2C
    if (method === 'GET' && url.pathname.endsWith('/export-csv')) {
        const rows = await env.DB.prepare(`
            SELECT 
                sp.m_pesa_number, 
                CASE WHEN e.state = 'REFUNDED' THEN e.amount_kes ELSE e.seller_receives END as amount,
                e.id as reference
            FROM escrow_transactions e
            JOIN profiles sp ON (CASE WHEN e.state = 'REFUNDED' THEN e.buyer_id ELSE e.seller_id END) = sp.id
            LEFT JOIN wallet_transactions w ON e.id = w.escrow_id AND w.status = 'COMPLETED'
            WHERE (e.state = 'RELEASED' OR e.state = 'RESOLVED' OR e.state = 'REFUNDED')
            AND w.id IS NULL
        `).all();

        let csv = "Phone Number,Amount,Reference\n";
        rows.results.forEach(r => {
            csv += `${r.m_pesa_number},${r.amount},${r.reference}\n`;
        });

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="mpesa_payouts.csv"'
            }
        });
    }

    return new Response("Method Not Allowed", { status: 405 });
}
