import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
    console.log("Checking Admin Profile...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error("Error fetching profiles:", error.message);
    } else {
        console.log("Profiles in DB:", JSON.stringify(data, null, 2));
    }
}

checkAdmin();
