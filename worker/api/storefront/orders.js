// worker/api/storefront/orders.js

export async function handleStorefrontOrders(request, env) {
    if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405 });

    try {
        const body = await request.json();
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Calculate total and prepare items for storage
        const items = body.items || [];
        const totalAmount = body.total_amount || 0;

        await env.DB.prepare(`
            INSERT INTO orders (
                id, customer_email, customer_name, 
                total_amount, status, payment_status, payment_method,
                items, shipping_address, phone_number, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
            orderId, 
            body.customer_email || body.customer?.email, 
            body.customer_name || body.customer?.name, 
            totalAmount, 
            body.status || 'pending',
            'pending', // payment_status
            body.payment_method || 'Paystack',
            JSON.stringify(items),
            body.shipping_address || null,
            body.customer_phone || body.customer?.phone || null
        ).run();

        return new Response(JSON.stringify({ 
            success: true,
            orderId, 
            totalAmount, 
            message: "Order created successfully" 
        }), {
            status: 201,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (e) {
        console.error("[Order Error]", e);
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 400,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
}
