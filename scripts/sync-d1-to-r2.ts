
import { execSync } from 'child_process';
import * as fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'djflowerz-images';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("❌ Missing R2 credentials in .env");
    process.exit(1);
}

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const WRANGLER_PATH = 'npx wrangler';

async function syncTable(table: string) {
    console.log(`📊 Fetching ${table} from D1...`);
    try {
        const cmd = `${WRANGLER_PATH} d1 execute djflowerz-db --remote --command "SELECT * FROM ${table}" --json`;
        const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
        
        const data = JSON.parse(output);
        const results = data[0].results;
        
        console.log(`✨ Processed ${results.length} records for ${table}.`);
        
        const key = `data/${table}.json`;
        const body = JSON.stringify(results); // minified for R2 cache
        
        console.log(`☁️ Uploading ${key} to R2...`);
        const putCmd = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: 'application/json'
        });
        
        await s3.send(putCmd);
        console.log(`✅ ${table} synced successfully!`);
        
    } catch (e: any) {
        console.error(`❌ Sync failed for ${table}:`, e.message);
    }
}

async function run() {
    console.log("🚀 Starting D1 -> R2 Dynamic Sync...");
    await syncTable('profiles');
    await syncTable('subscriptions');
    console.log("🏁 All sync tasks complete.");
}

run().catch(console.error);
