// worker/api/dashboard/orders.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardOrders(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') return new Response("Unauthorized", { status: 401 });

    const id = params?.id;

    if (id) {
        try {
            const order = await env.DB.prepare("SELECT * FROM orders_new WHERE id = ?").bind(id).first();
            if (!order) return new Response("Not Found", { status: 404 });

            const { results: items } = await env.DB.prepare("SELECT * FROM order_line_items WHERE order_id = ?").bind(id).all();

            return new Response(JSON.stringify({ ...order, items }), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    } else {
        const method = request.method;

        if (method === 'PUT') {
            const id = params.id;
            const body = await request.json();
            if (!id) return new Response("Missing ID", { status: 400 });

            try {
                // Update order status/amount
                await env.DB.prepare(`
                    UPDATE orders_new 
                    SET status = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).bind(body.status, body.total_amount, id).run();

                return new Response(JSON.stringify({ message: "Order updated" }));
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500 });
            }
        }

        if (method === 'DELETE') {
            const id = params.id;
            if (!id) return new Response("Missing ID", { status: 400 });

            try {
                await env.DB.prepare("DELETE FROM orders_new WHERE id = ?").bind(id).run();
                await env.DB.prepare("DELETE FROM order_line_items WHERE order_id = ?").bind(id).run();
                return new Response(JSON.stringify({ message: "Order deleted" }));
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500 });
            }
        }

        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM orders_new
                ORDER BY created_at DESC
            `).all();

            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }
}
