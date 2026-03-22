import crypto from 'crypto';
import { updateR2Item, addR2Item, getR2Collection, addAdminNotification } from '../../utils/server-r2';

// Cloudflare R2 is now our source of truth for all data.
// Supabase is used strictly for Auth (via hooks/middleware), not database queries.


export const config = {
    api: {
        bodyParser: false,
    },
};

async function buffer(readable: any) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Verifies a transaction reference with Paystack API
 */
async function verifyTransaction(reference: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();
        return result.status === true && result.data.status === 'success';
    } catch (error) {
        console.error('Paystack Verification API Error:', error);
        return false;
    }
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        console.error('CRITICAL: Paystack Secret Key is not configured correctly');
        return res.status(500).send('Server Error: Secret key missing');
    }

    try {
        console.log('[PAYSTACK WH] Headers:', JSON.stringify(req.headers));

        let rawBody = '';
        let eventBody: any = {};

        // 1. Try to read raw body using micro
        try {
            const buf = await buffer(req);
            rawBody = buf.toString('utf8');
        } catch (e) {
            console.warn('[PAYSTACK WH] Failed to read raw body with micro:', e);
        }

        console.log(`[PAYSTACK WH] RawBody Length: ${rawBody.length}`);

        // 2. Check if body was already parsed by Vercel
        if (!rawBody && req.body) {
            console.warn('[PAYSTACK WH] Stream empty but req.body exists. Vercel parsed it.');
            eventBody = req.body;
            // Attempt to recreate rawBody for signature verification (best effort)
            try { rawBody = JSON.stringify(req.body); } catch (e) { }
        } else if (rawBody) {
            try { eventBody = JSON.parse(rawBody); } catch (e) {
                console.error('[PAYSTACK WH] Failed to parse raw body JSON:', e);
                return res.status(400).send('Invalid JSON');
            }
        } else {
            console.error('[PAYSTACK WH] No body received');
            return res.status(400).send('Empty Body');
        }

        const signature = req.headers['x-paystack-signature'];
        if (!signature) {
            console.warn('Blocked: Missing Paystack signature header');
            return res.status(401).send('Missing Signature');
        }

        const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

        if (hash !== signature) {
            console.error(`[PAYSTACK WH] Signature Mismatch! Hash: ${hash}, Sig: ${signature}`);
            return res.status(401).send('Invalid Signature');
        } else {
            console.log('[PAYSTACK WH] Signature Verified ✅');
        }

        const event = eventBody; // Use eventBody which is already parsed
        console.log(`[PAYSTACK WH] Event: ${event.event} | Ref: ${event.data.reference}`);

        const data = event.data;
        const metadata = data.metadata || {};

        switch (event.event) {
            case 'charge.success':
                const isValid = await verifyTransaction(data.reference);
                if (!isValid) {
                    console.error(`Verification Failed: ${data.reference}`);
                    break;
                }
                await handleChargeSuccess(data, metadata);
                break;

            case 'subscription.create':
                await handleSubscriptionCreate(data);
                break;

            case 'subscription.disable':
                await handleSubscriptionDisable(data);
                break;

            default:
                console.log(`Unhandled event type: ${event.event}`);
        }

        return res.status(200).json({ success: true, message: 'Processed' });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}

async function handleChargeSuccess(data: any, metadata: any) {
    const isTip = metadata.type === 'tip';
    // 1. Get IDs and Metadata
    const isSubscription = metadata.type === 'subscription';
    const isBooking = metadata.type === 'booking';
    const orderId = metadata.order_id || `order_${data.reference}`;
    let userId = metadata.userId;

    // Fetch existing order if it exists to preserve item details in mixed orders
    let existingOrder: any = null;
    try {
        const orders = await getR2Collection<any>('orders');
        existingOrder = orders.find(o => o.id === orderId);
    } catch (e) {
        console.warn(`[PAYSTACK WH] Could not fetch existing order ${orderId}:`, e);
    }

    if (!userId && data.customer?.email) {
        const profiles = await getR2Collection<any>('profiles');
        const profile = profiles.find(p => p.email === data.customer.email);
        userId = profile?.id;
    }

    let orderItems = metadata.items;
    if (typeof orderItems === 'string') {
        try { orderItems = JSON.parse(orderItems); } catch (e) { orderItems = null; }
    }

    // Use items from existing order if available (preserves full cart details)
    const itemsToSave = existingOrder?.items || orderItems || [
        {
            productId: isTip ? 'tip' : (isSubscription ? 'subscription' : (isBooking ? 'booking' : 'other')),
            productName: isTip ? 'Tip Jar' :
                (isSubscription ? `${metadata.plan || 'Plan'} Subscription` :
                    (isBooking ? `Booking: ${metadata.service || 'Session'}` : 'Store Purchase')),
            quantity: 1,
            price: data.amount / 100,
            type: isSubscription ? 'subscription' : 'digital'
        }
    ];

    const { items: _, ...orderMetadata } = metadata; // Exclude raw items from top-level
    const orderData = {
        ...(existingOrder || {}), // Merge with existing order data
        id: orderId,
        user_id: userId || existingOrder?.user_id || null,
        customer_name: metadata.customerName || data.customer?.first_name || existingOrder?.customer_name || 'Guest',
        customer_email: data.customer?.email || existingOrder?.customer_email,
        total: data.amount / 100,
        subtotal: metadata.subtotal || (data.amount / 100),
        status: 'completed',
        payment_status: 'paid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        reference_code: data.reference,
        items: itemsToSave,
        type: metadata.type || existingOrder?.type || 'store',
        created_at: existingOrder?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Save Order to R2
    await updateR2Item('orders', orderId, orderData);
    console.log(`Order ${orderId} saved to R2`);

    // --- INVENTORY GUARD (Subtract Stock) ---
    try {
        const products = await getR2Collection<any>('products');
        let productsModified = false;

        for (const item of orderData.items) {
            // Check if item is physical. Note: item.type might be 'physical' from metadata
            if (item.type === 'physical') {
                const productIdx = products.findIndex(p => p.id === item.productId);
                if (productIdx !== -1) {
                    const product = products[productIdx];
                    const currentStock = Number(product.stock || product.inventory || 0);
                    const purchasedQty = Number(item.quantity || 1);
                    const newStock = Math.max(0, currentStock - purchasedQty);

                    products[productIdx].stock = newStock;
                    productsModified = true;

                    // Low Stock Alert (Threshold: 3)
                    if (newStock < 3) {
                        await addAdminNotification(
                            `⚠️ Low Stock: ${product.name}`,
                            `Only ${newStock} units left in stock. Time to restock!`,
                            'warning',
                            `/admin?tab=store&id=${product.id}`
                        );
                    }
                }
            }
        }

        if (productsModified) {
            // Need saveR2Collection which wasn't imported at top
            const { saveR2Collection } = await import('../../utils/server-r2');
            await saveR2Collection('products', products);
            console.log(`[Inventory Guard] Updated stock for ${orderId}`);
        }
    } catch (invError) {
        console.error('Inventory Guard Error:', invError);
    }

    // Add Admin Notification
    await addAdminNotification(
        `New Order: ${orderData.id}`,
        `${orderData.customer_name} placed an order for KES ${orderData.total}.`,
        'success',
        `/admin?tab=orders&id=${orderData.id}`
    );

    // 4. Sync to MailerLite (Receipt & Customer Update)
    const receiptSummary = orderData.items.map((item: any) => `${item.productName} (x${item.quantity})`).join(', ');
    await syncToMailerLite(orderData.customer_email, {
        name: orderData.customer_name,
        last_order_id: orderId,
        last_order_total: orderData.total,
        last_purchase_receipt: receiptSummary,
        customer_type: 'buyer'
    });

    // 5. Update Coupon Usage if applied (Move to R2)
    if (metadata.couponCode) {
        await updateR2Item('coupons', metadata.couponCode.toUpperCase(), {
            usage_increment: 1
        });
    }

    // Add to newsletter subscribers in R2
    if (data.customer?.email) {
        const now = new Date().toISOString();
        await updateR2Item('newsletter_subscribers', data.customer.email, {
            email: data.customer.email,
            date_subscribed: now.split('T')[0],
            status: 'active',
            source: `Customer (${orderData.type})`,
            updated_at: now
        });
    }

    // Record in global payments table in R2
    const paymentRecord = {
        id: `pay_${data.reference}`,
        user_id: userId || null,
        amount: data.amount / 100,
        currency: data.currency || 'KES',
        status: data.status === 'success' ? 'success' : 'failed',
        payment_ref: data.reference,
        payment_type: metadata.type || 'store',
        user_email: data.customer?.email,
        created_at: new Date().toISOString()
    };
    await addR2Item('payments', paymentRecord);

    // If it's a tip, also record in tips table in R2
    if (isTip) {
        const tipRecord = {
            id: `tip_${data.reference}`,
            user_id: userId || null,
            user_name: metadata.customerName || null,
            email: data.customer?.email,
            user_email: data.customer?.email, // Fix for admin dashboard loading
            amount: data.amount / 100,
            message: metadata.message || 'Tip from DJ Flowerz Fan',
            status: 'completed',
            created_at: new Date().toISOString()
        };
        await addR2Item('tips', tipRecord);

        // Notify of tip
        await syncToMailerLite(data.customer?.email, {
            name: metadata.customerName || 'Fan',
            tip_amount: data.amount / 100,
            tip_message: metadata.message
        });

        // Add Admin Notification
        await addAdminNotification(
            `New Tip Received!`,
            `${metadata.customerName || 'A fan'} sent a tip of KES ${data.amount / 100}.`,
            'promotion'
        );
    }

    // If it's a subscription payment, activate the subscription immediately.
    // NOTE: subscription.create only fires for Paystack recurring plans, not one-time payments.
    // So we must activate here on charge.success when type === 'subscription' OR an item is a subscription.
    const hasSubscriptionItem = orderData.items.some((i: any) => i.type === 'subscription');
    
    if ((isSubscription || hasSubscriptionItem) && userId) {
        const subItem = orderData.items.find((i: any) => i.type === 'subscription');
        const planName = metadata.planId || metadata.plan || subItem?.productName || subItem?.name || 'monthly';
        const now = new Date();
        let expiryDate = new Date(now);
        if (planName.toLowerCase().includes('week')) {
            expiryDate.setDate(now.getDate() + 7);
        } else if (planName.toLowerCase().includes('annual') || planName.toLowerCase().includes('year')) {
            expiryDate.setFullYear(now.getFullYear() + 1);
        } else {
            expiryDate.setMonth(now.getMonth() + 1);
        }

        // Update Profile in R2
        await updateR2Item<any>('profiles', userId, {
            is_subscriber: true,
            subscription_plan: planName,
            subscription_expiry: expiryDate.toISOString(),
            updated_at: new Date().toISOString()
        });

        const subId = `sub_charge_${data.reference}`;
        await updateR2Item<any>('subscriptions', subId, {
            id: subId,
            user_id: userId,
            user_name: metadata.customerName || data.customer?.email,
            user_email: data.customer?.email,
            plan_id: planName,
            amount: data.amount / 100,
            start_date: now.toISOString(),
            expiry_date: expiryDate.toISOString(),
            status: 'active',
            payment_method: 'Paystack',
            updated_at: now.toISOString()
        });

        await syncToMailerLite(data.customer?.email, {
            name: metadata.customerName || data.customer?.email,
            subscription_plan: planName,
            subscription_status: 'active',
            subscription_expiry: expiryDate.toISOString(),
            customer_type: 'subscriber'
        });

        // Add Admin Notification
        await addAdminNotification(
            `New Subscription: ${planName}`,
            `${metadata.customerName || data.customer?.email} is now a subscriber.`,
            'subscription'
        );

        // --- REFERRAL REWARD PROTOCOL ---
        try {
            const profiles = await getR2Collection<any>('profiles');
            const refereeProfile = profiles.find(p => p.id === userId);

            if (refereeProfile && refereeProfile.referred_by) {
                const referrerId = refereeProfile.referred_by;

                // Check if reward already issued for this referral
                const referralLogs = await getR2Collection<any>('referral_logs');
                const alreadyIssued = referralLogs.some(log => log.refereeId === userId && log.rewardIssued);

                if (!alreadyIssued) {
                    const referrerProfile = profiles.find(p => p.id === referrerId);
                    if (referrerProfile) {
                        const settingsData = await getR2Collection<any>('settings');
                        const refSettings = settingsData.find((s: any) => s.id === 'referralSettings')?.data;
                        const rewardAmount = refSettings?.referrerRewardAmount || 0;

                        // 1. Update Referrer Balance
                        const currentBalance = referrerProfile.balance || 0;
                        await updateR2Item('profiles', referrerId, {
                            balance: currentBalance + rewardAmount
                        });

                        // 2. Log the Referral
                        const logEntry = {
                            id: `reflog_${Date.now()}`,
                            referrerId,
                            refereeId: userId,
                            referrerName: referrerProfile.name || 'Admin',
                            refereeName: refereeProfile.name || 'User',
                            planPurchased: planName,
                            rewardIssued: true,
                            createdAt: new Date().toISOString(),
                            status: 'completed'
                        };
                        await addR2Item('referral_logs', logEntry);

                        // 3. Update Referral Stats
                        const stats = await getR2Collection<any>('referral_stats');
                        const statIdx = stats.findIndex((s: any) => s.userId === referrerId);
                        if (statIdx !== -1) {
                            stats[statIdx].totalReferrals = (stats[statIdx].totalReferrals || 0) + 1;
                            stats[statIdx].totalEarned = (stats[statIdx].totalEarned || 0) + rewardAmount;
                        } else {
                            stats.push({
                                id: `stats_${referrerId}`,
                                userId: referrerId,
                                userName: referrerProfile.name || 'User',
                                referralCode: referrerProfile.referral_code || referrerProfile.referralCode || 'N/A',
                                totalReferrals: 1,
                                totalEarned: rewardAmount,
                                pendingPayout: 0
                            });
                        }
                        const { saveR2Collection } = await import('../../utils/server-r2');
                        await saveR2Collection('referral_stats', stats);

                        // 4. Notify Admin
                        await addAdminNotification(
                            `Referral Reward Issued`,
                            `${referrerProfile.name} earned KES ${rewardAmount} for referring ${refereeProfile.name}.`,
                            'success'
                        );
                    }
                }
            }
        } catch (refError) {
            console.error('Referral Processing Error:', refError);
        }
    }
}

async function handleSubscriptionCreate(data: any) {
    const email = data.customer.email;

    // 1. Find Profile (Try metadata first, then email)
    let userId = data.metadata?.userId;
    let userName = data.metadata?.customerName;

    if (!userId) {
        const profiles = await getR2Collection<any>('profiles');
        const profile = profiles.find(p => p.email === email);
        if (!profile) {
            console.warn(`No user found with email ${email} for sub ${data.subscription_code}`);
            return;
        }
        userId = profile.id;
        userName = profile.name;
    }

    const planName = data.metadata?.planId || data.metadata?.plan || 'monthly';

    // 2. Update Profile in R2
    await updateR2Item('profiles', userId, {
        is_subscriber: true,
        subscription_plan: planName,
        subscription_expiry: new Date(data.next_payment_date).toISOString(),
        updated_at: new Date().toISOString()
    });

    // 3. Create Subscription Record in R2
    const subId = `sub_${data.subscription_code}`;
    await updateR2Item('subscriptions', subId, {
        id: subId,
        user_id: userId,
        user_name: userName || email,
        user_email: email,
        plan_id: planName,
        amount: data.amount / 100,
        start_date: new Date().toISOString(),
        expiry_date: new Date(data.next_payment_date).toISOString(),
        status: 'active',
        payment_method: 'Paystack',
        updated_at: new Date().toISOString()
    });

    console.log(`Subscription ${subId} activated for user ${userId} in R2`);

    // 3. Sync to MailerLite (Subscription Confirmation)
    await syncToMailerLite(email, {
        name: userName || email,
        subscription_plan: planName,
        subscription_status: 'active',
        subscription_expiry: new Date(data.next_payment_date).toISOString(),
        customer_type: 'subscriber'
    });
}

async function handleSubscriptionDisable(data: any) {
    const email = data.customer.email;

    const profiles = await getR2Collection<any>('profiles');
    const profile = profiles.find(p => p.email === email);

    if (profile) {
        const userId = profile.id;
        await updateR2Item<any>('profiles', userId, {
            is_subscriber: false,
            subscription_plan: null,
            subscription_expiry: null,
            updated_at: new Date().toISOString()
        });
    }

    // 2. Mark Subscription as Cancelled in R2
    const subId = `sub_${data.subscription_code}`;
    await updateR2Item<any>('subscriptions', subId, {
        status: 'cancelled',
        updated_at: new Date().toISOString()
    });

    console.log(`Subscription ${subId} disabled in R2`);

    // Sync to MailerLite (Subscription Status Update)
    await syncToMailerLite(email, {
        subscription_status: 'cancelled',
        customer_type: 'subscriber'
    });
}

/**
 * Stub: Previously synced to MailerLite. Now all subscriber data is tracked
 * in Supabase. Transactional emails go through Gmail SMTP via /api/newsletter/send.
 */
async function syncToMailerLite(email: string, fields: Record<string, any>, groups: string[] = []) {
    console.log(`[Email] Notifying ${email} with fields:`, fields);

    const GMAIL_USER = (process.env.GMAIL_USER || 'djflowerz254@gmail.com').trim();

    try {
        // Direct import of mailer logic to avoid loopback network calls
        const { sendEmail } = await import('../_mailer.js');

        let subject = "DJ FLOWERZ — Update";
        let html = "";
        let adminSubject = "";
        let adminHtml = "";

        if (fields.customer_type === 'buyer') {
            subject = "Your DJ FLOWERZ Receipt 🧾";
            html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                    <h1 style="color: #a855f7;">Thanks for your purchase!</h1>
                    <p style="color: #9ca3af;">Your support keeps the wheels turning.</p>
                    <div style="background: #15151a; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #ffffff10;">
                        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${fields.last_order_id}</p>
                        <p style="margin: 5px 0;"><strong>Total:</strong> $${fields.last_order_total}</p>
                        <p style="margin: 5px 0;"><strong>Items:</strong> ${fields.last_purchase_receipt}</p>
                    </div>
                    <p>Visit <a href="https://djflowerz.co.ke" style="color: #a855f7;">DJ FLOWERZ</a> to download your items.</p>
                </div>`;

            adminSubject = `New Order: $${fields.last_order_total} from ${fields.name || email}`;
            adminHtml = `<h1>New Order Received</h1><p><strong>Customer:</strong> ${fields.name} (${email})</p><p><strong>Total:</strong> $${fields.last_order_total}</p><p><strong>Items:</strong> ${fields.last_purchase_receipt}</p><p><strong>Order ID:</strong> ${fields.last_order_id}</p>`;
        } else if (fields.subscription_status === 'active') {
            subject = "Your DJ FLOWERZ Subscription is Active! 🎧";
            html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                    <h1 style="color: #a855f7;">Subscription Activated!</h1>
                    <p>Welcome back to the inner circle.</p>
                    <div style="background: #15151a; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #ffffff10;">
                        <p>Your <strong>${fields.subscription_plan}</strong> plan is now active.</p>
                        <p>Expiry: ${new Date(fields.subscription_expiry).toLocaleDateString()}</p>
                    </div>
                </div>`;

            adminSubject = `New Subscription: ${fields.subscription_plan} from ${fields.name || email}`;
            adminHtml = `<h1>New Subscription Activated</h1><p><strong>Subscriber:</strong> ${fields.name} (${email})</p><p><strong>Plan:</strong> ${fields.subscription_plan}</p><p><strong>Expiry:</strong> ${new Date(fields.subscription_expiry).toLocaleDateString()}</p>`;
        } else if (fields.tip_amount) {
            // "Thank You" email for the Tipping Customer
            subject = "A Special Thanks from DJ FLOWERZ! ❤️";
            html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                    <h1 style="color: #a855f7;">Thank You for the Tip!</h1>
                    <p>I truly appreciate your generosity and support. It means the world to me!</p>
                    <div style="background: #15151a; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #ffffff10;">
                        <p><strong>Amount:</strong> $${fields.tip_amount}</p>
                        <p><strong>Message:</strong> ${fields.tip_message || 'N/A'}</p>
                    </div>
                    <p>Keep vibing, and see you on the next drop!</p>
                </div>`;

            adminSubject = `New Tip: $${fields.tip_amount} from ${fields.name || email}`;
            adminHtml = `<h1>Special Tip Received!</h1><p><strong>From:</strong> ${fields.name} (${email})</p><p><strong>Amount:</strong> $${fields.tip_amount}</p><p><strong>Message:</strong> ${fields.tip_message || 'N/A'}</p>`;
        }

        // Send to Customer
        if (html) {
            await sendEmail({
                to: email,
                subject: subject,
                html: html
            } as any);
        }

        // Send to Admin
        if (adminHtml) {
            await sendEmail({
                to: GMAIL_USER,
                subject: adminSubject,
                html: adminHtml
            } as any);
        }
    } catch (err) {
        console.error('[Email] Failed to send transactional email from webhook:', err);
    }
}
