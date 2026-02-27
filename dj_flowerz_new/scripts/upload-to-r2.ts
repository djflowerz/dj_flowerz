
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || R2_ACCOUNT_ID === 'your_account_id') {
    console.error("❌ Error: Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing or still set to defaults in .env.");
    console.log("Please update your .env file with your actual R2 credentials before running this script.");
    process.exit(1);
}

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

async function uploadFile(fileName: string) {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Warning: ${fileName} not found in public/data/. Skipping.`);
        return;
    }

    const fileContent = fs.readFileSync(filePath);
    const key = `data/${fileName}`;

    console.log(`Uploading ${fileName} to R2 bucket ${R2_BUCKET_NAME} at ${key}...`);

    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: "application/json",
        });

        await s3.send(command);
        console.log(`✅ Successfully uploaded ${fileName}`);
    } catch (error: any) {
        console.error(`❌ Failed to upload ${fileName}:`, error.message);
    }
}

async function run() {
    console.log("🚀 Starting Cloudflare R2 Upload...");

    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.error("❌ No JSON files found in public/data/. Please run 'npx tsx scripts/export-to-r2.ts' first.");
        return;
    }

    for (const file of files) {
        await uploadFile(file);
    }

    console.log("\n✨ Done! Your storefront data is now live on R2.");
    console.log(`Public Data URL: ${process.env.VITE_R2_URL}/data/*.json`);
}

run();
