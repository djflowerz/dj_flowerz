
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function syncTips() {
    console.log('Syncing tips table with payments table...');

    // Fetch all payments of type tip
    const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_type', 'tip');

    if (payError) {
        console.error('Error fetching payments:', payError.message);
        return;
    }

    console.log(`Found ${payments.length} tip payment records.`);

    for (const payment of payments) {
        // Check if this tip already exists (based on email and amount and time or some reference if available)
        // Since tips don't have a payment_ref column directly yet (it seems), we use order consistency.
        // Actually, let's just use the fact that tips should match payments.

        const { data: existingTip } = await supabase
            .from('tips')
            .select('id')
            .eq('email', payment.user_email)
            .eq('amount', payment.amount)
            .gte('created_at', new Date(new Date(payment.created_at).getTime() - 5000).toISOString())
            .lte('created_at', new Date(new Date(payment.created_at).getTime() + 5000).toISOString())
            .maybeSingle();

        if (existingTip) {
            console.log(`Tip already exists for payment ${payment.payment_ref}`);
            continue;
        }

        console.log(`Creating tip record for payment ${payment.payment_ref}...`);

        const metadata = payment.metadata || {};
        const tipRecord = {
            user_id: payment.user_id,
            user_name: metadata.customerName || null,
            email: payment.user_email,
            amount: payment.amount,
            message: metadata.message || 'Tip from DJ Flowerz Fan',
            status: 'completed',
            created_at: payment.created_at
        };

        const { error: tipError } = await supabase.from('tips').insert(tipRecord);
        if (tipError) {
            console.error(`Error inserting tip for ${payment.payment_ref}:`, tipError.message);
        } else {
            console.log(`Synced tip for ${payment.payment_ref}`);
        }
    }
}

syncTips();
