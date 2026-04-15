// worker/api/admin/courtroom.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleAdminCourtroom(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401 });

    const url = new URL(request.url);
    const method = request.method;
    const parts = url.pathname.split('/').filter(Boolean);
    // Path example: /api/admin/escrow/courtroom/:id/forensics

    // 1. Dispute List
    if (method === 'GET' && url.pathname.endsWith('/disputes')) {
        const rows = await env.DB.prepare(`
            SELECT e.*, 
                   bp.username as buyer_username, 
                   sp.username as seller_username
            FROM escrow_transactions e
            JOIN profiles bp ON e.buyer_id = bp.id
            JOIN profiles sp ON e.seller_id = sp.id
            WHERE e.state = 'DISPUTED'
            ORDER BY e.updated_at ASC
        `).all();
        return Response.json({ disputes: rows.results });
    }

    // 2. Transaction Forensics (The Unified Timeline)
    if (method === 'GET' && url.pathname.endsWith('/forensics')) {
        const id = parts[parts.length - 2];
        
        // Fetch interleaved events, evidence, and messages
        const [events, evidence, chat] = await Promise.all([
            env.DB.prepare('SELECT "EVENT" as source, event as type, actor_id, note as content, created_at FROM escrow_events WHERE escrow_id = ?').bind(id).all(),
            env.DB.prepare('SELECT "EVIDENCE" as source, file_type as type, uploader_id as actor_id, file_url as content, created_at, caption FROM escrow_evidence WHERE escrow_id = ?').bind(id).all(),
            env.DB.prepare('SELECT "CHAT" as source, "message" as type, sender_id as actor_id, content, created_at FROM escrow_messages WHERE escrow_id = ?').bind(id).all()
        ]);

        const timeline = [
            ...events.results,
            ...evidence.results,
            ...chat.results
        ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        return Response.json({ timeline });
    }

    // 3. Adjudicate (The Verdict)
    if (method === 'POST' && url.pathname.endsWith('/adjudicate')) {
        const id = parts[parts.length - 2];
        const { outcome, notes, buyer_split_kes, seller_split_kes, pin } = await request.json();

        // 🛡️ INSTITUTIONAL PIN VERIFICATION
        const systemPin = env.ADJUDICATION_PIN || '000000';
        if (pin !== systemPin) {
            return new Response(JSON.stringify({ error: "Invalid Adjudication PIN", code: "SECURITY_BREACH" }), { 
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Valid outcomes: 'release' (all to seller), 'refund' (all to buyer), 'split' (custom)
        const escrow = await env.DB.prepare('SELECT * FROM escrow_transactions WHERE id = ?').bind(id).first();
        if (!escrow) return new Response("Escrow not found", { status: 404 });

        let final_state = 'RESOLVED';
        let buyer_gets = 0;
        let seller_gets = 0;

        if (outcome === 'release') {
            seller_gets = escrow.seller_receives;
            final_state = 'RESOLVED';
        } else if (outcome === 'refund') {
            buyer_gets = escrow.amount_kes;
            final_state = 'REFUNDED';
        } else if (outcome === 'split') {
            buyer_gets = buyer_split_kes || 0;
            seller_gets = seller_split_kes || 0;
            final_state = 'RESOLVED';
        }

        // Apply Verdict
        await env.DB.prepare(`
            UPDATE escrow_transactions 
            SET state = ?, resolution_notes = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).bind(final_state, notes, id).run();

        // Log Admin Action
        await env.DB.prepare(`
            INSERT INTO admin_logs (id, admin_id, action_type, reference_id, before_state, after_state, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.id,
            'ADJUDICATE',
            id,
            escrow.state,
            final_state,
            `Verdict: ${outcome}. Split: B=${buyer_gets}/S=${seller_gets}. ${notes}`
        ).run();

        return Response.json({ success: true, state: final_state });
    }

    return new Response("Method Not Allowed", { status: 405 });
}
