// worker/api/storefront/orders.js

export async function handleStorefrontOrders(request, env) {
    if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405 });

    try {
        const body = await request.json();
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        let totalAmount = 0;
        const lineItems = [];

        for (const item of body.items) {
            const variant = await env.DB.prepare("SELECT * FROM product_variants WHERE id = ?").bind(item.variant_id).first();
            if (!variant) throw new Error(`Variant ${item.variant_id} not found`);
            if (variant.stock_quantity < item.quantity && variant.track_inventory) {
                throw new Error(`Insufficient stock for ${variant.name}`);
            }

            const itemTotal = variant.price * item.quantity;
            totalAmount += itemTotal;

            lineItems.push({
                id: crypto.randomUUID(),
                order_id: orderId,
                variant_id: variant.id,
                product_name: variant.name,
                quantity: item.quantity,
                unit_price: variant.price,
                total_price: itemTotal
            });
        }

        await env.DB.prepare(`
            INSERT INTO orders_new (id, customer_email, customer_name, customer_phone, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(orderId, body.customer.email, body.customer.name, body.customer.phone, totalAmount, 'pending').run();

        for (const li of lineItems) {
            await env.DB.prepare(`
                INSERT INTO order_line_items (id, order_id, variant_id, product_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(li.id, li.order_id, li.variant_id, li.product_name, li.quantity, li.unit_price, li.total_price).run();
        }

        return new Response(JSON.stringify({ orderId, totalAmount, message: "Order created successfully" }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
}
