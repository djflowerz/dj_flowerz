import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Manually insert the known missed payment from Paystack dashboard
// tip_1771827405142 | guest_tipper@djflowerz.com | KES 5 | 2026-02-23T06:17:24.000Z
async function insertMissed() {
    const records = [
        {
            user_id: null,
            amount: 5,
            currency: 'KES',
            status: 'success',
            payment_ref: 'tip_1771827405142',
            payment_type: 'tip',
            user_email: 'guest_tipper@djflowerz.com',
            metadata: { type: 'tip' },
            created_at: '2026-02-23T06:17:24.000Z'
        }
    ];

    for (const r of records) {
        const { data: existing } = await supabase
            .from('payments')
            .select('payment_ref')
            .eq('payment_ref', r.payment_ref)
            .maybeSingle();

        if (existing) {
            console.log(`Skipping: ${r.payment_ref} already exists.`);
            continue;
        }

        const { error } = await supabase.from('payments').insert(r);
        if (error) console.error('Failed:', error.message);
        else console.log(`Inserted: ${r.payment_ref} | ${r.user_email} | KES ${r.amount}`);
    }
    console.log('Done.');
}

insertMissed().catch(console.error);
