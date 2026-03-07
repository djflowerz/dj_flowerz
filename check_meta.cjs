const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function check(collection) {
    const key = `data/${collection}.json`;
    const cmd = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });

    try {
        const response = await s3.send(cmd);
        const str = await response.Body.transformToString();
        const count = (str.match(/GoPro|Green Lion/gi) || []).length;
        console.log(`${collection}: found ${count} matches for GoPro/Green Lion`);
        if (count > 0) {
            // Print first match context
            const idx = str.search(/GoPro|Green Lion/i);
            console.log('Context:', str.substring(Math.max(0, idx - 100), Math.min(str.length, idx + 200)));
        }
    } catch (err) {
        console.error(`Error checking ${collection}:`, err.message);
    }
}

async function run() {
    await check('products');
    await check('studio_equipment');
}

run();
