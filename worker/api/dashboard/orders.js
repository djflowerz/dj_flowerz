// worker/api/dashboard/orders.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardOrders(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401 });

    const id = params?.id;

    if (id) {
        try {
            const order = await env.DB.prepare(`
                SELECT * FROM orders WHERE id = ?
            `).bind(id).first();

            if (!order) return new Response("Not Found", { status: 404 });

            // Parse items if they exist as a JSON string
            let items = [];
            if (order.items) {
                try {
                    items = JSON.parse(order.items);
                } catch (e) {
                    console.error("Failed to parse order items", e);
                }
            }

            return new Response(JSON.stringify({ ...order, items }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    } else {
        const method = request.method;

        if (method === 'PUT') {
            const body = await request.json();
            const orderId = params.id;
            if (!orderId) return new Response("Missing ID", { status: 400 });

            try {
                await env.DB.prepare(`
                    UPDATE orders 
                    SET status = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).bind(body.status, body.total_amount, orderId).run();

                return new Response(JSON.stringify({ message: "Order updated" }), {
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500 });
            }
        }

        if (method === 'DELETE') {
            const orderId = params.id;
            if (!orderId) return new Response("Missing ID", { status: 400 });

            try {
                await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(orderId).run();
                return new Response(JSON.stringify({ message: "Order deleted" }), {
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500 });
            }
        }

        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM orders 
                ORDER BY created_at DESC
            `).all();

            // Optionally parse items for each order if needed, but usually the list view doesn't need them
            const formattedResults = results.map(order => {
                let items = [];
                if (order.items) {
                    try {
                        items = JSON.parse(order.items);
                    } catch (e) {}
                }
                return { ...order, items };
            });

            return new Response(JSON.stringify(formattedResults), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-store, no-cache, must-revalidate"
                }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }
}
