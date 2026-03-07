
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
});

async function checkBucket(bucket: string) {
    const key = 'data/products.json';
    try {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3.send(cmd);
        const str = await response.Body?.transformToString();
        if (str) {
            const data = JSON.parse(str);
            console.log(`Bucket: ${bucket} -> Products: ${data.length}`);
        } else {
            console.log(`Bucket: ${bucket} -> Empty file`);
        }
    } catch (err: any) {
        console.log(`Bucket: ${bucket} -> Error: ${err.name} / ${err.message}`);
    }
}

async function main() {
    await checkBucket('dj-flowerz');
    await checkBucket('djflowerz-images');
}

main();
