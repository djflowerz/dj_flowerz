
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function backfill() {
    console.log('Fetching recent Paystack transactions (Last 50) for backfill...');
    try {
        const response = await axios.get('https://api.paystack.co/transaction', {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`
            },
            params: {
                perPage: 50
            }
        });

        const paystackTxns = response.data.data;
        console.log(`Found ${paystackTxns.length} transactions in Paystack.`);

        for (const txn of paystackTxns) {
            if (txn.status !== 'success') continue;

            // Check if exists
            const { data: existing } = await supabase
                .from('payments')
                .select('id')
                .eq('payment_ref', txn.reference)
                .maybeSingle();

            if (existing) {
                console.log(`[EXISTS]  Ref: ${txn.reference}`);
                continue;
            }

            console.log(`[BACKFILLING] Ref: ${txn.reference}, Amount: ${txn.amount / 100}, Email: ${txn.customer.email}`);

            // 1. Find User ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', txn.customer.email)
                .maybeSingle();

            const userId = profile?.id || null;
            const metadata = txn.metadata || {};
            const type = metadata.type || (txn.reference.startsWith('tip_') ? 'tip' : (txn.reference.startsWith('sub_') ? 'subscription' : 'store'));

            // 2. Insert into payments
            const paymentRecord = {
                user_id: userId,
                amount: txn.amount / 100,
                currency: txn.currency || 'KES',
                status: 'success',
                payment_ref: txn.reference,
                payment_type: type,
                user_email: txn.customer.email,
                metadata: metadata,
                created_at: txn.paid_at
            };

            const { error: payError } = await supabase.from('payments').insert(paymentRecord);
            if (payError) {
                console.error(`Error saving payment ${txn.reference}:`, payError.message);
                continue;
            }

            // 3. If tip, insert into tips
            if (type === 'tip') {
                const tipRecord = {
                    user_id: userId,
                    user_name: metadata.customerName || null,
                    email: txn.customer.email,
                    amount: txn.amount / 100,
                    message: metadata.message || 'Tip from DJ Flowerz Fan',
                    status: 'completed',
                    created_at: txn.paid_at
                };
                const { error: tipError } = await supabase.from('tips').insert(tipRecord);
                if (tipError) console.error(`Error saving tip ${txn.reference}:`, tipError.message);
            }

            // 4. If subscription, we might need more logic but let's at least record the payment for now.
            // Full subscription activation usually involves order creation too.

            console.log(`[DONE] Backfilled payment: ${txn.reference}`);
        }
        console.log('\nBackfill complete.');
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

backfill();
