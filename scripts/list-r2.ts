import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'djflowerz-images';

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

async function run() {
    try {
        console.log(`Listing objects in ${R2_BUCKET}...`);
        const command = new ListObjectsV2Command({ Bucket: R2_BUCKET });
        const response = await s3.send(command);
        if (response.Contents) {
            for (const item of response.Contents) {
                if (item.Key?.includes('product')) {
                    console.log(item.Key, item.Size, item.LastModified);
                }
            }
        } else {
            console.log('No objects found.');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
run();
