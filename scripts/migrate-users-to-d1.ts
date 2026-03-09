import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SOURCE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrateUsers() {
    console.log(`Fetching profiles from Supabase (${SUPABASE_URL})...`);

    // Fetch profiles from Supabase
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Error fetching profiles:', error);
        process.exit(1);
    }

    console.log(`Found ${profiles.length} profiles.`);

    const sqlFile = path.join(process.cwd(), 'supabase/cloudflare-d1-users-seed.sql');
    let sqlOutput = `-- Users D1 Data Seed Generated on ${new Date().toISOString()}\n\n`;
    sqlOutput += `-- Inserting ${profiles.length} users\n`;

    profiles.forEach((p) => {
        // Generate a new internal UUID if needed, though we can use Supabase's UUID directly, 
        // or generate a new random string id since schema specifies id TEXT PRIMARY KEY
        const id = p.id;
        const email = p.email?.replace(/'/g, "''") || '';
        const full_name = p.name?.replace(/'/g, "''") || '';
        const phone_number = p.phone_number?.replace(/'/g, "''") || '';
        const role = p.role || 'user';

        const is_subscriber = p.is_subscriber ? 1 : 0;
        const subscription_end_date = p.subscription_expiry ? new Date(p.subscription_expiry).toISOString() : '';

        // referral fields
        const referral_balance_kes = 0;
        const referral_code = p.referral_code?.replace(/'/g, "''") || '';

        const daily_download_count = 0;
        const created_at = p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString();

        sqlOutput += `INSERT OR REPLACE INTO users (id, email, name, role, full_name, phone_number, is_subscriber, subscription_end_date, referral_balance_kes, referral_code, referral_earned_days, daily_download_count, created_at) VALUES ('${id}', '${email}', '${full_name}', '${role}', '${full_name}', '${phone_number}', ${is_subscriber}, '${subscription_end_date}', ${referral_balance_kes}, '${referral_code}', 0, ${daily_download_count}, '${created_at}');\n`;
    });

    fs.writeFileSync(sqlFile, sqlOutput);
    console.log(`✅ Users SQL Seed file generated: ${sqlFile}`);
}

migrateUsers().catch(console.error);
