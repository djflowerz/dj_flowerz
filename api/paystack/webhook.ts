
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase Admin Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Supabase credentials missing in webhook environment variables.");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

// ── Email Notification via Notification Helper ───────────────────────────
async function sendNotification(email: string, subject: string, fields: Record<string, any>) {
    const apiKey = process.env.MAILERLITE_API_KEY || process.env.VITE_MAILERLITE_API_KEY;
    if (!apiKey || !email) return;
    try {
        await fetch('https://connect.mailerlite.com/api/subscribers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                email,
                fields: { ...fields, last_interaction: new Date().toISOString(), notification: subject }
            })
        });
        console.log(`[NOTIFY] Sent notification to ${email}: ${subject}`);
    } catch (err) {
        console.error('[NOTIFY] Failed:', err);
    }
}

export const config = { api: { bodyParser: false } };

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
    const isSubscription = metadata.type === 'subscription';
    const isBooking = metadata.type === 'booking';

    const orderId = `order_${data.reference}`;

    let orderItems = metadata.items;
    if (typeof orderItems === 'string') {
        try { orderItems = JSON.parse(orderItems); } catch (e) { orderItems = null; }
    }

    // 1. Get User ID from metadata or fallback to finding by email
    let userId = metadata.userId;
    if (!userId && data.customer?.email) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', data.customer.email)
            .maybeSingle();
        userId = profile?.id;
    }

    // Prepare Supabase payload with snake_case
    const orderData = {
        id: orderId,
        user_id: userId || null,
        customer_name: metadata.customerName || data.customer?.first_name || 'Guest',
        customer_email: data.customer?.email,
        total: data.amount / 100,
        subtotal: metadata.subtotal || (data.amount / 100),
        discount_amount: metadata.discountAmount || 0,
        shipping_cost: metadata.shippingCost || 0,
        coupon_code: metadata.couponCode || null,
        status: 'completed',
        payment_status: 'paid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        reference_code: data.reference,
        items: orderItems || [
            {
                productId: isTip ? 'tip' : (isSubscription ? 'subscription' : (isBooking ? 'booking' : 'other')),
                productName: isTip ? 'Tip Jar' :
                    (isSubscription ? `${metadata.plan || 'Plan'} Subscription` :
                        (isBooking ? `Booking: ${metadata.service || 'Session'}` : 'Store Purchase')),
                quantity: 1,
                price: data.amount / 100,
                type: 'digital'
            }
        ],
        shipping_address: metadata.shippingAddress || null,
        delivery_method: metadata.deliveryType || null,
        type: metadata.type || 'store', // Important for Success.tsx logic
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Write to Supabase
    const { error } = await supabase.from('orders').upsert(orderData);
    if (error) {
        console.error(`Error saving order:`, error);
    } else {
        console.log(`Order ${orderId} saved to Supabase ✅`);
    }

    // Payment record
    const paymentId = `pay_${data.reference}`;
    const paymentRecord = {
        user_id: userId || null,
        amount: data.amount / 100,
        currency: data.currency || 'KES',
        status: data.status === 'success' ? 'success' : 'failed',
        payment_ref: data.reference,
        payment_type: metadata.type || 'store',
        user_email: data.customer?.email,
        metadata: metadata
    };

    await supabase.from('payments').insert(paymentRecord);

    // Tip record
    if (isTip) {
        const tipRecord = {
            user_id: userId || null,
            user_name: metadata.customerName || null,
            email: data.customer?.email,
            amount: data.amount / 100,
            message: metadata.message || 'Tip from DJ Flowerz Fan',
            status: 'completed'
        };
        await supabase.from('tips').insert(tipRecord);
    }

    // If it's a subscription payment, activate the subscription immediately.
    if (isSubscription && userId) {
        const planName = metadata.planId || metadata.plan || 'monthly';
        const now = new Date();
        let expiryDate = new Date(now);
        if (planName.toLowerCase().includes('week')) {
            expiryDate.setDate(now.getDate() + 7);
        } else if (planName.toLowerCase().includes('annual') || planName.toLowerCase().includes('year')) {
            expiryDate.setFullYear(now.getFullYear() + 1);
        } else {
            expiryDate.setMonth(now.getMonth() + 1);
        }

        const subId = `sub_charge_${data.reference}`;
        const subRecord = {
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
        };

        // Write to Supabase
        await Promise.all([
            supabase.from('profiles').update({
                is_subscriber: true,
                subscription_plan: planName,
                subscription_expiry: expiryDate.toISOString(),
                updated_at: now.toISOString()
            }).eq('id', userId),
            supabase.from('subscriptions').upsert(subRecord)
        ]);

        await sendNotification(data.customer?.email, 'Subscription Active', {
            name: metadata.customerName || data.customer?.email,
            subscription_plan: planName,
            subscription_status: 'active',
            subscription_expiry: expiryDate.toISOString(),
            customer_type: 'subscriber'
        });
    }

    // Coupon usage track
    if (metadata.couponCode) {
        const { data: coupon } = await supabase.from('coupons').select('id, usage_count').eq('code', metadata.couponCode.toUpperCase()).single();
        if (coupon) {
            const newCount = (coupon.usage_count || 0) + 1;
            await supabase.from('coupons').update({ usage_count: newCount }).eq('id', coupon.id);
        }
    }

    // Auto-subscribe to newsletter
    if (data.customer?.email) {
        const now = new Date().toISOString();
        await supabase.from('newsletter_subscribers').upsert({
            email: data.customer.email,
            date_subscribed: now.split('T')[0],
            status: 'active',
            source: `Customer (${orderData.type})`,
            updated_at: now
        }, { onConflict: 'email' });
    }
}

async function handleSubscriptionCreate(data: any) {
    const email = data.customer.email;
    const now = new Date().toISOString();

    // 1. Find Profile
    let userId = data.metadata?.userId;
    let userName = data.metadata?.customerName;

    if (!userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('email', email)
            .maybeSingle();

        if (!profile) {
            console.warn(`No user found with email ${email} for sub ${data.subscription_code}`);
            return;
        }
        userId = profile.id;
        userName = profile.name;
    }

    const planName = data.metadata?.planId || data.metadata?.plan || 'monthly';
    const expiryDate = new Date(data.next_payment_date).toISOString();

    // 2. Create Subscription Record
    const subId = `sub_${data.subscription_code}`;
    const subRecord = {
        id: subId,
        user_id: userId,
        user_name: userName || email,
        user_email: email,
        plan_id: planName,
        amount: data.amount / 100,
        start_date: now,
        expiry_date: expiryDate,
        status: 'active',
        payment_method: 'Paystack',
        updated_at: now
    };

    await Promise.all([
        supabase.from('profiles').update({
            is_subscriber: true,
            subscription_plan: planName,
            subscription_expiry: expiryDate,
            updated_at: now
        }).eq('id', userId),
        supabase.from('subscriptions').upsert(subRecord)
    ]);

    console.log(`✅ Subscription ${subId} created for ${userId}`);

    await sendNotification(email, 'Subscription Active', {
        name: userName || email,
        subscription_plan: planName,
        subscription_status: 'active',
        subscription_expiry: expiryDate,
        customer_type: 'subscriber',
        notification: `Your DJ Flowerz ${planName} subscription is now active!`
    });
}

async function handleSubscriptionDisable(data: any) {
    const email = data.customer.email;
    const now = new Date().toISOString();

    // 1. Disable in Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (profile) {
        await supabase.from('profiles').update({
            is_subscriber: false,
            subscription_plan: null,
            subscription_expiry: null,
            updated_at: now
        }).eq('id', profile.id);
    }

    // 2. Mark Subscription as Cancelled
    const subId = `sub_${data.subscription_code}`;
    await supabase.from('subscriptions').update({ status: 'cancelled', updated_at: now }).eq('id', subId);

    console.log(`Subscription ${subId} disabled`);

    await sendNotification(email, 'Subscription Cancelled', {
        subscription_status: 'cancelled',
        customer_type: 'subscriber'
    });
}
