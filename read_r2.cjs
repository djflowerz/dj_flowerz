
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

async function readR2(key) {
    try {
        const cmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
        const response = await s3.send(cmd);
        const body = await response.Body.transformToString();
        const data = JSON.parse(body);
        console.log(`Key: ${key}`);
        console.log(`Count: ${data.length}`);
        console.log(`First item:`, JSON.stringify(data[0], null, 2));
    } catch (err) {
        console.error(`Error reading ${key}:`, err.message);
    }
}

const key = process.argv[2] || 'data/products.json';
readR2(key);
