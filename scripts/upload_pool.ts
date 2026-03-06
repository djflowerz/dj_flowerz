import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

// The .env.local file has literal "\n" strings at the end of the R2 variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.replace(/\\n/g, '').trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.replace(/\\n/g, '').trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.replace(/\\n/g, '').trim();
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME?.replace(/\\n/g, '').trim() || 'djflowerz-images';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("Missing R2 credentials.");
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

async function uploadData() {
    const dataDir = path.join(process.cwd(), 'public/data');
    const file = 'pool_tracks.json';
    const filePath = path.join(dataDir, file);

    if (!fs.existsSync(filePath)) {
        console.error("pool_tracks.json does not exist in public/data");
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `data/${file}`,
        Body: content,
        ContentType: 'application/json',
        CacheControl: 'no-cache', // Ensure fresh data
    });

    try {
        await s3.send(command);
        console.log(`✅ Uploaded: data/${file} to bucket ${R2_BUCKET_NAME}`);
    } catch (err) {
        console.error(`❌ Failed: data/${file}`, err);
    }
}

uploadData().catch(err => console.error(err));
