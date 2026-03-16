const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

async function run() {
    const cmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: 'data/pool_tracks.json',
        ContentType: 'application/json',
    });

    // Generate a presigned URL valid for 1 hour
    const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
    console.log('PRESIGNED_URL=' + url);
}

run().catch(console.error);
