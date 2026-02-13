
import { adminDb } from '../admin-db.ts';
import crypto from 'crypto';

/**
 * Vercel Serverless Function: Paystack Webhook Handler
 * Path: api/paystack/webhook.ts
 */

// Disable body parser to get raw body for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

async function getRawBody(readable: any): Promise<string> {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const secret = process.env.PAYSTACK_SECRET_KEY ||
        process.env.VITE_PAYSTACK_SECRET_KEY ||
        process.env.REACT_APP_PAYSTACK_SECRET_KEY;

    if (!secret) {
        console.error('Paystack Secret Key is not configured correctly');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 1. Get Raw Body
        const bodyText = await getRawBody(req);

        // 2. Verify Signature
        const signature = req.headers['x-paystack-signature'];
        if (!signature) {
            return res.status(401).send('Missing Signature');
        }

        const expectedSignature = crypto
            .createHmac('sha512', secret)
            .update(bodyText)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('Invalid Paystack signature');
            return res.status(401).send('Invalid Signature');
        }

        // 3. Parse Event
        const event = JSON.parse(bodyText);
        console.log(`Processing Paystack event: ${event.event}`);

        const data = event.data;
        const metadata = data.metadata || {};

        // 4. Handle different event types
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

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ success: false, error: error.message });
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
                productName: isTip ? 'Tip Jar Contribution' : (isSubscription ? `${metadata.plan || 'Plan'} Subscription` : 'Store Purchase'),
                quantity: 1,
                price: data.amount / 100,
                type: 'digital'
            }
        ],
        metadata: metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await adminDb.collection('orders').doc(orderId).set(orderData);
    console.log(`Order ${orderId} created/updated successfully`);
}

async function handleSubscriptionCreate(data: any) {
    const email = data.customer.email;

    // Find user by email
    const userSnapshot = await adminDb.collection('users').where('email', '==', email).limit(1).get();

    if (userSnapshot.empty) {
        console.warn(`No user found with email ${email} for subscription ${data.subscription_code}`);
        return;
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    const planName = data.metadata?.plan || 'monthly';

    const updates = {
        isSubscriber: true,
        subscriptionPlan: planName,
        subscriptionExpiry: new Date(data.next_payment_date).toISOString(),
        paystackSubscriptionCode: data.subscription_code,
        updatedAt: new Date().toISOString()
    };

    await adminDb.collection('users').doc(userId).update(updates);

    // Create a subscription history record
    const subId = `sub_${data.subscription_code}`;
    await adminDb.collection('subscriptions').doc(subId).set({
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

    console.log(`Subscription ${subId} created for user ${userId}`);
}

async function handleSubscriptionDisable(data: any) {
    const email = data.customer.email;
    const userSnapshot = await adminDb.collection('users').where('email', '==', email).limit(1).get();

    if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
        await adminDb.collection('users').doc(userId).update({
            isSubscriber: false,
            subscriptionPlan: null,
            subscriptionExpiry: null,
            updatedAt: new Date().toISOString()
        });
    }

    const subId = `sub_${data.subscription_code}`;
    const subDoc = await adminDb.collection('subscriptions').doc(subId).get();
    if (subDoc.exists) {
        await adminDb.collection('subscriptions').doc(subId).update({
            status: 'cancelled',
            updatedAt: new Date().toISOString()
        });
    }
}
