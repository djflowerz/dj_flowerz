
import { db } from '../../../firebase';
import firebase from 'firebase/compat/app';

/**
 * Paystack Webhook Handler for Cloudflare Pages Functions
 * Path: functions/api/paystack/webhook.ts
 */

interface Env {
    VITE_PAYSTACK_SECRET_KEY?: string;
    PAYSTACK_SECRET_KEY?: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
    const { request, env } = context;

    // 1. Only allow POST
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const secret = env.VITE_PAYSTACK_SECRET_KEY || env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        console.error('Paystack Secret Key is not configured correctly in environment variables');
        return new Response('Server Error', { status: 500 });
    }

    // 2. Verify Signature
    const signature = request.headers.get('x-paystack-signature');
    const bodyText = await request.clone().text();

    if (!signature) {
        return new Response('Missing Signature', { status: 401 });
    }

    // Verification logic using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(bodyText)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    if (signature !== expectedSignature) {
        console.error('Invalid Paystack signature');
        return new Response('Invalid Signature', { status: 401 });
    }

    // 3. Parse Event
    let event;
    try {
        event = JSON.parse(bodyText);
    } catch (e) {
        return new Response('Invalid JSON', { status: 400 });
    }

    console.log(`Processing Paystack event: ${event.event}`);

    try {
        const data = event.data;
        const metadata = data.metadata || {};

        switch (event.event) {
            case 'charge.success':
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

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleChargeSuccess(data: any, metadata: any) {
    const isTip = metadata.type === 'tip';
    const isSubscription = metadata.type === 'subscription';

    // Create an order record in Firestore
    const orderId = `order_${data.reference}`;

    const orderData = {
        id: orderId,
        customerName: metadata.customerName || data.customer?.first_name || 'Guest',
        customerEmail: data.customer?.email,
        total: data.amount / 100, // Convert from kobo/cents to KES
        status: 'completed',
        paymentStatus: 'paid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        referenceCode: data.reference,
        items: metadata.items || [
            {
                productId: isTip ? 'tip' : (isSubscription ? 'subscription' : 'other'),
                productName: isTip ? 'Tip Jar Content' : (isSubscription ? `${metadata.plan || 'Plan'} Subscription` : 'Store Purchase'),
                quantity: 1,
                price: data.amount / 100,
                type: 'digital'
            }
        ],
        metadata: metadata, // Store all metadata for future reference
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await db.collection('orders').doc(orderId).set(orderData);
    console.log(`Order ${orderId} created successfully`);
}

async function handleSubscriptionCreate(data: any) {
    // data.customer.email, data.plan.plan_code, data.subscription_code, data.next_payment_date
    const email = data.customer.email;

    // Find user by email
    const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (userSnapshot.empty) {
        console.warn(`No user found with email ${email} for subscription ${data.subscription_code}`);
        return;
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    const planCode = data.plan?.plan_code || 'monthly';
    // Simple mapping or use the one from metadata if available
    const planName = data.metadata?.plan || 'monthly';

    const updates = {
        isSubscriber: true,
        subscriptionPlan: planName,
        subscriptionExpiry: new Date(data.next_payment_date).toISOString(),
        paystackSubscriptionCode: data.subscription_code,
        updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(userId).update(updates);

    // Also create a subscription history record
    const subId = `sub_${data.subscription_code}`;
    await db.collection('subscriptions').doc(subId).set({
        id: subId,
        userId,
        userName: userDoc.data().name || email,
        planId: planName,
        amount: data.amount / 100,
        startDate: new Date().toISOString(),
        expiryDate: new Date(data.next_payment_date).toISOString(),
        status: 'active',
        paymentMethod: 'Paystack',
        createdAt: new Date().toISOString()
    });

    console.log(`Subscription ${subId} created and user ${userId} updated`);
}

async function handleSubscriptionDisable(data: any) {
    const email = data.customer.email;
    const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
        await db.collection('users').doc(userId).update({
            isSubscriber: false,
            subscriptionPlan: null,
            subscriptionExpiry: null,
            updatedAt: new Date().toISOString()
        });
    }

    // Update subscription record status
    const subId = `sub_${data.subscription_code}`;
    const subDoc = await db.collection('subscriptions').doc(subId).get();
    if (subDoc.exists) {
        await db.collection('subscriptions').doc(subId).update({
            status: 'cancelled',
            updatedAt: new Date().toISOString()
        });
    }
}
