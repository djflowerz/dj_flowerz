// worker/api/webhooks/paystack.js
import { sendEmail } from '../../utils/email.js';
import { templates } from '../../utils/templates.js';
import { PLAN_DURATIONS } from '../dashboard/subscriptions.js';
import { awardAuraPoints } from '../loyalty.js';


// [VERIFIED]: Paystack Webhook Handler for DJ Flowerz.
// Logic for Subscriptions, Downloads, and Lipa Pole Pole automated installments.
// DO NOT MODIFY WITHOUT EXPLICIT UNLOCK REQUEST.

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
        const { reference, metadata, amount, customer, channel } = event.data;
        const rawType = metadata?.type;
        const orderId = metadata?.order_id;
        const userId = metadata?.userId;
        
        // --- NORMALIZATION & FALLBACKS ---
        const customerEmail = (customer?.email || '').toLowerCase().trim();
        const userEmail = (metadata?.userEmail || metadata?.email || customerEmail).toLowerCase().trim();
        
        // Fallback: If reference starts with 'subscription_', force type to 'subscription' 
        // even if metadata failed to send. This fixes the 'Music Pool access' bug.
        const type = (rawType === 'subscription' || reference?.startsWith('subscription_')) ? 'subscription' : rawType;

        // 0. Record the financial transaction in the central 'payments' table (Universal Ledger)
        try {
            await env.DB.prepare(`
                INSERT OR IGNORE INTO payments (id, user_id, customer_email, amount_kes, currency, status, method, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, 'success', ?, ?, CURRENT_TIMESTAMP)
            `).bind(
                reference, 
                userId || null, 
                customerEmail || null, 
                amount / 100, 
                event.data.currency || 'KES',
                channel || 'unknown',
                JSON.stringify({ ...metadata, type }) // Ensure type is persisted correctly
            ).run();
            console.log(`[Paystack Webhook] Recorded universal payment: ${reference} (${amount/100} KES)`);

            // --- AURA LOYALTY SYSTEM ---
            if (userId) {
                const kesAmount = amount / 100;
                const pointsEarned = Math.floor(kesAmount / 100);
                if (pointsEarned > 0) {
                    await awardAuraPoints(env, userId, pointsEarned, `Earned ${pointsEarned} points from purchase (Ref: ${reference})`, 'purchase');
                }
            }
        } catch (paymentLogErr) {
            console.error('[Paystack Webhook] Central Payment Log Error:', paymentLogErr);
        }

        // 1. ALWAYS update order status if order_id is present
        if (orderId) {
            try {
                // Update orders table
                // [NAIROBI LOGISTICS ENGINE]: Award Patience Points based on Shipping Tier
                try {
                    const orderData = await env.DB.prepare("SELECT items, customer_email, customer_phone, metadata FROM orders WHERE id = ?").bind(orderId).first();
                    if (orderData) {
                        const items = typeof orderData.items === 'string' ? JSON.parse(orderData.items) : orderData.items;
                        let patiencePoints = 0;
                        items.forEach(item => {
                            if (item.shipping_tier === 'sea') patiencePoints += (150 * (item.quantity || 1));
                            else if (item.shipping_tier === 'air') patiencePoints += (50 * (item.quantity || 1));
                        });

                        // Standard spending points (1 per 100 KES) + Patience Points
                        const spendingPoints = Math.floor(amount / 10000); 
                        const totalAwarded = spendingPoints + patiencePoints;

                        await env.DB.prepare(`
                            UPDATE orders SET loyalty_points_earned = ? WHERE id = ?
                        `).bind(totalAwarded, orderId).run();

                        if (userId && totalAwarded > 0) {
                            await env.DB.prepare(`
                                UPDATE profiles SET loyalty_points = loyalty_points + ? WHERE id = ?
                            `).bind(totalAwarded, userId).run();
                            
                            const historyId = `lh_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
                            await env.DB.prepare(`
                                INSERT INTO loyalty_history (id, user_id, points, type, description)
                                VALUES (?, ?, ?, 'purchase', ?)
                            `).bind(historyId, userId, totalAwarded, `Earned ${totalAwarded} points (${patiencePoints} from Patience Discount) - Order: ${orderId}`).run();
                        }

                        // REFERRAL ANTI-FRAUD LOGIC
                        const meta = typeof orderData.metadata === 'string' ? JSON.parse(orderData.metadata || '{}') : (orderData.metadata || {});
                        const refCode = meta.referral_code || meta.ref;
                        
                        if (refCode) {
                            const referrer = await env.DB.prepare("SELECT id, email, phone_number, last_ip FROM profiles WHERE referral_code = ?").bind(refCode).first();
                            if (referrer) {
                                const buyerEmail = orderData.customer_email;
                                const buyerPhone = orderData.customer_phone;
                                const buyerIp = metadata?.ip || request.headers.get('cf-connecting-ip');

                                const isFraud = referrer.email === buyerEmail || 
                                              (referrer.phone_number && referrer.phone_number === buyerPhone) ||
                                              (referrer.last_ip && referrer.last_ip === buyerIp);

                                if (!isFraud) {
                                    // Award 5% commission as balance
                                    const commission = (amount / 100) * 0.05;
                                    await env.DB.prepare(`
                                        UPDATE profiles SET referral_balance = referral_balance + ? WHERE id = ?
                                    `).bind(commission, referrer.id).run();
                                    
                                    await env.DB.prepare(`
                                        INSERT INTO referral_logs (id, referrer_id, referred_id, order_id, commission_amount, status)
                                        VALUES (?, ?, ?, ?, ?, 'completed')
                                    `).bind(crypto.randomUUID(), referrer.id, userId || 'guest', orderId, commission).run();
                                } else {
                                    console.warn(`[Referral Anti-Fraud] Blocked commission for ${refCode} - Potential self-referral detected.`);
                                }
                            }
                        }
                    }
                } catch (ptsErr) {
                    console.error('[Nairobi Logistics Engine] Points/Referral Error:', ptsErr);
                }

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

        // 2. Handle Subscription Activation (Hardened Metadata-Driven Logic)
        if (type === 'subscription' || metadata?.planId || metadata?.plan_type) {
            const userId = metadata?.userId;
            const planType = metadata?.plan_type || metadata?.planId;
            const planName = metadata?.plan || metadata?.planName || (planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'Premium Plan');

            if (userEmail || userId) {
                try {
                    // [STRICT MAPPING]: Derive duration strictly from plan durations metadata
                    let durationDays = PLAN_DURATIONS[planType];

                    const amtKes = amount / 100;

                    // If no valid plan was identified via metadata, this is a technical failure/misconfiguration
                    if (!durationDays) {
                        throw new Error(`Invalid or missing planType: "${planType}". Cannot calculate duration.`);
                    }

                    const now = new Date();
                    const expiryDate = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
                    const expiryIso = expiryDate.toISOString();

                    // [JIT PROFILE CREATION]: Robust upsert that preserves identity
                    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
                    await env.DB.prepare(`
                        INSERT INTO profiles (id, email, full_name, is_subscriber, subscription_plan, subscription_expiry, subscription_end_date, created_at, updated_at)
                        VALUES (?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT(email) DO UPDATE SET
                            is_subscriber = 1,
                            subscription_plan = EXCLUDED.subscription_plan,
                            subscription_expiry = EXCLUDED.subscription_expiry,
                            subscription_end_date = EXCLUDED.subscription_end_date,
                            updated_at = CURRENT_TIMESTAMP
                    `).bind(
                        userId || guestId,
                        userEmail,
                        metadata?.customerName || customer?.first_name || 'VIP Member',
                        planName,
                        expiryIso,
                        expiryIso
                    ).run();

                    // Log the subscription record
                    await env.DB.prepare(`
                        INSERT INTO subscriptions (user_email, plan_name, amount, status, starts_at, expires_at, created_at)
                        VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
                    `).bind(userEmail, planName, amtKes, expiryIso).run();

                    // [R2 SYNC]: Rebuild profiles cache
                    try {
                        const { results: allProfiles } = await env.DB.prepare("SELECT * FROM profiles").all();
                        const bucket = env.R2_BUCKET || env.PROFILES_BUCKET;
                        if (bucket) {
                            await bucket.put("data/profiles.json", JSON.stringify(allProfiles), {
                                httpMetadata: { contentType: "application/json" }
                            });
                        }
                    } catch (r2Err) { console.error('[Paystack Webhook] R2 Cache Sync Error:', r2Err); }

                    // Success Email
                    const userName = metadata?.customerName || customer?.first_name || 'Legend';
                    try {
                        const isWeekly = durationDays === 7;
                        let emailSubject = `Access Active! 🎧 Welcome to the VIP Circle`;
                        if (durationDays === 7) emailSubject = '1-Week VIP Access Active! 🎧';
                        else if (durationDays === 365) emailSubject = 'Yearly VIP All-Access Active! 🏆';

                        await sendEmail({
                            to: userEmail,
                            subject: emailSubject,
                            fromEmail: 'admin@djflowerz.co.ke',
                            fromName: 'DJ FLOWERZ VIP',
                            html: isWeekly ? `
                                <div style="font-family: sans-serif; padding: 20px; background: #070709; color: #ffffff; border-radius: 12px; border: 1px solid #a855f730;">
                                  <h2 style="color: #a855f7;">Access Granted!</h2>
                                  <p>Your 1-week VIP access is now live.</p>
                                  <p><b>Valid Until:</b> ${expiryDate.toDateString()}</p>
                                  <p><b>Amount:</b> KES ${amtKes.toLocaleString()}</p>
                                  <a href="https://djflowerz.co.ke/music-pool" style="display:inline-block; background:linear-gradient(135deg,#a855f7,#9333ea); color:#fff; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight: bold; margin-top: 10px;">
                                    Open Music Pool
                                  </a>
                                  <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Stay Legendary — DJ FLOWERZ</p>
                                </div>
                            ` : templates.subscriptionActivation(userName, planName, expiryDate.toLocaleDateString()),
                            text: `Welcome to the Inner Circle! Your ${planName} is active until ${expiryDate.toLocaleDateString()}.`
                        }, env);
                    } catch (emailErr) { console.error('[Webhook Activation Email Error]', emailErr); }

                    console.log(`[Paystack Webhook] Successfully activated ${planType} for ${userEmail}`);
                } catch (activationErr) {
                    console.error('[CRITICAL FAILURE] Music Pool Activation Failed:', activationErr);
                    
                    // [ADMIN SOS ALERT]: Immediate notification that payment succeeded but access failed
                    try {
                        const adminEmail = env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com';
                        const detailRows = [
                            ['Issue', 'Music Pool Activation Failed'],
                            ['Customer', userEmail],
                            ['Amount Paid', `KES ${amount/100}`],
                            ['Reference', reference],
                            ['Target Plan', planName || 'Unknown'],
                            ['Error Message', activationErr.message]
                        ];

                        await sendEmail({
                            to: adminEmail,
                            cc: 'djflowerz254@gmail.com',
                            subject: `🚨 SOS: Activation Failed for ${userEmail}`,
                            fromEmail: 'system@djflowerz.co.ke',
                            fromName: 'DJ FLOWERZ SOS',
                            html: templates.adminAlert('CRITICAL ACTIVATION FAILURE', detailRows),
                            text: `SOS: Activation failed for ${userEmail}. Ref: ${reference}. Error: ${activationErr.message}`
                        }, env);
                    } catch (sosEmailErr) { console.error('[SOS Email Failed]', sosEmailErr); }
                }
            }
        }


        // 3. Handle Installment Payments (Lipa Pole Pole)
        const isInstallmentDeposit = type === 'installment_deposit' || metadata?.is_installment === true || metadata?.payment_type === 'store_hire';
        const isRecurringInstallment = type === 'installment' && metadata?.planId;

        if (isInstallmentDeposit || isRecurringInstallment) {
            const amountPaid = amount / 100;
            const reference = event.data.reference;
            const userEmail = customer?.email || metadata?.userEmail || 'customer@djflowerz.co.ke';
            const userName = metadata?.customerName || metadata?.userName || customer?.first_name || 'Legend';

            try {
                let plan;
                let planId = metadata?.planId;

                // A. If it's a deposit, find the plan by orderId
                if (isInstallmentDeposit && orderId) {
                    plan = await env.DB.prepare(`
                        SELECT * FROM installment_plans WHERE order_id = ?
                    `).bind(orderId).first();
                    if (plan) planId = plan.id;
                } 
                // B. If it's a recurring payment, find by planId
                else if (isRecurringInstallment && planId) {
                    plan = await env.DB.prepare(`
                        SELECT * FROM installment_plans WHERE id = ?
                    `).bind(planId).first();
                }

                if (plan) {
                    const currentPaid = plan.paid_amount || 0;
                    const newPaidAmount = currentPaid + amountPaid;
                    const isFullyPaid = newPaidAmount >= (plan.total_amount - 1); // small buffer for rounding
                    const newStatus = isFullyPaid ? 'completed' : 'active';
                    
                    // Calculate next payment date (only if not fully paid)
                    let nextDateStr = plan.next_payment_date;
                    if (!isFullyPaid) {
                        const nextDate = new Date();
                        if (plan.payment_interval === 'monthly') {
                            nextDate.setMonth(nextDate.getMonth() + 1);
                        } else {
                            // Default to weekly
                            nextDate.setDate(nextDate.getDate() + 7);
                        }
                        nextDateStr = nextDate.toISOString().split('T')[0];
                    }

                    // 1. Update the plan source of truth
                    await env.DB.prepare(`
                        UPDATE installment_plans 
                        SET paid_amount = ?,
                            balance = total_amount - ?,
                            status = ?,
                            next_payment_date = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).bind(newPaidAmount, newPaidAmount, newStatus, nextDateStr, planId).run();

                    // 2. Record this specific transaction in history
                    const paymentId = crypto.randomUUID();
                    await env.DB.prepare(`
                        INSERT INTO installment_payments (id, plan_id, amount, reference, status, created_at)
                        VALUES (?, ?, ?, ?, 'success', CURRENT_TIMESTAMP)
                    `).bind(paymentId, planId, amountPaid, reference).run();

                    // 3. Send Premium Notification
                    try {
                        let emailSubject = '';
                        let emailHtml = '';

                        if (isInstallmentDeposit) {
                            emailSubject = `🤝 Plan Activated: ${plan.product_name}`;
                            emailHtml = templates.installmentDeposit(
                                userName, 
                                plan.product_name, 
                                amountPaid.toLocaleString(), 
                                (plan.total_amount - amountPaid).toLocaleString(), 
                                nextDateStr
                            );
                        } else {
                            emailSubject = isFullyPaid ? `🎉 Fully Paid: ${plan.product_name}!` : `✅ Payment Received: ${plan.product_name}`;
                            emailHtml = templates.installmentPayment(
                                userName, 
                                plan.product_name, 
                                amountPaid.toLocaleString(), 
                                Math.max(0, plan.total_amount - newPaidAmount).toLocaleString(), 
                                isFullyPaid
                            );
                        }

                        await sendEmail({
                            to: userEmail,
                            subject: emailSubject,
                            fromEmail: 'payments@djflowerz.co.ke',
                            fromName: 'DJ FLOWERZ Payments',
                            html: emailHtml,
                            text: `Payment of KSH ${amountPaid} received for ${plan.product_name}. ${isFullyPaid ? 'You are fully paid!' : 'Remaining balance: KSH ' + (plan.total_amount - newPaidAmount)}`
                        }, env);

                    } catch (emailErr) {
                        console.error('[Installment Email Error]', emailErr);
                    }
                } else {
                    console.error(`[Paystack Webhook] Installment plan not found for orderId: ${orderId} or planId: ${planId}`);
                }
            } catch (pErr) {
                console.error('[Paystack Webhook] Installment Processing Error:', pErr);
            }
        }

        // 4. Handle Tips separately
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

                if (userId && userId !== 'guest') {
                    const points = Math.floor(amount / 5000); // 1 point per 50 KES for tips (Higher reward for support!)
                    if (points > 0) {
                        await awardAuraPoints(env, userId, points, `Legendary Status: Earned ${points} points for supporting the channel with a tip!`, 'tip');
                    }
                }

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

        // 5. Handle Marketplace Sales (Fortress Phase 2)
        if (type === 'marketplace' && metadata?.listingId) {
            const listingId = metadata.listingId;
            const buyerId = metadata?.userId || 'guest';
            const totalAmount = amount / 100;

            try {
                // Fetch listing and vendor details
                const listing = await env.DB.prepare(`
                    SELECT mi.*, p.commission_rate, p.email as vendor_email
                    FROM marketplace_items mi
                    JOIN profiles p ON mi.vendor_id = p.id
                    WHERE mi.id = ?
                `).bind(listingId).first();

                if (listing) {
                    const commissionRate = listing.commission_rate || 0.15;
                    const commission = totalAmount * commissionRate;
                    const vendorEarnings = totalAmount - commission;

                    // Log the sale
                    await env.DB.prepare(`
                        INSERT INTO marketplace_sales (id, listing_id, vendor_id, buyer_id, amount, vendor_earnings, commission, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
                    `).bind(reference, listingId, listing.vendor_id, buyerId, totalAmount, vendorEarnings, commission).run();

                    // Update Vendor Balance
                    await env.DB.prepare(`
                        UPDATE profiles SET vendor_balance = vendor_balance + ? WHERE id = ?
                    `).bind(vendorEarnings, listing.vendor_id).run();

                    // Notify Vendor
                    try {
                        await sendEmail({
                            to: listing.vendor_email,
                            subject: `💰 Marketplace Sale: ${listing.name}`,
                            fromEmail: 'marketplace@djflowerz.co.ke',
                            fromName: 'DJ FLOWERZ Marketplace',
                            html: `
                                <div style="font-family: sans-serif; background: #0b0b0f; padding: 30px; color: #fff; border-radius: 12px; border: 1px solid #ffffff10;">
                                    <h2 style="color: #a855f7;">Cha-Ching! New Sale</h2>
                                    <p>Your item <strong>${listing.name}</strong> was just purchased.</p>
                                    <div style="background: #15151a; padding: 20px; border-radius: 8px;">
                                        <p><strong>Total Paid:</strong> KES ${totalAmount.toLocaleString()}</p>
                                        <p><strong>Your Earnings:</strong> KES ${vendorEarnings.toLocaleString()}</p>
                                        <p><strong>Commission:</strong> KES ${commission.toLocaleString()}</p>
                                    </div>
                                    <p style="margin-top: 20px;">Funds have been added to your vendor balance.</p>
                                </div>
                            `,
                            text: `New Sale: ${listing.name}. You earned KES ${vendorEarnings}.`
                        }, env);
                    } catch (emailErr) { console.error('[Marketplace Notify Error]', emailErr); }
                }
            } catch (marketplaceErr) {
                console.error('[Paystack Webhook] Marketplace processing error:', marketplaceErr);
            }
        }
    }

    return new Response("OK", { status: 200 });
}
