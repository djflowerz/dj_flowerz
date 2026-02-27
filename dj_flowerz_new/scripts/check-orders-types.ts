import { supabase } from '../utils/supabase';

async function checkOrders() {
    const { data, error } = await supabase.from('orders').select('id, type, metadata').limit(10);
    if (error) {
        console.error('Error fetching orders:', error.message);
        return;
    }
    console.log('Orders found:', data?.length);
    data?.forEach(o => console.log(`ID: ${o.id}, Type: ${o.type}, Metadata Type: ${o.metadata?.type}`));
}

checkOrders().catch(console.error);
