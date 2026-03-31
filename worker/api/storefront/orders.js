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

        const items = body.items || [];
        // Guard against NaN/undefined — D1 rejects non-numeric types
        const totalAmount = Number(body.total_amount) || 0;

        const couponCode = body.coupon_code || null;
        const discountAmount = Number(body.discount_amount) || 0;
        const isInstallment = body.payment_type === 'lipa_pole_pole';
        const depositAmount = isInstallment ? Math.ceil(totalAmount * 0.20) : 0;
        
        // Amount to charge right now (deposit or full)
        const amountToCharge = isInstallment ? depositAmount : totalAmount;

        await env.DB.prepare(`
            INSERT INTO orders (
                id, customer_email, customer_name, 
                total_amount, status, payment_status, payment_method,
                items, address, customer_phone, coupon_code, discount_amount,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
            body.customer_phone || body.customer?.phone || null,
            couponCode,
            discountAmount
        ).run();

        // If Lipa Pole Pole, create the installment plan
        if (isInstallment) {
            const planId = `lpp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const userId = body.customer_id || body.customer?.id || 'guest';
            
            // Extract primary product info from first item if available
            const firstItem = items[0] || {};
            // Frontend sends product_id; fallback to id for compatibility
            const productId = firstItem.product_id || firstItem.id || null;
            const productName = items.length > 1 
              ? `${firstItem.product_name || firstItem.name || 'Item'} + ${items.length - 1} more` 
              : (firstItem.product_name || firstItem.name || 'Product');

            await env.DB.prepare(`
                INSERT INTO installment_plans (
                    id, order_id, user_id, product_id, product_name, 
                    total_amount, deposit_amount, paid_amount, balance, 
                    status, installments_count, payment_interval, 
                    reminder_channel, is_reminder_enabled, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending_deposit', ?, 'monthly', 'sms', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(
                planId, orderId, userId, productId, productName,
                totalAmount, depositAmount, totalAmount, Number(body.installments_count) || 3
            ).run();
        }

        // 2. Initialize Paystack Transaction for Redirect
        const amountInKobo = Math.round(amountToCharge * 100);
        const email = body.customer_email || body.customer?.email;
        
        if (!email) {
            return new Response(JSON.stringify({ error: "Email is required for payment initialization" }), { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        }

        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                amount: amountInKobo,
                reference: orderId,
                callback_url: body.callback_url || `${env.VITE_APP_URL || 'https://www.djflowerz.co.ke'}/success${isInstallment ? '?type=installment_deposit' : ''}`,
                metadata: {
                    order_id: orderId,
                    type: isInstallment ? 'installment_deposit' : 'store_order',
                    is_installment: isInstallment,
                    customerName: body.customer_name || body.customer?.name || "Customer",
                    custom_fields: [
                        { display_name: "Order ID", variable_name: "order_id", value: orderId },
                        ...(isInstallment ? [{ display_name: "Deposit Amount", variable_name: "deposit_amount", value: depositAmount }] : [])
                    ]
                }
            })
        });

        const paystackData = await paystackRes.json();
        
        if (!paystackRes.ok) {
            console.error('[Paystack Init Error]', paystackData);
            return new Response(JSON.stringify({ error: "Failed to initialize payment: " + (paystackData.message || "Unknown error") }), { 
                status: 500,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        return new Response(JSON.stringify({ 
            success: true,
            orderId, 
            totalAmount,
            amountCharged: amountToCharge,
            isInstallment,
            authorizationUrl: paystackData.data.authorization_url,
            accessCode: paystackData.data.access_code,
            reference: paystackData.data.reference,
            message: "Order created, redirecting to payment..." 
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
