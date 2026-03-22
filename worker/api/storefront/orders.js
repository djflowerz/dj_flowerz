// worker/api/storefront/orders.js

export async function handleStorefrontOrders(request, env, ctx, params) {
    const url = new URL(request.url);
    const id = params?.id || url.searchParams.get('id');

    // GET /api/orders/track?id=ORD-...&email=...
    if (request.method === 'GET' && url.pathname.includes('/track')) {
        const orderId = url.searchParams.get('id');
        const email = url.searchParams.get('email');

        if (!orderId || !email) {
            return new Response(JSON.stringify({ error: "Order ID and email are required" }), { status: 400 });
        }

        try {
            const order = await env.DB.prepare(`
                SELECT id, customer_name, status, payment_status, 
                       tracking_number, shipping_provider, estimated_arrival, 
                       created_at, updated_at, items, total_amount, address
                FROM orders 
                WHERE id = ? AND (customer_email = ? OR customer_email IS NULL)
            `).bind(orderId, email).first();

            if (!order) {
                return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
            }

            return new Response(JSON.stringify(order), {
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

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
                items, address, customer_phone, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
            orderId, 
            body.customer_email || body.customer?.email || null, 
            body.customer_name || body.customer?.name || null, 
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
