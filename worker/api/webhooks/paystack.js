// worker/api/webhooks/paystack.js
import { sendEmail } from '../../utils/email.js';
import { templates } from '../../utils/templates.js';

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
                    // Fetch items to determine if digital or physical
                    const { results: items } = await env.DB.prepare(`
                        SELECT oli.*, pt.is_digital, pv.metadata as variant_metadata
                        FROM order_line_items oli
                        JOIN product_variants pv ON oli.variant_id = pv.id
                        JOIN products_new p ON pv.product_id = p.id
                        JOIN product_types pt ON p.product_type_id = pt.id
                        WHERE oli.order_id = ?
                    `).bind(orderId).all();

                    const isDigital = items.length > 0 && items.some(i => i.is_digital);
                    const customerName = metadata?.customerName || customer?.first_name || 'Legend';
                    const amountFormatted = (amount / 100).toLocaleString();
                    
                    let htmlContent;
                    let textContent;

                    if (isDigital) {
                        const digitalProducts = items.filter(i => i.is_digital).map(i => {
                            let metadataObj = {};
                            try { metadataObj = JSON.parse(i.variant_metadata || '{}'); } catch(e) {}
                            return {
                                name: i.product_name,
                                downloadUrl: metadataObj.download_url || metadataObj.file_url || 'https://djflowerz.co.ke/account/downloads',
                                password: metadataObj.password || 'FLOWERZ_VIP_254'
                            };
                        });
                        htmlContent = templates.storeReceiptDigital(orderId, amountFormatted, customerName, digitalProducts);
                        textContent = `Order confirmed! Your digital products are ready. Visit your account or check the link: ${digitalProducts[0].downloadUrl}`;
                    } else {
                        const itemsSummary = items.map(i => `${i.quantity}x ${i.product_name}`).join(', ');
                        htmlContent = templates.storeReceiptPhysical(orderId, amountFormatted, customerName, itemsSummary);
                        textContent = `Order confirmed! Your gear is being prepped. Order #${orderId} for KSh ${amountFormatted}.`;
                    }

                    await sendEmail({
                        to: customer?.email || 'customer@djflowerz.co.ke',
                        subject: isDigital ? `Your VIP Drop is Ready! ⚡️ Order #${orderId}` : `Fresh Gear Alert! 💎 Order #${orderId}`,
                        fromEmail: 'receipts@djflowerz.co.ke',
                        fromName: 'DJ FLOWERZ Store',
                        html: htmlContent,
                        text: textContent
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
                const expiryIso = expiryDate.toISOString();
                
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
                        const amountFormatted = (amount / 100).toLocaleString();
                        await sendEmail({
                            to: userEmail,
                            subject: 'Welcome to the VIP Circle! 🎟️ Your DJ FLOWERZ Subscription is ACTIVE',
                            fromEmail: 'admin@djflowerz.co.ke',
                            fromName: 'DJ FLOWERZ VIP',
                            html: templates.subscriptionActivation(userName, planName, expiryDate.toLocaleDateString()),
                            text: `Welcome to the Inner Circle, ${userName}! Your ${planName} is now active. Renewal date: ${expiryDate.toLocaleDateString()}.`
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
                    const amountFormatted = (amount / 100).toLocaleString();
                    await sendEmail({
                        to: userEmail,
                        subject: 'You’re a Legend! 💎 Your Support for DJ FLOWERZ Received',
                        fromEmail: 'admin@djflowerz.co.ke',
                        fromName: 'DJ FLOWERZ',
                        html: templates.tipReceipt(customerName, amountFormatted),
                        text: `YO! YOU JUST LEVELED UP THE SOUND. I just received your contribution of KSh ${amountFormatted}, and I wanted to reach out personally to say thank you.`
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
