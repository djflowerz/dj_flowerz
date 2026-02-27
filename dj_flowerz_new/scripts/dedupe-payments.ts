
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    console.log('Fetching all payments to identify duplicates...');
    const { data: payments, error } = await supabase
        .from('payments')
        .select('id, payment_ref, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching payments:', error);
        return;
    }

    const refMap = new Map<string, any[]>();
    payments.forEach(p => {
        if (!p.payment_ref) return;
        if (!refMap.has(p.payment_ref)) {
            refMap.set(p.payment_ref, []);
        }
        refMap.get(p.payment_ref)?.push(p);
    });

    const duplicates = Array.from(refMap.entries()).filter(([ref, list]) => list.length > 1);

    if (duplicates.length === 0) {
        console.log('No duplicate payment references found.');
        return;
    }

    console.log(`Found ${duplicates.length} duplicate payment references.`);

    for (const [ref, list] of duplicates) {
        console.log(`\nReference: ${ref}`);
        console.table(list);

        // Keep the newest one, delete others
        const toDelete = list.slice(1).map(p => p.id);
        console.log(`Identifying IDs to delete: ${toDelete.join(', ')}`);

        const { error: delError } = await supabase
            .from('payments')
            .delete()
            .in('id', toDelete);

        if (delError) {
            console.error(`Error deleting duplicates for ${ref}:`, delError);
        } else {
            console.log(`Successfully deleted ${toDelete.length} duplicates for ${ref}.`);
        }
    }

    console.log('\n cleanup complete.');
}

run();
