
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;

if (!SOURCE_URL || !SOURCE_KEY) {
    console.error('Missing source credentials');
    process.exit(1);
}

const supabase = createClient(SOURCE_URL, SOURCE_KEY);

async function listFilesRecursive(bucket: string, folder = '') {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    if (error) {
        console.error(`Error listing ${bucket}/${folder}:`, error.message);
        return;
    }

    for (const item of data) {
        if (item.id === null) {
            // It's a folder
            await listFilesRecursive(bucket, folder ? `${folder}/${item.name}` : item.name);
        } else {
            console.log(`FILE: ${bucket}/${folder ? folder + '/' : ''}${item.name}`);
        }
    }
}

async function main() {
    const buckets = ['mixtapes', 'products', 'avatars', 'public'];
    for (const bucket of buckets) {
        console.log(`Checking bucket: ${bucket}`);
        await listFilesRecursive(bucket);
    }
}

main();
