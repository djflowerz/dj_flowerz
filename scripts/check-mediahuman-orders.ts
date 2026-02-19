
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    const mediaHumanOrders = data.filter(order =>
        JSON.stringify(order.items).includes('MediaHuman')
    );

    console.log('MediaHuman Orders found:', mediaHumanOrders.length);
    if (mediaHumanOrders.length > 0) {
        console.log('Sample Order Items:', JSON.stringify(mediaHumanOrders[0].items, null, 2));
    }
}

checkOrders();
