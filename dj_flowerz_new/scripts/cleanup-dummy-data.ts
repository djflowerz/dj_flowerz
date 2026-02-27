import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    console.log("🧹 Cleaning up pending orders...");
    const { error: orderError, count: orderCount } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .in('status', ['pending', 'cancelled', 'failed']);

    if (orderError) console.error("Error deleting orders:", orderError);
    else console.log(`✅ Deleted ${orderCount} pending/failed orders.`);

    console.log("🧹 Cleaning up pending payments...");
    const { error: paymentError, count: paymentCount } = await supabase
        .from('payments')
        .delete({ count: 'exact' })
        .in('status', ['pending', 'failed']);

    if (paymentError) console.error("Error deleting payments:", paymentError);
    else console.log(`✅ Deleted ${paymentCount} pending/failed payments.`);
}

run().catch(console.error);
