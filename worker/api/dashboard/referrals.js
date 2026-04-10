// worker/api/dashboard/referrals.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardReferrals(request, env, ctx, params) {
    const url = new URL(request.url);
    const method = request.method;

    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // ── GET ──────────────────────────────────────────────────────────
        if (method === 'GET') {
            if (url.pathname.includes('/stats')) {
                const { results } = await env.DB.prepare(`
                    SELECT s.*, p.email, p.full_name, p.referral_code, p.phone_number,
                        COALESCE(s.total_referrals, 0) as total_referrals,
                        COALESCE(s.total_earned, 0) as total_earned,
                        10 as commission_percent
                    FROM referral_stats s
                    LEFT JOIN profiles p ON s.referrer_id = p.id
                    ORDER BY s.total_referrals DESC
                `).all();
                return Response.json(results || []);
            }
            if (url.pathname.includes('/logs')) {
                const { results } = await env.DB.prepare(`
                    SELECT l.*, u1.email as referrer_email, u2.email as referred_email
                    FROM referral_logs l
                    LEFT JOIN profiles u1 ON l.referrer_id = u1.id
                    LEFT JOIN profiles u2 ON l.referred_id = u2.id
                    ORDER BY l.created_at DESC
                    LIMIT 100
                `).all();
                return Response.json(results || []);
            }
            // GET /api/admin/referrals — list all affiliates
            try {
                const { results } = await env.DB.prepare(`
                    SELECT a.*,
                        COALESCE(s.total_referrals, 0) as total_referrals,
                        COALESCE(s.total_earned, 0) as total_earned
                    FROM affiliates a
                    LEFT JOIN referral_stats s ON s.referrer_id = a.id
                    ORDER BY a.created_at DESC
                `).all();
                return Response.json(results || []);
            } catch {
                const { results } = await env.DB.prepare(`
                    SELECT s.*, p.email, p.full_name, p.phone_number,
                        COALESCE(p.referral_code, '') as referral_code,
                        10 as commission_percent
                    FROM referral_stats s
                    LEFT JOIN profiles p ON s.referrer_id = p.id
                    ORDER BY s.total_referrals DESC
                `).all();
                return Response.json(results || []);
            }
        }

        // ── POST: Enroll Affiliate ────────────────────────────────────────
        if (method === 'POST') {
            const body = await request.json();
            const { full_name, email, phone_number, referral_code, commission_percent, notes } = body;

            if (!full_name || !email || !referral_code) {
                return Response.json({ error: 'Name, email, and referral code are required' }, { status: 400 });
            }

            // Check for duplicate referral code
            const dupe = await env.DB.prepare(
                `SELECT id FROM profiles WHERE referral_code = ? LIMIT 1`
            ).bind(referral_code.toUpperCase()).first().catch(() => null);
            if (dupe) {
                return Response.json({ error: 'Referral code already in use' }, { status: 409 });
            }

            // Try affiliates table first; fall back to setting referral_code on profiles
            try {
                await env.DB.prepare(`
                    INSERT INTO affiliates (full_name, email, phone_number, referral_code, commission_percent, notes, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'))
                `).bind(full_name, email, phone_number || null, referral_code.toUpperCase(), Number(commission_percent) || 10, notes || null).run();
            } catch {
                // Fallback: upsert into profiles
                const existing = await env.DB.prepare(`SELECT id FROM profiles WHERE email = ?`).bind(email).first().catch(() => null);
                if (existing) {
                    await env.DB.prepare(`
                        UPDATE profiles SET referral_code = ?, phone_number = COALESCE(?, phone_number)
                        WHERE email = ?
                    `).bind(referral_code.toUpperCase(), phone_number || null, email).run();
                } else {
                    await env.DB.prepare(`
                        INSERT INTO profiles (id, email, full_name, phone_number, referral_code, role, created_at)
                        VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'affiliate', datetime('now'))
                    `).bind(email, full_name, phone_number || null, referral_code.toUpperCase()).run();
                }
            }

            await env.DB.prepare(`INSERT INTO admin_logs (action, details) VALUES (?, ?) `)
                .bind('AFFILIATE_ENROLLED', `${full_name} (${email}) — code: ${referral_code}`).run().catch(() => {});

            return Response.json({ success: true, message: `${full_name} enrolled as affiliate` }, { status: 201 });
        }

        // ── PUT / PATCH: Update Affiliate ─────────────────────────────────
        if (method === 'PUT' || method === 'PATCH') {
            const id = params?.id || url.pathname.split('/').filter(Boolean).pop();
            if (!id) return Response.json({ error: 'Affiliate ID required' }, { status: 400 });
            const body = await request.json();

            try {
                await env.DB.prepare(`
                    UPDATE affiliates
                    SET commission_percent = COALESCE(?, commission_percent),
                        notes = COALESCE(?, notes),
                        status = COALESCE(?, status)
                    WHERE id = ?
                `).bind(body.commission_percent ?? null, body.notes ?? null, body.status ?? null, id).run();
            } catch {
                if (body.referral_code) {
                    await env.DB.prepare(`UPDATE profiles SET referral_code = ? WHERE id = ?`)
                        .bind(body.referral_code.toUpperCase(), id).run();
                }
            }
            return Response.json({ success: true });
        }

        // ── DELETE: Remove Affiliate ──────────────────────────────────────
        if (method === 'DELETE') {
            const id = params?.id || url.pathname.split('/').filter(Boolean).pop();
            if (!id) return Response.json({ error: 'Affiliate ID required' }, { status: 400 });

            try {
                await env.DB.prepare(`DELETE FROM affiliates WHERE id = ?`).bind(id).run();
            } catch {
                await env.DB.prepare(`UPDATE profiles SET referral_code = NULL WHERE id = ?`).bind(id).run();
            }
            return Response.json({ success: true });
        }

        return new Response('Not Found', { status: 404 });
    } catch (err) {
        console.error('[Referral Dashboard API Error]', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
