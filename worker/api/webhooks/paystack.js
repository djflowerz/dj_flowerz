// worker/api/webhooks/paystack.js
import { sendEmail } from '../../utils/email.js';

export async function handlePaystackWebhook(request, env) {
    const signature = request.headers.get('x-paystack-signature');
    const body = await request.text();

    // 1. Verify signature (HMAC SHA512)
    if (!signature || !env.PAYSTACK_SECRET_KEY) {
        return new Response("Unauthorized - Missing signature or key", { status: 401 });
    }

    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(env.PAYSTACK_SECRET_KEY),
            { name: "HMAC", hash: "SHA-512" },
            false,
            ["sign"]
        );
        const hmacBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
        const hmacArray = Array.from(new Uint8Array(hmacBuffer));
        const hmacHex = hmacArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hmacHex !== signature) {
            console.error('[Paystack Webhook] Invalid signature');
            return new Response("Unauthorized - Invalid signature", { status: 401 });
        }
    } catch (err) {
        console.error('[Paystack Webhook] Verification error:', err);
        return new Response("Error", { status: 500 });
    }

    const event = JSON.parse(body);
    if (event.event === 'charge.success') {
        const { reference, metadata, amount, customer } = event.data;
        const type = metadata?.type;

        if (type === 'order') {
            const orderId = metadata?.order_id;
            if (orderId) {
                // Update orders table
                await env.DB.prepare(`
                    UPDATE orders SET payment_status = 'paid', status = 'processing'
                    WHERE id = ?
                `).bind(orderId).run();

                // Send Order Receipt
                try {
                    await sendEmail({
                        to: customer?.email || 'customer@djflowerz.co.ke',
                        subject: `Order Receipt - #${orderId}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                                <h1 style="color: #a855f7; margin-bottom: 20px;">Order Confirmed!</h1>
                                <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Thank you for your purchase. Your order <strong>#${orderId}</strong> is now being processed.</p>
                                <div style="background: #15151a; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #ffffff10;">
                                    <h3 style="color: #ffffff; margin-top: 0;">Order Summary</h3>
                                    <p style="margin: 5px 0; color: #9ca3af;">Status: <span style="color: #4ade80;">Paid</span></p>
                                    <p style="margin: 5px 0; color: #9ca3af;">Amount: KSh ${(amount / 100).toLocaleString()}</p>
                                </div>
                                <p style="color: #9ca3af; font-size: 14px;">We'll notify you once your order has been dispatched.</p>
                                <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                                <p style="font-size: 10px; color: #4b5563; text-align: center; text-transform: uppercase;">DJ FLOWERZ • Nairobi, Kenya</p>
                            </div>
                        `,
                        text: `Order Confirmed! Your order #${orderId} for KSh ${(amount / 100).toLocaleString()} is being processed.`
                    }, env);
                } catch (e) {
                    console.error('[Order Receipt Email Error]', e);
                }

                // Wait, previous code checked order_line_items. We'll leave it in case it still exists.
                try {
                    const { results: items } = await env.DB.prepare("SELECT * FROM order_line_items WHERE order_id = ?").bind(orderId).all();
                    for (const item of items) {
                        await env.DB.prepare(`
                            UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND track_inventory = 1
                        `).bind(item.quantity, item.variant_id).run();
                    }
                } catch(e) { /* ignore if order_line_items doesn't exist */ }
            }
        } else if (type === 'tip') {
            const userId = metadata?.userId || 'guest';
            const userEmail = metadata?.userEmail || customer?.email || 'guest_tipper@djflowerz.co.ke';
            const customerName = metadata?.customerName || customer?.first_name || 'Guest';
            const message = metadata?.message || '';

            try {
                await env.DB.prepare(`
                    INSERT INTO tips (id, user_id, amount, message, created_at, status, email, name)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'completed', ?, ?)
                `).bind(`tip_${Date.now()}`, userId, amount / 100, message, userEmail, customerName).run();

                // Send Tip Receipt
                try {
                    await sendEmail({
                        to: userEmail,
                        subject: 'Thank You for Your Support! 💎',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
                                <h1 style="color: #a855f7; margin-bottom: 10px;">You're a Legend!</h1>
                                <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Your contribution of <strong>KSh ${(amount / 100).toLocaleString()}</strong> was received with deep gratitude.</p>
                                <p style="color: #9ca3af; font-size: 14px;">Support like yours keeps the music flowing and the mixtapes dropping. Thank you for being part of the journey.</p>
                                <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
                                <p style="font-size: 10px; color: #4b5563; text-align: center;">DJ FLOWERZ OFFICIAL</p>
                            </div>
                        `,
                        text: `Thank You for Your Support! Your tip of KSh ${(amount / 100).toLocaleString()} was received.`
                    }, env);
                } catch (e) {
                    console.error('[Tip Receipt Email Error]', e);
                }
            } catch (e) {
                console.error("Tip webhook error:", e);
                // If the tips table has a different schema, it might fail, but let's try assuming standard columns.
            }
        }
    }

    return new Response("OK", { status: 200 });
}
