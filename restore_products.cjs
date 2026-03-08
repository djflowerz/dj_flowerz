const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function run() {
    const filePath = path.join(process.cwd(), 'public/data/products.json');
    if (!fs.existsSync(filePath)) {
        console.error("products.json not found!");
        return;
    }

    const data = fs.readFileSync(filePath, 'utf8');

    const cmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: `data/products.json`,
        Body: data,
        ContentType: 'application/json'
    });

    await s3.send(cmd);
    console.log(`✅ Restore Uploaded products.json to R2!`);
}

run().catch(console.error);
