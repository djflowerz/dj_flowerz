/**
 * fix-subscriptions.ts
 *
 * Backfill script: finds users who have active subscription records
 * but whose profiles still have is_subscriber = false, and fixes them.
 *
 * Run with: npx ts-node --esm scripts/fix-subscriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    console.log('🔍 Checking for users with active subscriptions but is_subscriber=false...\n');

    // 1. Get all active subscriptions
    const { data: activeSubs, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, user_email, plan_id, expiry_date, status')
        .eq('status', 'active');

    if (subError) {
        console.error('Error fetching subscriptions:', subError.message);
        return;
    }

    console.log(`Found ${activeSubs?.length || 0} active subscriptions`);

    let fixed = 0;
    let alreadyOk = 0;
    let noProfile = 0;

    for (const sub of activeSubs || []) {
        if (!sub.user_id) {
            // Try to find by email
            if (sub.user_email) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, is_subscriber')
                    .eq('email', sub.user_email)
                    .maybeSingle();

                if (profile) {
                    if (!profile.is_subscriber) {
                        const { error } = await supabase.from('profiles').update({
                            is_subscriber: true,
                            subscription_plan: sub.plan_id,
                            subscription_expiry: sub.expiry_date,
                            updated_at: new Date().toISOString()
                        }).eq('id', profile.id);

                        // Also update the subscription with the user_id
                        await supabase.from('subscriptions').update({ user_id: profile.id })
                            .eq('user_email', sub.user_email).eq('status', 'active');

                        if (!error) {
                            console.log(`✅ Fixed: ${sub.user_email} (profile ${profile.id})`);
                            fixed++;
                        } else {
                            console.error(`❌ Error fixing ${sub.user_email}:`, error.message);
                        }
                    } else {
                        alreadyOk++;
                    }
                } else {
                    console.warn(`⚠️  No profile found for email: ${sub.user_email}`);
                    noProfile++;
                }
            }
            continue;
        }

        // Check if profile needs updating
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, is_subscriber, email')
            .eq('id', sub.user_id)
            .maybeSingle();

        if (!profile) {
            console.warn(`⚠️  No profile found for user_id: ${sub.user_id}`);
            noProfile++;
            continue;
        }

        if (!profile.is_subscriber) {
            const { error } = await supabase.from('profiles').update({
                is_subscriber: true,
                subscription_plan: sub.plan_id,
                subscription_expiry: sub.expiry_date,
                updated_at: new Date().toISOString()
            }).eq('id', sub.user_id);

            if (!error) {
                console.log(`✅ Fixed: ${profile.email || sub.user_id}`);
                fixed++;
            } else {
                console.error(`❌ Error fixing ${sub.user_id}:`, error.message);
            }
        } else {
            alreadyOk++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Fixed: ${fixed}`);
    console.log(`  ✓  Already OK: ${alreadyOk}`);
    console.log(`  ⚠️  No profile found: ${noProfile}`);

    // 2. Also check payments table for subscription payments with user_id
    console.log('\n🔍 Checking payments table for unprocessed subscription payments...');
    const { data: subPayments } = await supabase
        .from('payments')
        .select('user_id, user_email, metadata, created_at')
        .eq('payment_type', 'subscription')
        .eq('status', 'success');

    console.log(`Found ${subPayments?.length || 0} subscription payments`);

    for (const payment of subPayments || []) {
        const email = payment.user_email;
        const meta = payment.metadata || {};
        const planName = meta.planId || meta.plan || 'monthly';

        if (!email) continue;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, is_subscriber')
            .eq('email', email)
            .maybeSingle();

        if (profile && !profile.is_subscriber) {
            const now = new Date();
            let expiryDate = new Date(now);
            if (planName.toLowerCase().includes('week')) {
                expiryDate.setDate(now.getDate() + 7);
            } else if (planName.toLowerCase().includes('annual') || planName.toLowerCase().includes('year')) {
                expiryDate.setFullYear(now.getFullYear() + 1);
            } else {
                expiryDate.setMonth(now.getMonth() + 1);
            }

            const { error } = await supabase.from('profiles').update({
                is_subscriber: true,
                subscription_plan: planName,
                subscription_expiry: expiryDate.toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', profile.id);

            if (!error) {
                console.log(`✅ Activated from payment: ${email} (plan: ${planName})`);
            }
        }
    }

    console.log('\n✅ Done!');
}

run().catch(console.error);
