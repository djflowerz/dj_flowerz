
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

async function uploadData() {
    const dataDir = path.join(process.cwd(), 'public/data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

    console.log(`🚀 Uploading ${files.length} JSON files to Cloudflare R2...`);

    for (const file of files) {
        const filePath = path.join(dataDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: `data/${file}`,
            Body: content,
            ContentType: 'application/json',
            CacheControl: 'no-cache', // Ensure fresh data
        });

        try {
            await s3.send(command);
            console.log(`✅ Uploaded: data/${file}`);
        } catch (err) {
            console.error(`❌ Failed: data/${file}`, err.message);
        }
    }
}

uploadData().catch(err => console.error(err));
