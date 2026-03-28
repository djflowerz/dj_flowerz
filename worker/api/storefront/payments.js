// worker/api/storefront/payments.js

export async function handlePaymentInitialize(request, env) {
    if (request.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const body = await request.json();
        const { type, amount, email, metadata, callback_url } = body;

        if (!email || !amount || !type) {
            return new Response(JSON.stringify({ error: "Missing required fields: email, amount, type" }), { 
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const reference = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                amount: Math.round(amount), // Must be in cents/kobo
                reference,
                callback_url: callback_url || `${env.VITE_APP_URL || 'https://www.djflowerz.co.ke'}/success`,
                metadata: {
                    ...metadata,
                    type,
                    reference
                }
            })
        });

        const paystackData = await paystackRes.json();

        if (!paystackRes.ok) {
            console.error('[Paystack Init Error]', paystackData);
            return new Response(JSON.stringify({ 
                error: "Failed to initialize payment: " + (paystackData.message || "Unknown error") 
            }), { 
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            authorizationUrl: paystackData.data.authorization_url,
            reference: paystackData.data.reference,
            message: "Payment initialized, redirecting..."
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

    } catch (e) {
        console.error("[Payment Init Error]", e);
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}
