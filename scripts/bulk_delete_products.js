import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'dj-flowerz').trim();

async function bulkDeleteProducts() {
    console.log('--- Bulk Delete Products ---');

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        console.error('Error: Missing R2 credentials in environment variables.');
        return;
    }

    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });

    const key = 'data/products.json';

    try {
        console.log(`Overwriting ${key} with empty array...`);
        const putCmd = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify([]),
            ContentType: 'application/json'
        });

        await s3.send(putCmd);
        console.log('✓ Success: All store products deleted (overwritten with []).');
    } catch (error) {
        console.error('✗ Error deleting products:', error.message);
    }
}

bulkDeleteProducts();
