// worker/api/webhooks/paystack.js
import { sendEmail } from '../../utils/email.js';

export async function handlePaystackWebhook(request, env) {
    const signature = request.headers.get('x-paystack-signature');
    const body = await request.text();

    // 1. Verify signature (HMAC SHA512)
    if (!signature || !env.PAYSTACK_SECRET_KEY) {
        return new Response("Unauthorized - Missing signature or key", { status: 401 });
    }

    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(env.PAYSTACK_SECRET_KEY),
            { name: "HMAC", hash: "SHA-512" },
            false,
            ["sign"]
        );
        const hmacBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
        const hmacArray = Array.from(new Uint8Array(hmacBuffer));
        const hmacHex = hmacArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hmacHex !== signature) {
            console.error('[Paystack Webhook] Invalid signature');
            return new Response("Unauthorized - Invalid signature", { status: 401 });
        }
    } catch (err) {
        console.error('[Paystack Webhook] Verification error:', err);
        return new Response("Error", { status: 500 });
    }

    const event = JSON.parse(body);
    if (event.event === 'charge.success') {
        const { reference, metadata, amount, customer } = event.data;
        const type = metadata?.type;
        const orderId = metadata?.order_id;

        // 1. ALWAYS update order status if order_id is present
        if (orderId) {
            try {
                // Update orders table
                await env.DB.prepare(`
                    UPDATE orders SET payment_status = 'paid', status = 'processing'
                    WHERE id = ?
                `).bind(orderId).run();

                // 1b. Handle Coupon Usage tracking
                try {
                    const order = await env.DB.prepare("SELECT coupon_code, customer_email, user_id FROM orders WHERE id = ?").bind(orderId).first();
                    if (order && order.coupon_code) {
                        const code = order.coupon_code.toUpperCase();
                        const userIdentifier = order.user_id || order.customer_email || 'guest';
                        
                        // Increment global count
                        await env.DB.prepare("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?").bind(code).run();
                        
                        // Record specific usage to prevent multiple uses if is_one_time_per_user is enabled
                        await env.DB.prepare(`
                            INSERT INTO coupon_usage (coupon_code, user_id, order_id)
                            VALUES (?, ?, ?)
                        `).bind(code, userIdentifier, orderId).run();
                        
                        console.log(`[Coupon] Recorded usage for ${code} by ${userIdentifier}`);
                    }
                } catch (couponErr) {
                    console.error('[Paystack Webhook] Coupon Tracking Error:', couponErr);
                    // Non-blocking error
                }

                // Order Receipt
                try {
                    await sendEmail({
                        to: customer?.email || 'customer@djflowerz.co.ke',
                        subject: `Order Receipt - #${orderId}`,
                        fromEmail: 'receipts@djflowerz.co.ke',
                        fromName: 'DJ FLOWERZ Store',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                                <h1 style="color: #a855f7; margin-bottom: 20px;">Order Confirmed!</h1>
                                <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Thank you for your purchase. Your order <strong>#${orderId}</strong> is now being processed.</p>
                                <div style="background: #15151a; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #ffffff10;">
                                    <h3 style="color: #ffffff; margin-top: 0;">Order Summary</h3>
                                    <p style="margin: 5px 0; color: #9ca3af;">Status: <span style="color: #4ade80;">Paid</span></p>
                                    <p style="margin: 5px 0; color: #9ca3af;">Amount: KSh ${(amount / 100).toLocaleString()}</p>
                                </div>
                                <p style="color: #9ca3af; font-size: 14px;">We'll notify you once your order has been dispatched.</p>
                                <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                                <p style="font-size: 10px; color: #4b5563; text-align: center; text-transform: uppercase;">DJ FLOWERZ • Nairobi, Kenya</p>
                            </div>
                        `,
                        text: `Order Confirmed! Your order #${orderId} for KSh ${(amount / 100).toLocaleString()} is being processed.`
                    }, env);
                } catch (e) {
                    console.error('[Order Receipt Email Error]', e);
                }

                // Inventory Update (Subtract Stock)
                try {
                    const { results: items } = await env.DB.prepare("SELECT * FROM order_line_items WHERE order_id = ?").bind(orderId).all();
                    for (const item of items) {
                        await env.DB.prepare(`
                            UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND track_inventory = 1
                        `).bind(item.quantity, item.variant_id).run();
                    }
                } catch(e) { console.error('[Inventory Update Error]', e); }
            } catch (err) {
                console.error('[Order Update Error]', err);
            }
        }

        // 1c. Admin Notification for ANY successful payment
        try {
            const adminEmail = env.GMAIL_USER || 'djflowerz254@gmail.com';
            await sendEmail({
                to: adminEmail,
                subject: `💰 New Payment: KSh ${(amount / 100).toLocaleString()}`,
                fromEmail: 'admin@djflowerz.co.ke',
                fromName: 'DJ FLOWERZ Hub',
                html: `
                    <div style="font-family: sans-serif; background: #0b0b0f; border: 1px solid #1a1a20; padding: 30px; color: #ffffff;">
                        <h2 style="color: #a855f7;">New Payment Received</h2>
                        <div style="background: #15151a; padding: 20px; border-radius: 8px; border: 1px solid #ffffff08;">
                            <p><strong>Amount:</strong> KSh ${(amount / 100).toLocaleString()}</p>
                            <p><strong>Reference:</strong> ${reference}</p>
                            <p><strong>Type:</strong> ${type || (orderId ? 'Store Order' : 'Payment')}</p>
                            <p><strong>Customer:</strong> ${customer?.email}</p>
                            ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ''}
                        </div>
                    </div>
                `,
                text: `New Payment: KSh ${(amount / 100).toLocaleString()} from ${customer?.email} (${reference})`
            }, env);
        } catch (adminErr) {
            console.error('[Admin Notify Error]', adminErr);
        }

        // 2. Handle Subscription Activation (if type is subscription OR planId is present)
        if (type === 'subscription' || metadata?.planId) {
            const userId = metadata?.userId;
            const planId = metadata?.planId;
            const planName = metadata?.plan || 'Premium Plan';

            if (userId && planId) {
                const now = new Date();
                const nowIso = now.toISOString();
                
                // Calculate durations in days
                const durations = {
                    'weekly': 7,
                    'monthly': 30,
                    '3months': 90,
                    '6months': 180,
                    'yearly': 365,
                    'pro': 365,
                    'trial': 7
                };
                const durationDays = durations[planId] || 30;
                
                const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
                const expiryIso = expiryDate.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:MM:SS format
                // Actually, let's keep ISO for R2 consistency, but D1 might expect the ' ' format if it's text.
                // handleTrialActivation used `.replace('T', ' ').substring(0, 19)`
                
                try {
                    // 1. Update D1 Profile
                    await env.DB.prepare(`
                        UPDATE profiles 
                        SET is_subscriber = 1, 
                            subscription_plan = ?, 
                            subscription_expiry = ?, 
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).bind(planId, expiryIso, userId).run();

                    const subId = crypto.randomUUID();
                    await env.DB.prepare(`
                        INSERT INTO subscriptions (id, user_id, plan, status, starts_at, expires_at, created_at)
                        VALUES (?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
                    `).bind(subId, userId, planId, nowIso, expiryIso).run();

                    // 3. Sync to R2 for immediate frontend update
                    try {
                        const existingR2 = await env.PROFILES_BUCKET.get(`profiles/${userId}.json`);
                        let r2Profile = {};
                        if (existingR2) {
                            r2Profile = await existingR2.json();
                        }
                        
                        r2Profile.id = userId; // ensure ID exists
                        r2Profile.is_subscriber = 1;
                        r2Profile.subscription_plan = planId;
                        r2Profile.subscription_expiry = expiryIso;
                        r2Profile.updated_at = new Date().toISOString();
                        
                        await env.PROFILES_BUCKET.put(`profiles/${userId}.json`, JSON.stringify(r2Profile));
                    } catch (r2Err) {
                        console.error('[Paystack Webhook] R2 Sync Error:', r2Err);
                    }

                    // 5. Update trial_usage if exists
                    try {
                        await env.DB.prepare(`
                            UPDATE trial_usage SET status = 'paid_subscriber' WHERE supabase_user_id = ?
                        `).bind(userId).run();
                    } catch (trialErr) {
                        console.error('[Paystack Webhook] trial_usage update error:', trialErr);
                    }

                    // 6. Send Activation Email
                    const userEmail = customer?.email || metadata?.userEmail || 'member@djflowerz.co.ke';
                    const userName = metadata?.userName || customer?.first_name || 'Member';

                    try {
                        await sendEmail({
                            to: userEmail,
                            subject: '🚀 Music Pool Access Activated!',
                            fromEmail: 'admin@djflowerz.co.ke',
                            fromName: 'DJ Flowerz Admin',
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                                    <h1 style="color: #a855f7; margin-bottom: 20px;">Welcome to the Pool!</h1>
                                    <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Hello ${userName}, your <strong>${planName}</strong> is now active.</p>
                                    <div style="background: #15151a; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #ffffff10;">
                                        <h3 style="color: #ffffff; margin-top: 0;">Access Details</h3>
                                        <p style="margin: 5px 0; color: #9ca3af;">Plan: ${planName}</p>
                                        <p style="margin: 5px 0; color: #9ca3af;">Expiry: ${expiryDate.toLocaleDateString()}</p>
                                    </div>
                                    <p style="color: #9ca3af; font-size: 14px;">You now have full access to the Music Pool and exclusive mixtapes. Happy listening!</p>
                                    <a href="https://djflowerz.co.ke/music-pool" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">Enter Music Pool</a>
                                    <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                                    <p style="font-size: 10px; color: #4b5563; text-align: center;">DJ FLOWERZ • Nairobi, Kenya</p>
                                </div>
                            `,
                            text: `Hello ${userName}, your ${planName} is now active! Visit djflowerz.co.ke/music-pool to start.`
                        }, env);
                    } catch (emailErr) {
                        console.error('[Subscription Activation Email Error]', emailErr);
                    }

                } catch (dbErr) {
                    console.error('[Paystack Webhook] Subscription Database Error:', dbErr);
                }
            }
        }

        // 3. Handle Tips separately
        if (type === 'tip') {
            const userId = metadata?.userId || 'guest';
            const userEmail = metadata?.userEmail || customer?.email || 'guest_tipper@djflowerz.co.ke';
            const customerName = metadata?.customerName || customer?.first_name || 'Guest';
            const message = metadata?.message || '';

            try {
                await env.DB.prepare(`
                    INSERT INTO tips (id, amount, message, donor_name, donor_email, user_id, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'completed')
                `).bind(reference, amount / 100, message, customerName, userEmail, userId).run();

                // Send Tip Receipt
                try {
                    await sendEmail({
                        to: userEmail,
                        subject: 'You’re a Legend! 💎 Your Support for DJ FLOWERZ Received',
                        fromEmail: 'admin@djflowerz.co.ke',
                        fromName: 'DJ FLOWERZ',
                        html: `
                            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff; border-radius: 16px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h2 style="letter-spacing: 4px; color: #ffffff; margin: 0;">[ DJ FLOWERZ ]</h2>
                                    <p style="color: #a855f7; font-weight: bold; margin-top: 5px;">Mr Flow Finnesse 🎧</p>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; text-align: center; margin-bottom: 20px; line-height: 1.2;">YO! YOU JUST LEVELED UP THE SOUND.</h1>
                                <p style="font-size: 16px; color: #9ca3af; line-height: 1.6; text-align: center;">I just received your contribution of <strong>KSh ${(amount / 100).toLocaleString()}</strong>, and I wanted to reach out personally to say thank you.</p>
                                <p style="font-size: 16px; color: #9ca3af; line-height: 1.6; text-align: center;">Support like yours is the fuel behind every beat, every late-night studio session, and every mixtape drop. You aren't just a listener—you’re officially part of the journey. 🇰🇪✨</p>
                                
                                <div style="background: #15151a; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #ffffff08;">
                                    <h3 style="color: #ffffff; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Transaction Details:</h3>
                                    <p style="margin: 8px 0; color: #9ca3af;">💰 <strong>Amount:</strong> KSh ${(amount / 100).toLocaleString()}</p>
                                    <p style="margin: 8px 0; color: #9ca3af;">✅ <strong>Status:</strong> Confirmed</p>
                                    <p style="margin: 8px 0; color: #9ca3af;">📩 <strong>Sent to:</strong> admin@djflowerz.co.ke</p>
                                </div>

                                <div style="text-align: center; margin-top: 40px;">
                                    <h3 style="color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Stay Connected:</h3>
                                    <p style="margin: 10px 0;">
                                        <a href="https://youtube.com/@dj_flowerz" style="color: #a855f7; text-decoration: none; margin: 0 10px;">📺 YouTube</a> |
                                        <a href="https://instagram.com/djflowerz" style="color: #a855f7; text-decoration: none; margin: 0 10px;">📸 Instagram</a> |
                                        <a href="https://tiktok.com/@dj.flowerz" style="color: #a855f7; text-decoration: none; margin: 0 10px;">🎵 TikTok</a>
                                    </p>
                                </div>

                                <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 40px 0;">
                                <div style="text-align: center;">
                                    <p style="color: #9ca3af; line-height: 1.6;">Keep the volume up and the energy high.</p>
                                    <p style="font-weight: bold; color: #ffffff; margin-top: 10px;">Stay Legendary,<br>DJ FLOWERZ</p>
                                </div>
                            </div>
                        `,
                        text: `YO! YOU JUST LEVELED UP THE SOUND. I just received your contribution of KSh ${(amount / 100).toLocaleString()}, and I wanted to reach out personally to say thank you. Support like yours is the fuel behind every beat. STAY CONNECTED: YouTube: @dj_flowerz | Instagram: @djflowerz | TikTok: @dj.flowerz. Stay Legendary, DJ FLOWERZ`
                    }, env);
                } catch (e) {
                    console.error('[Tip Receipt Email Error]', e);
                }
            } catch (e) {
                console.error("Tip webhook error:", e);
            }
        }
    }

    return new Response("OK", { status: 200 });
}
