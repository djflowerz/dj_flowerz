import { getAuthorizedUser } from '../../utils/auth.js';

function normalizeEmail(email) {
    if (!email) return '';
    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2) return email.toLowerCase().trim();

    let [local, domain] = parts;

    // Remove everything after + in local part
    local = local.split('+')[0];

    // For gmail/googlemail, remove dots in local part
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        local = local.replace(/\./g, '');
    }

    return `${local}@${domain}`;
}

export async function handleTrialActivation(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);

        if (!user || !user.id || !user.email) {
            return new Response(JSON.stringify({ error: 'Unauthorized or invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const userId = user.id;
        const email = user.email;
        const canonicalEmail = normalizeEmail(email);

        // 1. Check if this canonical email has already used a trial
        const trialCheckQuery = `SELECT * FROM trial_usage WHERE canonical_email = ?`;
        const trialCheckStmt = env.DB.prepare(trialCheckQuery).bind(canonicalEmail);
        const existingTrial = await trialCheckStmt.first();

        if (existingTrial) {
            return new Response(JSON.stringify({ 
                error: 'This email address has already been used for a free trial.',
                details: 'Only one trial per person is allowed.' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 2. Check the user profile as a secondary guard
        const profileQuery = `SELECT has_used_trial FROM profiles WHERE id = ?`;
        const profileStmt = env.DB.prepare(profileQuery).bind(userId);
        const profileResult = await profileStmt.first();

        if (profileResult && profileResult.has_used_trial) {
            return new Response(JSON.stringify({ error: 'You have already activated a free trial on this account.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 3. Set trial expiry (7 days from now)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        const expiryISO = expiryDate.toISOString().replace('T', ' ').substring(0, 19);

        // 4. Atomic Transaction: Update profile and insert into trial_usage
        const batch = [
            env.DB.prepare(`
                UPDATE profiles 
                SET is_subscriber = 1,
                    subscription_plan = 'trial',
                    has_used_trial = 1,
                    subscription_expiry = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(expiryISO, userId),
            
            env.DB.prepare(`
                INSERT INTO trial_usage (canonical_email, supabase_user_id, trial_expires_at, status)
                VALUES (?, ?, ?, 'active')
            `).bind(canonicalEmail, userId, expiryISO)
        ];

        const dbResult = await env.DB.batch(batch);
        
        if (!dbResult[0].success || !dbResult[1].success) {
            throw new Error('Database update failed');
        }

        // 5. Update R2 Cache
        const existingR2 = await env.PROFILES_BUCKET.get(`profiles/${userId}.json`);
        let r2Profile = {};
        if (existingR2) {
            r2Profile = await existingR2.json();
        }

        r2Profile.is_subscriber = 1;
        r2Profile.subscription_plan = 'trial';
        r2Profile.has_used_trial = 1;
        r2Profile.subscription_expiry = expiryISO;
        r2Profile.updated_at = new Date().toISOString();

        await env.PROFILES_BUCKET.put(`profiles/${userId}.json`, JSON.stringify(r2Profile));

        return new Response(JSON.stringify({
            success: true,
            message: '7-day Free Trial activated!',
            expiry: expiryISO,
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

export async function handleTrialStatus(request, env) {
    try {
        const user = await getAuthorizedUser(request, env);

        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const userId = user.id;

        const query = `SELECT * FROM trial_usage WHERE supabase_user_id = ?`;
        const stmt = env.DB.prepare(query).bind(userId);
        const trial = await stmt.first();

        if (!trial) {
            return new Response(JSON.stringify({ 
                has_trial: false,
                message: 'No trial found for this user.' 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        return new Response(JSON.stringify({
            has_trial: true,
            status: trial.status,
            activated_at: trial.trial_activated_at,
            expires_at: trial.trial_expires_at,
            days_left: Math.max(0, Math.ceil((new Date(trial.trial_expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('Trial status error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
