// worker/api/escrow.js
// DJ Flowerz — Escrow Engine
// State machine: PENDING → FUNDED → SHIPPED → DELIVERED → RELEASED
//                                         ↘ DISPUTED → RESOLVED | REFUNDED
//                             ↘ CANCELLED

import { getAuthorizedUser } from '../utils/auth.js';
import { sendEmail } from '../utils/email.js';
import { templates } from '../utils/templates.js';

const ADMIN_EMAIL = 'ianmuriithiflowerz@gmail.com';

const ESCROW_STATES = {
    PENDING:   'PENDING',
    FUNDED:    'FUNDED',
    SHIPPED:   'SHIPPED',
    INSPECTION: 'INSPECTION', // New: 48h safety window
    DELIVERED: 'DELIVERED', 
    RELEASED:  'RELEASED',
    DISPUTED:  'DISPUTED',
    RESOLVED:  'RESOLVED',
    REFUNDED:  'REFUNDED',
    CANCELLED: 'CANCELLED',
};

const AUTO_RELEASE_DAYS = 7;
const INSPECTION_HOURS = 48; // Buyer validation window

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handleEscrow(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const parts = url.pathname.replace(/^\/api\/escrow\/?/, '').split('/').filter(Boolean);
        // parts: [] | [id] | [id, action] | ['cron']

        if (request.method === 'GET' && parts.length === 0) {
            return listEscrows(request, env);
        }
        if (request.method === 'POST' && parts.length === 0) {
            return createEscrow(request, env);
        }
        if (request.method === 'GET' && parts.length === 1) {
            return getEscrow(parts[0], env);
        }
        if (request.method === 'POST' && parts.length === 1 && parts[0] === 'cron') {
            return autoReleaseCron(env);
        }
        if (request.method === 'POST' && parts.length === 2) {
            const [id, action] = parts;
            const handlers = {
                fund:    () => fundEscrow(id, request, env),
                ship:    () => shipEscrow(id, request, env),
                deliver: () => deliverEscrow(id, request, env),
                handshake: () => handshakeEscrow(id, request, env), // Transition to INSPECTION
                dispute: () => disputeEscrow(id, request, env),
                resolve: () => resolveEscrow(id, request, env),
                payout:  () => handleAdminPayout(id, request, env), // Admin completes manual payout
                cancel:  () => cancelEscrow(id, request, env),
                'verify-code': () => verifyCode(id, request, env),
                review:  () => submitReview(id, request, env),
                evidence: () => uploadEvidence(id, request, env),
            };
            if (handlers[action]) return handlers[action]();
        }

        if (request.method === 'POST' && parts.length === 1 && parts[0] === 'reports') {
            return reportUser(request, env);
        }

        return json({ error: 'Not found' }, 404);
    } catch (err) {
        console.error('[EscrowAPI]', err.message, err.status);
        return json({ error: err.message || 'Internal server error' }, err.status || 500);
    }
}

// ─── Handlers ──────────────────────────────────────────────────────────────────

async function listEscrows(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const url = new URL(request.url);
    const role = url.searchParams.get('role') || 'both'; // buyer | seller | both

    let rows = [];
    if (role === 'buyer' || role === 'both') {
        const { results } = await env.DB.prepare(`SELECT * FROM escrow_transactions WHERE buyer_id = ? ORDER BY created_at DESC`).bind(user.id).all();
        rows = [...rows, ...results];
    }
    if (role === 'seller' || role === 'both') {
        const { results } = await env.DB.prepare(`SELECT * FROM escrow_transactions WHERE seller_id = ? ORDER BY created_at DESC`).bind(user.id).all();
        rows = [...rows, ...results];
    }

    const seen = new Set();
    const escrows = rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });

    return json({ escrows });
}

async function createEscrow(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const { listing_id, seller_id, amount_kes, item_description } = body;
    const buyer_id = user.id;

    if (!listing_id || !seller_id || !amount_kes || !item_description) {
        return json({ error: 'Missing required fields: listing_id, seller_id, amount_kes, item_description' }, 400);
    }
    if (buyer_id === seller_id) return json({ error: 'Buyer and seller cannot be the same user' }, 400);
    if (amount_kes < 100) return json({ error: 'Minimum escrow amount is 100 KES' }, 400);

    const [sellerProfile] = await Promise.all([
        dbGet(env, 'SELECT is_shadow_flagged, email FROM profiles WHERE id = ?', [seller_id])
    ]);
    
    const isEscalated = sellerProfile?.is_shadow_flagged === 1 ? 1 : 0;
    const escrow_id = `esc_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

    await dbRun(env, `
        INSERT INTO escrow_transactions
          (id, listing_id, buyer_id, seller_id, amount_kes, fee_kes, seller_receives,
           item_description, state, paystack_ref, tracking_number, shipping_carrier,
           dispute_reason, resolution_notes, is_blocked,
           created_at, funded_at, shipped_at, delivered_at, released_at, auto_release_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
        escrow_id, listing_id, buyer_id, seller_id,
        Math.round(amount_kes), Math.round(fee_kes), Math.round(seller_receives),
        item_description, ESCROW_STATES.PENDING,
        null, null, null, null, null, isEscalated,
        now(), null, null, null, null, null, now(),
    ]);

    if (isEscalated) {
        await sendEmail({
            to: ADMIN_EMAIL,
            subject: `⚠️ HIGH RISK ESCROW: Shadow-Flagged Seller — ${escrow_id}`,
            text: `Escrow ID: ${escrow_id}\nSeller: ${seller_id} (${sellerProfile?.email})\nBuyer: ${buyer_id}\nAmount: ${amount_kes} KES\n\nAction: Monitor this deal closely for tracking manipulation or counterfeit claims.`
        }, env);
    }

    await logEvent(env, escrow_id, 'CREATED', buyer_id, `Escrow created for "${item_description}" — ${amount_kes} KES${isEscalated ? ' [Risk Escalated]' : ''}`);
    await notify(env, seller_id, 'escrow_created', escrow_id, `A buyer wants to purchase "${item_description}" via escrow. Awaiting their payment.`, buyer_id);

    return json({ success: true, escrow: { id: escrow_id, listing_id, buyer_id, seller_id, amount_kes: Math.round(amount_kes), fee_kes: Math.round(fee_kes), seller_receives: Math.round(seller_receives), item_description, state: ESCROW_STATES.PENDING, is_escalated: !!isEscalated } }, 201);
}

async function getEscrow(id, env) {
    const row = await dbGet(env, 'SELECT * FROM escrow_transactions WHERE id = ?', [id]);
    if (!row) return json({ error: 'Escrow not found' }, 404);
    const [events, evidence] = await Promise.all([
        dbAll(env, 'SELECT * FROM escrow_events WHERE escrow_id = ? ORDER BY created_at ASC', [id]),
        dbAll(env, 'SELECT * FROM escrow_evidence WHERE escrow_id = ? ORDER BY created_at DESC', [id])
    ]);
    return json({ escrow: { ...row, evidence }, events });
}

async function fundEscrow(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { paystack_ref } = await request.json();
    if (!paystack_ref) return json({ error: 'paystack_ref required' }, 400);

    const row = await requireEscrow(id, env);
    requireState(row, ESCROW_STATES.PENDING);
    requireActor(row, user.id, 'buyer_id');

    await dbRun(env, `
        UPDATE escrow_transactions
        SET state = ?, paystack_ref = ?, funded_at = ?, updated_at = ?
        WHERE id = ?
    `, [ESCROW_STATES.FUNDED, paystack_ref, now(), now(), id]);

    await logEvent(env, id, 'FUNDED', user.id, `Payment received. Ref: ${paystack_ref}`);
    await notify(env, row.seller_id, 'escrow_funded', id, `Buyer paid for "${row.item_description}". Please ship the item.`);

    return json({ success: true, state: ESCROW_STATES.FUNDED });
}

async function shipEscrow(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { tracking_number, shipping_carrier } = await request.json();
    if (!tracking_number || !shipping_carrier) {
        return json({ error: 'tracking_number and shipping_carrier required' }, 400);
    }

    const row = await requireEscrow(id, env);
    requireState(row, ESCROW_STATES.FUNDED);
    requireActor(row, user.id, 'seller_id');

    const release_code = Math.floor(1000 + Math.random() * 9000).toString();
    const auto_release_at = daysFromNow(AUTO_RELEASE_DAYS);

    await dbRun(env, `
        UPDATE escrow_transactions
        SET state = ?, tracking_number = ?, shipping_carrier = ?, 
            shipped_at = ?, auto_release_at = ?, release_code = ?, 
            release_attempts = 0, updated_at = ?
        WHERE id = ?
    `, [ESCROW_STATES.SHIPPED, tracking_number, shipping_carrier, now(), auto_release_at, release_code, now(), id]);

    await logEvent(env, id, 'SHIPPED', user.id, `Marked as shipped. ${shipping_carrier} — ${tracking_number}. OTP generated. Auto-releases ${auto_release_at}.`);
    
    await notify(env, row.buyer_id, 'escrow_shipped', id,
        `Your item "${row.item_description}" has been shipped. Tracking: ${tracking_number}. YOUR RELEASE CODE IS: ${release_code}. Give this to the seller ONLY after you have inspected the goods.`);
    
    // Optional: Send Email with code to buyer
    try {
        const buyerProfile = await dbGet(env, 'SELECT email, full_name FROM profiles WHERE id = ?', [row.buyer_id]);
        if (buyerProfile?.email) {
            await sendEmail({
                to: buyerProfile.email,
                subject: `🔒 Your Release Code for "${row.item_description}"`,
                html: `<h1>Your Release Code: ${release_code}</h1><p>Give this code to the seller only after you have received and inspected your item.</p>`,
            }, env);
        }
    } catch (e) {}

    return json({ success: true, state: ESCROW_STATES.SHIPPED, auto_release_at });
}

async function deliverEscrow(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const row = await requireEscrow(id, env);
    // Modified: Buyer can release early from SHIPPED or INSPECTION
    if (![ESCROW_STATES.SHIPPED, ESCROW_STATES.INSPECTION].includes(row.state)) {
        return json({ error: `Cannot release funds from state ${row.state}` }, 400);
    }
    requireActor(row, user.id, 'buyer_id');

    await dbRun(env, `
        UPDATE escrow_transactions
        SET state = ?, delivered_at = COALESCE(delivered_at, ?), released_at = ?, updated_at = ?
        WHERE id = ?
    `, [ESCROW_STATES.RELEASED, now(), now(), now(), id]);

    await updateReleaseMetrics(row.seller_id, row.created_at, env, row.seller_receives, id);
    await logEvent(env, id, 'MANUAL_RELEASE', user.id, `Buyer waived inspection or confirmed receipt. Funds released.`);
    await triggerPayoutAlerts(id, { ...row, state: ESCROW_STATES.RELEASED }, env);

    return json({ success: true, state: ESCROW_STATES.RELEASED, released_kes: row.seller_receives });
}

async function handshakeEscrow(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const row = await requireEscrow(id, env);
    requireState(row, ESCROW_STATES.SHIPPED);
    requireActor(row, user.id, 'buyer_id');

    const inspection_end = new Date();
    inspection_end.setHours(inspection_end.getHours() + INSPECTION_HOURS);

    await dbRun(env, `
        UPDATE escrow_transactions
        SET state = ?, delivered_at = ?, inspection_end_time = ?, updated_at = ?
        WHERE id = ?
    `, [ESCROW_STATES.INSPECTION, now(), inspection_end.toISOString(), now(), id]);

    await logEvent(env, id, 'INSPECTION_STARTED', user.id, `Handshake confirmed. 48-hour inspection window started. Ends: ${inspection_end.toISOString()}`);
    await notify(env, row.seller_id, 'escrow_inspection', id, `Buyer received the item for "${row.item_description}". Funds will be auto-released in 48h unless a dispute is filed.`);

    return json({ success: true, state: ESCROW_STATES.INSPECTION, inspection_end_time: inspection_end.toISOString() });
}

async function verifyCode(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { code } = await request.json();
    const row = await requireEscrow(id, env);
    
    if (row.is_blocked) return json({ error: 'This transaction is blocked due to too many failed attempts. Please contact support.' }, 403);
    requireState(row, ESCROW_STATES.SHIPPED);
    requireActor(row, user.id, 'seller_id');

    if (row.release_code === code) {
        // Success -> Release
        await dbRun(env, `
            UPDATE escrow_transactions
            SET state = ?, delivered_at = ?, released_at = ?, code_verified_at = ?, updated_at = ?
            WHERE id = ?
        `, [ESCROW_STATES.RELEASED, now(), now(), now(), now(), id]);

        await updateReleaseMetrics(row.seller_id, row.created_at, env, row.seller_receives, id);

        await logEvent(env, id, 'CODE_VERIFIED_RELEASE', user.id, `Correct OTP entered by seller. Funds released.`);
        await notify(env, row.buyer_id, 'escrow_released', id, `Handshake complete! Funds released for "${row.item_description}".`);
        
        // Payout notifications (Reuse logic from deliverEscrow)
        await triggerPayoutAlerts(id, row, env);

        return json({ success: true, state: ESCROW_STATES.RELEASED });
    } else {
        // Failure -> Increment attempts
        const attempts = (row.release_attempts || 0) + 1;
        const isBlocked = attempts >= 3;
        
        await dbRun(env, `
            UPDATE escrow_transactions
            SET release_attempts = ?, is_blocked = ?, updated_at = ?
            WHERE id = ?
        `, [attempts, isBlocked ? 1 : 0, now(), id]);

        if (isBlocked) {
            await logEvent(env, id, 'BLOCKED', user.id, `Brute force detected: 3 failed OTP attempts. Transaction locked.`);
            await notify(env, row.buyer_id, 'escrow_blocked', id, `Security Alert: Someone tried to guess your release code 3 times. Deal locked.`);
            await sendEmail({
                to: ADMIN_EMAIL,
                subject: `🚨 ESCROW BLOCKED: Brute Force detected on ${id}`,
                text: `Escrow ID: ${id}\nSeller ID: ${user.id}\nItem: ${row.item_description}\nAction required: Investigate potential scam.`
            }, env);
        }

        return json({ 
            error: isBlocked ? 'Too many failed attempts. Transaction blocked.' : 'Invalid release code.',
            attempts_remaining: 3 - attempts
        }, 400);
    }
}

async function triggerPayoutAlerts(id, row, env) {
    try {
        const [buyerProfile, sellerProfile] = await Promise.all([
            dbGet(env, 'SELECT email, full_name, username FROM profiles WHERE id = ?', [row.buyer_id]),
            dbGet(env, 'SELECT email, full_name, username FROM profiles WHERE id = ?', [row.seller_id]),
        ]);

        const buyerDisplay = buyerProfile?.username ? `@${buyerProfile.username}` : (buyerProfile?.full_name || row.buyer_id);
        const sellerDisplay = sellerProfile?.username ? `@${sellerProfile.username}` : (sellerProfile?.full_name || row.seller_id);

        await sendEmail({
            to: ADMIN_EMAIL,
            subject: `💰 Escrow Release: KES ${row.seller_receives.toLocaleString()} payout required — ${row.item_description}`,
            html: templates.escrowRelease(
                row.id,
                row.item_description,
                buyerDisplay,
                sellerDisplay,
                row.amount_kes,
                row.fee_kes,
                row.seller_receives
            ),
        }, env);

        if (sellerProfile?.email) {
            await sendEmail({
                to: sellerProfile.email,
                subject: `🎉 KES ${row.seller_receives.toLocaleString()} incoming — your escrow has been released!`,
                html: templates.escrowReleaseSeller(
                    sellerProfile.full_name || 'Seller',
                    row.item_description,
                    row.seller_receives,
                    row.fee_kes
                ),
            }, env);
        }
    } catch (e) {
        console.error('[Escrow] Payout alerts failed:', e.message);
    }
}

async function disputeEscrow(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { reason } = await request.json();
    if (!reason || reason.trim().length < 10) {
        return json({ error: 'Please provide a detailed dispute reason (min 10 chars)' }, 400);
    }

    const row = await requireEscrow(id, env);
    if (![ESCROW_STATES.SHIPPED, ESCROW_STATES.FUNDED].includes(row.state)) {
        return json({ error: `Cannot dispute from state ${row.state}` }, 400);
    }
    requireActor(row, user.id, 'buyer_id');

    await dbRun(env, `
        UPDATE escrow_transactions
        SET state = ?, dispute_reason = ?, updated_at = ?
        WHERE id = ?
    `, [ESCROW_STATES.DISPUTED, reason.trim(), now(), id]);

    await logEvent(env, id, 'DISPUTED', user.id, `Dispute raised: "${reason.trim()}"`);
    await notify(env, row.seller_id, 'escrow_disputed', id, `Buyer raised a dispute for "${row.item_description}": "${reason}". An admin will review.`);

    return json({ success: true, state: ESCROW_STATES.DISPUTED });
}

async function resolveEscrow(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.role !== 'admin') return json({ error: 'Only admins can resolve disputes' }, 403);

    const { outcome, notes } = await request.json();
    if (!['release', 'refund'].includes(outcome)) {
        return json({ error: 'outcome must be "release" or "refund"' }, 400);
    }

    const row = await requireEscrow(id, env);
    requireState(row, ESCROW_STATES.DISPUTED);

    const newState = outcome === 'release' ? ESCROW_STATES.RESOLVED : ESCROW_STATES.REFUNDED;

    await dbRun(env, `
        UPDATE escrow_transactions
        SET state = ?, resolution_notes = ?, released_at = ?, updated_at = ?
        WHERE id = ?
    `, [newState, notes || null, now(), now(), id]);

    await logEvent(env, id, `RESOLVED_${outcome.toUpperCase()}`, user.id, `Admin resolved: ${outcome}. ${notes || ''}`);

    if (outcome === 'release') {
        await notify(env, row.seller_id, 'escrow_resolved_release', id, `Dispute resolved in your favour. ${row.seller_receives} KES released.`);
        await notify(env, row.buyer_id, 'escrow_resolved_release', id, `Dispute resolved in seller's favour for "${row.item_description}".`);
        await triggerPayoutAlerts(id, { ...row, state: ESCROW_STATES.RESOLVED }, env);
    } else {
        await notify(env, row.buyer_id, 'escrow_resolved_refund', id, `Dispute resolved in your favour. ${row.amount_kes} KES will be refunded.`);
        await notify(env, row.seller_id, 'escrow_resolved_refund', id, `Dispute resolved in buyer's favour for "${row.item_description}".`);
    }

    return json({ success: true, state: newState, outcome });
}

async function handleAdminPayout(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') return json({ error: 'Unauthorized' }, 401);

    const { receipt_code } = await request.json();
    if (!receipt_code) return json({ error: 'M-Pesa Receipt Code required' }, 400);

    const row = await requireEscrow(id, env);
    // State must be RELEASED, RESOLVED, or REFUNDED (if we owe money back)
    if (![ESCROW_STATES.RELEASED, ESCROW_STATES.RESOLVED, ESCROW_STATES.REFUNDED].includes(row.state)) {
        return json({ error: 'Escrow must be in a release-ready state' }, 400);
    }

    // Check if payout already exists for this escrow
    const existing = await dbGet(env, 'SELECT id FROM wallet_transactions WHERE escrow_id = ? AND status = "COMPLETED"', [id]);
    if (existing) return json({ error: 'Payout already recorded for this transaction' }, 409);

    const txn_id = `wtx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const payoutTo = row.state === ESCROW_STATES.REFUNDED ? row.buyer_id : row.seller_id;
    const payoutAmount = row.state === ESCROW_STATES.REFUNDED ? row.amount_kes : row.seller_receives;

    await dbRun(env, `
        INSERT INTO wallet_transactions (id, user_id, amount_kes, type, escrow_id, status, payout_receipt_code, payout_admin_id, created_at)
        VALUES (?, ?, ?, 'WITHDRAWAL', ?, 'COMPLETED', ?, ?, ?)
    `, [txn_id, payoutTo, -payoutAmount, id, receipt_code, user.id, now()]);

    await logEvent(env, id, 'PAYOUT_RECONCILED', user.id, `M-Pesa Payout confirmed. Receipt: ${receipt_code}`);
    
    return json({ success: true, transaction_id: txn_id });
}

async function cancelEscrow(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const row = await requireEscrow(id, env);
    requireState(row, ESCROW_STATES.PENDING);
    if (user.id !== row.buyer_id && user.id !== row.seller_id) {
        return json({ error: 'Only the buyer or seller can cancel this escrow' }, 403);
    }

    await dbRun(env, `UPDATE escrow_transactions SET state = ?, updated_at = ? WHERE id = ?`,
        [ESCROW_STATES.CANCELLED, now(), id]);

    await logEvent(env, id, 'CANCELLED', user.id, 'Escrow cancelled before funding.');
    return json({ success: true, state: ESCROW_STATES.CANCELLED });
}

async function autoReleaseCron(env) {
    // 1. Auto-Handshake (Shipment -> Inspection after AUTO_RELEASE_DAYS if buyer forgotten)
    // 2. Auto-Release (Inspection -> Released after inspection_end_time)
    
    const results = [];
    
    // Process Inspection -> Released
    const inspectionDue = await dbAll(env, `
        SELECT * FROM escrow_transactions
        WHERE state = ? AND inspection_end_time <= ?
    `, [ESCROW_STATES.INSPECTION, now()]);

    for (const row of inspectionDue) {
        await dbRun(env, `UPDATE escrow_transactions SET state = ?, released_at = ?, updated_at = ? WHERE id = ?`,
            [ESCROW_STATES.RELEASED, now(), now(), row.id]);

        await updateReleaseMetrics(row.seller_id, row.created_at, env, row.seller_receives, row.id);
        await logEvent(env, row.id, 'AUTO_RELEASED_AFTER_INSPECTION', 'system', `Safety window expired. Funds released.`);
        await triggerPayoutAlerts(row.id, row, env);
        results.push({ id: row.id, action: 'released' });
    }

    // Process Shipped -> Inspection (Long delay fallback)
    const shippedDue = await dbAll(env, `
        SELECT * FROM escrow_transactions
        WHERE state = ? AND auto_release_at <= ?
    `, [ESCROW_STATES.SHIPPED, now()]);

    for (const row of shippedDue) {
        await dbRun(env, `UPDATE escrow_transactions SET state = ?, released_at = ?, updated_at = ? WHERE id = ?`,
            [ESCROW_STATES.RELEASED, now(), now(), row.id]);

        await updateReleaseMetrics(row.seller_id, row.created_at, env, row.seller_receives, row.id);

        await logEvent(env, row.id, 'AUTO_RELEASED', 'system', `Auto-released after ${AUTO_RELEASE_DAYS} days. ${row.seller_receives} KES released to seller.`);
        await notify(env, row.seller_id, 'escrow_auto_released', row.id, `Payment auto-released for "${row.item_description}". ${row.seller_receives} KES transferred.`);
        await notify(env, row.buyer_id, 'escrow_auto_released', row.id, `Escrow for "${row.item_description}" was auto-released to the seller after ${AUTO_RELEASE_DAYS} days.`);

        // Email admin for auto-release payout
        try {
            const [buyerProfile, sellerProfile] = await Promise.all([
                dbGet(env, 'SELECT email, full_name FROM profiles WHERE id = ?', [row.buyer_id]),
                dbGet(env, 'SELECT email, full_name FROM profiles WHERE id = ?', [row.seller_id]),
            ]);
            await sendEmail({
                to: ADMIN_EMAIL,
                subject: `⏱ Auto-Released Escrow: KES ${row.seller_receives.toLocaleString()} payout — ${row.item_description}`,
                html: templates.escrowRelease(
                    row.id,
                    row.item_description,
                    buyerProfile?.email ?? row.buyer_id,
                    sellerProfile?.email ?? row.seller_id,
                    row.amount_kes,
                    row.fee_kes,
                    row.seller_receives
                ),
            }, env);
            if (sellerProfile?.email) {
                await sendEmail({
                    to: sellerProfile.email,
                    subject: `⏱ Auto-payment released — KES ${row.seller_receives.toLocaleString()} incoming`,
                    html: templates.escrowReleaseSeller(
                        sellerProfile.full_name || 'Seller',
                        row.item_description,
                        row.seller_receives,
                        row.fee_kes
                    ),
                }, env);
            }
        } catch (emailErr) {
            console.error('[Escrow/Cron] Email failed:', emailErr.message);
        }

        results.push({ id: row.id, seller_receives: row.seller_receives });
    }

    return json({ released: results.length, items: results });
}

// ─── Phase 1: New Handlers ───────────────────────────────────────────────────

async function submitReview(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { rating, review_text, tags } = await request.json();
    if (!rating || rating < 1 || rating > 5) return json({ error: 'Rating must be 1-5' }, 400);

    const row = await requireEscrow(id, env);
    if (![ESCROW_STATES.RELEASED, ESCROW_STATES.RESOLVED, ESCROW_STATES.REFUNDED].includes(row.state)) {
        return json({ error: 'Can only review completed/resolved transactions' }, 400);
    }

    const reviewer_id = user.id;
    const isBuyer = reviewer_id === row.buyer_id;
    const isSeller = reviewer_id === row.seller_id;
    if (!isBuyer && !isSeller) return json({ error: 'Not a party to this transaction' }, 403);

    const reviewed_id = isBuyer ? row.seller_id : row.buyer_id;

    const review_id = `rev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await dbRun(env, `
        INSERT INTO escrow_reviews (id, escrow_id, reviewer_id, reviewed_id, rating, review_text, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [review_id, id, reviewer_id, reviewed_id, rating, review_text || '', JSON.stringify(tags || []), now()]);

    await updateProfileRating(reviewed_id, env);
    await logEvent(env, id, 'REVIEW_POSTED', reviewer_id, `Rating: ${rating} for ${reviewed_id === row.seller_id ? 'seller' : 'buyer'}`);

    return json({ success: true, review_id });
}

async function uploadEvidence(id, request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { file_url, file_type, caption } = await request.json();
    if (!file_url) return json({ error: 'file_url required' }, 400);

    const row = await requireEscrow(id, env);
    const role = user.id === row.buyer_id ? 'buyer' : user.id === row.seller_id ? 'seller' : user.role === 'admin' ? 'admin' : null;
    if (!role) return json({ error: 'Not authorized' }, 403);

    const evidence_id = `evd_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await dbRun(env, `
        INSERT INTO escrow_evidence (id, escrow_id, uploader_id, role, file_url, file_type, caption, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [evidence_id, id, user.id, role, file_url, file_type || 'image', caption || '', now()]);

    await logEvent(env, id, 'EVIDENCE_UPLOADED', user.id, `${role} uploaded evidence: ${file_type}`);
    return json({ success: true, evidence_id });
}

async function reportUser(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { reported_id, escrow_id, reason, details } = await request.json();
    if (!reported_id || !reason) return json({ error: 'reported_id and reason required' }, 400);

    const report_id = `rep_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await dbRun(env, `
        INSERT INTO user_reports (id, reporter_id, reported_id, escrow_id, reason, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [report_id, user.id, reported_id, escrow_id || null, reason, details || '', now()]);

    await dbRun(env, `
        UPDATE profiles 
        SET report_count = report_count + 1,
            is_shadow_flagged = CASE WHEN report_count + 1 >= 3 THEN 1 ELSE is_shadow_flagged END
        WHERE id = ?
    `, [reported_id]);

    return json({ success: true, report_id });
}

// ─── Helper Logic for Metrics ────────────────────────────────────────────────

async function updateReleaseMetrics(sellerId, startTime, env, sellerReceives, escrowId) {
    const hours = (new Date(now()) - new Date(startTime)) / (1000 * 60 * 60);
    const txn_id = `wtx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // 1. Log transition
    await dbRun(env, `
        INSERT INTO wallet_transactions (id, user_id, amount_kes, type, escrow_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [txn_id, sellerId, sellerReceives, 'CREDIT', escrowId, 'COMPLETED', now()]);

    // 2. Update profile
    await dbRun(env, `
        UPDATE profiles
        SET wallet_balance_kes = wallet_balance_kes + ?,
            total_deals = total_deals + 1,
            success_deals = success_deals + 1,
            avg_release_hours = (avg_release_hours * (success_deals) + ?) / (success_deals + 1),
            seller_tier = CASE 
                WHEN success_deals + 1 >= 31 AND (success_deals + 1) * 1.0 / (total_deals + 1) >= 0.95 THEN 'gold'
                WHEN success_deals + 1 >= 11 AND (success_deals + 1) * 1.0 / (total_deals + 1) >= 0.85 THEN 'silver'
                WHEN success_deals + 1 >= 3 AND (success_deals + 1) * 1.0 / (total_deals + 1) >= 0.70 THEN 'bronze'
                ELSE seller_tier
            END
        WHERE id = ?
    `, [sellerReceives, hours, sellerId]);
}

// ─── Wallet API ─────────────────────────────────────────────────────────────

export async function handleWallet(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean).slice(2); // /api/wallet/...

    if (request.method === 'GET') {
        const profile = await dbGet(env, 'SELECT wallet_balance_kes FROM profiles WHERE id = ?', [user.id]);
        const transactions = await dbAll(env, `
            SELECT * FROM wallet_transactions 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [user.id]);
        
        return json({ 
            balance: profile?.wallet_balance_kes || 0,
            transactions: transactions || []
        });
    }

    if (request.method === 'POST' && parts[0] === 'withdraw') {
        const { amount } = await request.json();
        const profile = await dbGet(env, 'SELECT wallet_balance_kes, email FROM profiles WHERE id = ?', [user.id]);
        
        if (!amount || amount < 500) return json({ error: 'Minimum withdrawal is KES 500' }, 400);
        if (profile.wallet_balance_kes < amount) return json({ error: 'Insufficient balance' }, 400);

        const txn_id = `wtx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        
        // Atomic deduction
        await dbRun(env, 'UPDATE profiles SET wallet_balance_kes = wallet_balance_kes - ? WHERE id = ?', [amount, user.id]);
        
        await dbRun(env, `
            INSERT INTO wallet_transactions (id, user_id, amount_kes, type, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [txn_id, user.id, -amount, 'WITHDRAWAL', 'PENDING', now()]);

        await sendEmail({
            to: ADMIN_EMAIL,
            subject: `💸 Payout Request: KES ${amount.toLocaleString()} — ${profile.email}`,
            text: `User ID: ${user.id}\nEmail: ${profile.email}\nAmount: KES ${amount}\nTransaction ID: ${txn_id}\n\nPlease process through Paystack/Bank and mark as completed.`
        }, env);

        return json({ success: true, txn_id });
    }

    return json({ error: 'Method not allowed' }, 405);
}

async function updateProfileRating(userId, env) {
    const { results } = await env.DB.prepare(`
        SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
        FROM escrow_reviews 
        WHERE reviewed_id = ?
    `).bind(userId).all();
    
    if (results && results[0]) {
        await dbRun(env, `
            UPDATE profiles 
            SET avg_rating = ?, total_reviews = ? 
            WHERE id = ?
        `, [results[0].avg_rating || 0, results[0].total_reviews || 0, userId]);
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function computeFee(amount) {
    const fee = amount <= 10000
        ? amount * 0.05
        : 10000 * 0.05 + (amount - 10000) * 0.03;
    return Math.max(50, fee);
}

async function requireEscrow(id, env) {
    const row = await dbGet(env, 'SELECT * FROM escrow_transactions WHERE id = ?', [id]);
    if (!row) throw Object.assign(new Error('Escrow not found'), { status: 404 });
    return row;
}

function requireState(row, expectedState) {
    if (row.state !== expectedState) {
        throw Object.assign(
            new Error(`Action not allowed in state ${row.state}. Expected ${expectedState}.`),
            { status: 409 }
        );
    }
}

function requireActor(row, actorId, field) {
    if (row[field] !== actorId) {
        throw Object.assign(new Error(`Only the ${field.replace('_id', '')} can perform this action.`), { status: 403 });
    }
}

function now() { return new Date().toISOString(); }

function daysFromNow(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
}

async function dbRun(env, sql, params = []) {
    return env.DB.prepare(sql).bind(...params).run();
}

async function dbGet(env, sql, params = []) {
    return env.DB.prepare(sql).bind(...params).first();
}

async function dbAll(env, sql, params = []) {
    const result = await env.DB.prepare(sql).bind(...params).all();
    return result.results;
}

import { PushService } from '../utils/push_service.js';

async function logEvent(env, escrowId, event, actorId, note) {
    await dbRun(env, `
        INSERT INTO escrow_events (id, escrow_id, event, actor_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [`evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, escrowId, event, actorId, note, now()]);
}

async function notify(env, userId, type, escrowId, message, actorId = null) {
    // 1. Database Notification (For In-App Feed)
    await dbRun(env, `
        INSERT INTO notifications (id, user_id, type, reference_id, message, is_read, actor_id, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `, [`notif_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`, userId, type, escrowId, message, actorId, now()]);

    // 2. Mobile Push Notification (The "Secret Sauce")
    try {
        const subscriptions = await dbAll(env, 'SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
        if (subscriptions.length > 0) {
            const push = new PushService(env);
            const payload = {
                title: type.replace(/_/g, ' ').toUpperCase(),
                body: message,
                url: `/escrow/${escrowId}`,
                tag: `escrow-${escrowId}`
            };
            
            // Send to all registered devices
            await Promise.all(subscriptions.map(sub => {
                const subObj = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                };
                return push.sendNotification(subObj, payload);
            }));
        }
    } catch (e) {
        console.error('[Escrow/Push] Failed to send push:', e.message);
    }
}
