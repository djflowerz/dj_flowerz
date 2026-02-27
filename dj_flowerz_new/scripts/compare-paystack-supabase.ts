
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkMissing() {
    console.log('Fetching recent Paystack transactions (Last 50)...');
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

        const today = '2026-02-23';
        console.log(`\n--- TRANSACTIONS ON ${today} ---`);

        for (const txn of paystackTxns) {
            const txnDate = txn.paid_at || txn.created_at;
            if (!txnDate.startsWith(today)) continue;

            const { data: existing } = await supabase
                .from('payments')
                .select('id')
                .eq('payment_ref', txn.reference)
                .maybeSingle();

            const status = existing ? '[EXISTS]' : (txn.status === 'success' ? '[MISSING]' : '[IGNORED]');
            console.log(`${status} Ref: ${txn.reference}, Status: ${txn.status}, Amount: ${txn.amount / 100}, Customer: ${txn.customer.email}, Date: ${txnDate}`);
        }

        console.log(`\n--- OTHER RECENT SUCCESSFUL MISSING ---`);
        for (const txn of paystackTxns) {
            const txnDate = txn.paid_at || txn.created_at;
            if (txnDate.startsWith(today)) continue;
            if (txn.status !== 'success') continue;

            const { data: existing } = await supabase
                .from('payments')
                .select('id')
                .eq('payment_ref', txn.reference)
                .maybeSingle();

            if (!existing) {
                console.log(`[MISSING] Ref: ${txn.reference}, Amount: ${txn.amount / 100}, Customer: ${txn.customer.email}, Date: ${txnDate}`);
            }
        }
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

checkMissing();
