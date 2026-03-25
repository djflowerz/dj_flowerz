// worker/api/storefront/coupons.js

export async function handleStorefrontCoupons(request, env, ctx, params) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (!code) {
        return new Response(JSON.stringify({ error: "Coupon code is required" }), { 
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    }

    try {
        const coupon = await env.DB.prepare(`
            SELECT * FROM coupons 
            WHERE code = ? AND is_active = 1
        `).bind(code.toUpperCase()).first();

        if (!coupon) {
            return new Response(JSON.stringify({ error: "Invalid coupon code" }), { 
                status: 404,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // Check expiry
        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            return new Response(JSON.stringify({ error: "Coupon has expired" }), { 
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // Check max uses
        if (coupon.max_uses_total !== null && coupon.used_count >= coupon.max_uses_total) {
            return new Response(JSON.stringify({ error: "Coupon has reached its usage limit" }), { 
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_spend: coupon.min_spend,
            scope: coupon.scope
        }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    } catch (e) {
        console.error("[Storefront Coupon Validate Error]", e);
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    }
}
