import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    const email = 'bidalielvis@gmail.com';
    const ref = 'sub_KHpgU9C3B5Vnmr1iZsOa_1771424886961';
    const amount = 200.00; // 200 KES
    const plan = 'weekly';

    // 1. Check if user exists (case-insensitive)
    const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email);

    let userId = null;
    let userName = 'Guest';

    if (users && users.length > 0) {
        console.log('✅ Found user profile!', users[0].id);
        userId = users[0].id;
        userName = users[0].name;

        // Activate subscription in profile
        const now = new Date();
        const expiry = new Date();
        expiry.setDate(now.getDate() + 7); // 1 week

        const { error: updateError } = await supabase.from('profiles').update({
            is_subscriber: true,
            subscription_plan: plan,
            subscription_expiry: expiry.toISOString(),
            updated_at: now.toISOString()
        }).eq('id', userId);

        if (updateError) console.error('Error updating profile:', updateError);
        else console.log('✅ Profile subscription activated.');

    } else {
        console.warn('⚠️ User profile NOT found. Inserting records with null user_id (will link later if they sign up).');
    }

    // 2. Insert Payment
    const { error: payError } = await supabase.from('payments').insert({
        user_id: userId,
        user_email: email,
        amount: amount,
        currency: 'KES',
        status: 'success',
        payment_ref: ref,
        payment_type: 'subscription',
        created_at: new Date('2026-02-18T17:46:00+03:00').toISOString(), // Approx time from receipt
        metadata: {
            plan: plan,
            type: 'subscription',
            manual_entry: true
        }
    });

    if (payError) console.error('Error inserting payment:', payError);
    else console.log('✅ Payment inserted.');

    // 3. Insert Subscription
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 7);

    const { error: subError } = await supabase.from('subscriptions').insert({
        user_id: userId,
        user_email: email,
        user_name: userName,
        plan_id: plan,
        amount: amount,
        status: 'active',
        start_date: new Date().toISOString(),
        expiry_date: expiry.toISOString(),
        payment_method: 'Paystack',
        id: `sub_manual_${Date.now()}`
    });

    if (subError) console.error('Error inserting subscription:', subError);
    else console.log('✅ Subscription inserted.');

}

run().catch(console.error);
