
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yevqnoynsqidtplxggzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnFub3luc3FpZHRwbHhnZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjQ3ODAsImV4cCI6MjA4NzY0MDc4MH0.cb_79oC-RKNkhJBshhGw_tcFIVG50Wg6K0HIIK2Uyms';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    const { data, error, count } = await supabase
        .from('profiles')
        .select('id, email', { count: 'exact' });
    
    if (error) {
        console.error('Error fetching Supabase profiles:', error);
        return;
    }
    
    console.log(`Supabase Profiles Count: ${count}`);
    console.log('Supabase Profiles IDs:', data.map(p => p.id));
}

checkProfiles();
