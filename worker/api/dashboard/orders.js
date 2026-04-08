// worker/api/dashboard/orders.js
import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleDashboardOrders(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || user.role !== 'admin') {
        return new Response("Unauthorized", { 
            status: 401,
            headers: { "Access-Control-Allow-Origin": "*" }
        });
    }

    const id = params?.id;
    const method = request.method;

    // HANDLE SINGLE ORDER OPERATIONS (GET, PUT, DELETE WITH ID)
    if (id) {
        if (method === 'GET') {
            try {
                const order = await env.DB.prepare(`
                    SELECT * FROM orders WHERE id = ?
                `).bind(id).first();

                if (!order) return new Response("Not Found", { status: 404 });

                // Parse items if they exist as a JSON string
                let items = [];
                if (order.items) {
                    try {
                        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
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
        }

        if (method === 'PUT') {
            try {
                const body = await request.json();
                
                // Map frontend fields (camelCase) to backend fields (snake_case)
                const status = body.status;
                const total_amount = body.total_amount !== undefined ? body.total_amount : body.total;
                const payment_status = body.payment_status !== undefined ? body.payment_status : body.paymentStatus;
                const tracking_number = body.tracking_number !== undefined ? body.tracking_number : body.trackingNumber;
                const shipping_provider = body.shipping_provider !== undefined ? body.shipping_provider : body.courierName;
                const shipping_status = body.shipping_status !== undefined ? body.shipping_status : body.shippingStatus;
                const estimated_arrival = body.estimated_arrival !== undefined ? body.estimated_arrival : body.estimatedArrival;
                const courier_driver_name = body.courier_driver_name !== undefined ? body.courier_driver_name : body.courierDriverName;
                const courier_driver_contact = body.courier_driver_contact !== undefined ? body.courier_driver_contact : body.courierDriverContact;
                const notes = body.notes !== undefined ? body.notes : body.adminMessage;
                const shipped_at = body.shipped_at !== undefined ? body.shipped_at : body.shippedAt;

                // Build dynamic UPDATE query based on provided fields
                let sets = ["updated_at = CURRENT_TIMESTAMP"];
                let values = [];

                if (status !== undefined) { sets.push("status = ?"); values.push(status); }
                if (total_amount !== undefined) { sets.push("total_amount = ?"); values.push(total_amount); }
                if (payment_status !== undefined) { sets.push("payment_status = ?"); values.push(payment_status); }
                if (tracking_number !== undefined) { sets.push("tracking_number = ?"); values.push(tracking_number); }
                if (shipping_provider !== undefined) { sets.push("shipping_provider = ?"); values.push(shipping_provider); }
                if (shipping_status !== undefined) { sets.push("shipping_status = ?"); values.push(shipping_status); }
                if (estimated_arrival !== undefined) { sets.push("estimated_arrival = ?"); values.push(estimated_arrival); }
                if (courier_driver_name !== undefined) { sets.push("courier_driver_name = ?"); values.push(courier_driver_name); }
                if (courier_driver_contact !== undefined) { sets.push("courier_driver_contact = ?"); values.push(courier_driver_contact); }
                if (notes !== undefined) { sets.push("notes = ?"); values.push(notes); }
                if (shipped_at !== undefined) { sets.push("shipped_at = ?"); values.push(shipped_at); }

                values.push(id);
                
                await env.DB.prepare(`
                    UPDATE orders 
                    SET ${sets.join(", ")}
                    WHERE id = ?
                `).bind(...values).run();

                return new Response(JSON.stringify({ message: "Order updated successfully" }), {
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { 
                    status: 500,
                    headers: { "Access-Control-Allow-Origin": "*" }
                });
            }
        }

        if (method === 'DELETE') {
            try {
                await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
                return new Response(JSON.stringify({ message: "Order deleted" }), {
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500 });
            }
        }
    } 
    
    // HANDLE COLLECTION OPERATIONS (GET LIST WITHOUT ID)
    else if (method === 'GET') {
        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM orders 
                ORDER BY created_at DESC
            `).all();

            const formattedResults = results.map(order => {
                let items = [];
                if (order.items) {
                    try {
                        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
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

    return new Response("Method Not Allowed", { status: 405 });
}
