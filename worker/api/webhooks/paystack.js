// worker/api/webhooks/paystack.js

export async function handlePaystackWebhook(request, env) {
    const signature = request.headers.get('x-paystack-signature');
    const body = await request.text();

    // 1. Verify signature (Production: implement HMAC SHA512)

    const event = JSON.parse(body);
    if (event.event === 'charge.success') {
        const { reference, metadata } = event.data;
        const orderId = metadata?.order_id;

        if (orderId) {
            await env.DB.prepare(`
                UPDATE orders_new SET payment_status = 'paid', status = 'processing', paystack_reference = ?
                WHERE id = ?
            `).bind(reference, orderId).run();

            const { results: items } = await env.DB.prepare("SELECT * FROM order_line_items WHERE order_id = ?").bind(orderId).all();
            for (const item of items) {
                await env.DB.prepare(`
                    UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND track_inventory = 1
                `).bind(item.quantity, item.variant_id).run();
            }
        }
    }

    return new Response("OK", { status: 200 });
}
