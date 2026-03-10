import { getAuthorizedUser } from '../../utils/auth.js';

export async function handleTrialActivation(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);

        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized or invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const userId = user.id;

        // Check if user has already used a trial
        const checkQuery = `SELECT has_used_trial FROM profiles WHERE id = ?`;
        const checkStmt = env.DB.prepare(checkQuery).bind(userId);
        const userResult = await checkStmt.first();

        if (!userResult) {
            return new Response(JSON.stringify({ error: 'User profile not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (userResult.has_used_trial) {
            return new Response(JSON.stringify({ error: 'Free trial has already been used' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Update the local database profile to assign the trial
        // Set 7 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        const expiryISO = expiryDate.toISOString().replace('T', ' ').substring(0, 19);

        const updateQuery = `
      UPDATE profiles 
      SET is_subscriber = 1,
          subscription_plan = 'trial',
          has_used_trial = 1,
          subscription_expiry = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
        const updateStmt = env.DB.prepare(updateQuery).bind(expiryISO, userId);
        const dbUpdateResult = await updateStmt.run();

        if (!dbUpdateResult.success) {
            return new Response(JSON.stringify({ error: 'Failed to update database profile' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Update the R2 cache document as the backend now manages this
        const existingR2 = await env.PROFILES_BUCKET.get(`profiles/${userId}.json`);
        let r2Profile = {};
        if (existingR2) {
            const data = await existingR2.json();
            r2Profile = data;
        }

        r2Profile.is_subscriber = 1;
        r2Profile.subscription_plan = 'trial';
        r2Profile.has_used_trial = 1;
        r2Profile.subscription_expiry = expiryISO;
        r2Profile.updated_at = new Date().toISOString();

        await env.PROFILES_BUCKET.put(`profiles/${userId}.json`, JSON.stringify(r2Profile));

        return new Response(JSON.stringify({
            success: true,
            message: 'Trial started successfully.',
            updatedProfile: r2Profile
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('Trial activation error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
