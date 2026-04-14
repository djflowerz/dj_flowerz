// worker/api/user.js
import { getAuthorizedUser } from '../utils/auth.js';

/**
 * GET /api/user/me
 * Returns the current authenticated user's profile from D1 (Source of Truth)
 */
export async function handleMe(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Return the full profile fetched from D1 by getAuthorizedUser
        return Response.json({
            success: true,
            user: {
                id: user.id,
                name: user.full_name || user.name || 'User',
                email: user.email,
                role: user.role,
                isSubscriber: user.is_subscriber === 1 || user.role === 'admin',
                subscriptionPlan: user.subscription_plan,
                subscriptionExpiry: user.subscription_expiry,
                avatarUrl: user.avatar_url,
                phoneNumber: user.phone || user.phone_number,
                referralCode: user.referral_code,
                balance: user.balance || 0,
                loyaltyPoints: user.loyalty_points || user.aura_points || 0,
                username: user.username || '',
                bio: user.bio || '',
                location: user.location || '',
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }
        });
    } catch (err) {
        console.error('[UserMe] Error:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
