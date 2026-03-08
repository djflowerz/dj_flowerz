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
    const dataDir = path.join(process.cwd(), 'public/data');

    // Explicitly exclude files that are updated dynamically on the live site from R2
    const EXCLUDED_FILES = [
        'products.json',
        'mixtapes.json',
        'orders.json',
        'subscriptions.json',
        'subscribers.json',
        'profiles.json',
        'bookings.json',
        'scanned_tracks.json',
        'youtube_videos.json' // Dynamic
    ];

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !EXCLUDED_FILES.includes(f));

    for (const file of files) {
        const filePath = path.join(dataDir, file);
        const data = fs.readFileSync(filePath, 'utf8');

        const cmd = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: `data/${file}`,
            Body: data,
            ContentType: 'application/json'
        });

        await s3.send(cmd);
        console.log(`✅ Uploaded ${file} to R2!`);
    }
}

run().catch(console.error);
