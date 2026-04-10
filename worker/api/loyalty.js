export async function handleLoyalty(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === "/api/loyalty/history" && method === "GET") {
        const userId = url.searchParams.get("userId");
        if (!userId) {
            return new Response("User ID is required", { status: 400 });
        }

        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM loyalty_history 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 50
            `).bind(userId).all();
            
            return Response.json(results || []);
        } catch (err) {
            console.error('[Loyalty History Fetch Error]', err);
            return new Response("Internal Server Error", { status: 500 });
        }
    }

    if (path === "/api/loyalty/redeem" && method === "POST") {
        const { userId, rewardId } = await request.json();
        
        if (!userId || !rewardId) {
            return new Response("Missing parameters", { status: 400 });
        }

        const rewards = {
            'REWARD_10_PERCENT': { points: 500, type: 'coupon', value: 10, label: '10% OFF Store Coupon' },
            'REWARD_25_PERCENT': { points: 1000, type: 'coupon', value: 25, label: '25% OFF Store Coupon' },
            'REWARD_1_MONTH_SUB': { points: 2000, type: 'subscription', value: 30, label: '1 Month Free Subscription' }
        };

        const reward = rewards[rewardId];
        if (!reward) return new Response("Invalid reward ID", { status: 400 });

        try {
            // 1. Get current balance and check eligibility
            const profile = await env.DB.prepare("SELECT loyalty_points, subscription_expiry, is_subscriber FROM profiles WHERE id = ?").bind(userId).first();
            if (!profile) return new Response("User not found", { status: 404 });
            
            if ((profile.loyalty_points || 0) < reward.points) {
                return new Response("Insufficient points", { status: 400 });
            }

            // 2. Process Redemption (Transaction)
            const transactionId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
            const newPoints = profile.loyalty_points - reward.points;

            if (reward.type === 'coupon') {
                const couponCode = `AURA-${reward.value}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                
                await env.DB.batch([
                    // Update points
                    env.DB.prepare("UPDATE profiles SET loyalty_points = ? WHERE id = ?").bind(newPoints, userId),
                    // Create coupon
                    env.DB.prepare(`
                        INSERT INTO coupons (id, code, scope, discount_type, discount_value, usage_limit, is_active, created_by_ref_user_id, expiry_date)
                        VALUES (?, ?, 'all', 'percentage', ?, 1, 1, ?, datetime('now', '+30 days'))
                    `).bind(crypto.randomUUID(), couponCode, reward.value, userId),
                    // Log history
                    env.DB.prepare(`
                        INSERT INTO loyalty_history (id, user_id, points, type, description)
                        VALUES (?, ?, ?, 'redemption', ?)
                    `).bind(transactionId, userId, -reward.points, `Redeemed ${reward.label}. Code: ${couponCode}`)
                ]);

                return Response.json({ success: true, code: couponCode, message: `Redeemed ${reward.label}!` });
            } else if (reward.type === 'subscription') {
                let currentExpiry = profile.subscription_expiry ? new Date(profile.subscription_expiry) : new Date();
                if (currentExpiry < new Date()) currentExpiry = new Date();
                
                const newExpiry = new Date(currentExpiry.getTime() + (reward.value * 24 * 60 * 60 * 1000)).toISOString();

                await env.DB.batch([
                    // Update points and sub
                    env.DB.prepare("UPDATE profiles SET loyalty_points = ?, is_subscriber = 1, subscription_expiry = ? WHERE id = ?").bind(newPoints, newExpiry, userId),
                    // Log history
                    env.DB.prepare(`
                        INSERT INTO loyalty_history (id, user_id, points, type, description)
                        VALUES (?, ?, ?, 'redemption', ?)
                    `).bind(transactionId, userId, -reward.points, `Redeemed 1 Month Free Subscription Access.`)
                ]);

                return Response.json({ success: true, message: "Subscription extended by 30 days!" });
            }

        } catch (err) {
            console.error('[Loyalty Redemption Error]', err);
            return new Response("Internal Server Error", { status: 500 });
        }
    }

    if (path === "/api/admin/loyalty/adjust" && method === "POST") {
        const { userId, points, description } = await request.json();
        
        if (!userId || points === undefined) {
            return new Response("Missing parameters", { status: 400 });
        }

        try {
            const profile = await env.DB.prepare("SELECT loyalty_points FROM profiles WHERE id = ?").bind(userId).first();
            if (!profile) return new Response("User not found", { status: 404 });

            const newTotal = (profile.loyalty_points || 0) + Number(points);
            const transactionId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

            await env.DB.batch([
                env.DB.prepare("UPDATE profiles SET loyalty_points = ? WHERE id = ?").bind(newTotal, userId),
                env.DB.prepare(`
                    INSERT INTO loyalty_history (id, user_id, points, type, description)
                    VALUES (?, ?, ?, 'adjustment', ?)
                `).bind(transactionId, userId, points, description || 'Administrative Adjustment')
            ]);

            return Response.json({ success: true, newTotal });
        } catch (err) {
            console.error('[Admin Loyalty Adjustment Error]', err);
            return new Response("Internal Server Error", { status: 500 });
        }
    }

    return new Response("Not Found", { status: 404 });
}
