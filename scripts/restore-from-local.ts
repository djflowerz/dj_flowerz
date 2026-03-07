
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'djflowerz-images';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Cloudflare R2 credentials missing.');
    process.exit(1);
}

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    }
});

const restorationMap: Record<string, string> = {
    'mixtapes.json': 'data/mixtapes.json',
    'products.json': 'data/products.json',
    'pool_tracks.json': 'data/pool_tracks.json',
    'genres.json': 'data/genres.json',
    'session_types.json': 'data/session_types.json',
    'studio_equipment.json': 'data/studio_equipment.json',
    'subscription_plans.json': 'data/subscription_plans.json',
    'shipping_zones.json': 'data/shipping_zones.json',
    'youtube_videos.json': 'data/videos.json',
    'coupons.json': 'data/coupons.json',
    'settings.json': 'data/settings.json',
    'studio_rooms.json': 'data/studio_rooms.json'
};

async function restoreFile(localFile: string, r2Key: string) {
    const localPath = path.resolve(process.cwd(), 'public/data', localFile);
    if (!fs.existsSync(localPath)) {
        console.warn(`⚠️ Local file not found: ${localPath}`);
        return;
    }

    console.log(`📤 Restoring ${localFile} to R2: ${r2Key}...`);
    try {
        const fileContent = fs.readFileSync(localPath);
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            Body: fileContent,
            ContentType: "application/json",
        });

        await s3.send(command);
        console.log(`✅ Restored ${localFile} successfully.`);
    } catch (err: any) {
        console.error(`❌ Error restoring ${localFile}:`, err.message);
    }
}

async function main() {
    console.log('🚀 Starting Restoration from local public/data to R2...');
    for (const [local, r2] of Object.entries(restorationMap)) {
        await restoreFile(local, r2);
    }
    console.log('🎉 Restoration finished!');
}

main().catch(console.error);
