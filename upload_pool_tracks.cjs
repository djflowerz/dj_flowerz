const fs = require('fs');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
require('dotenv').config();

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // Prevents bucket name from being used as subdomain
    requestHandler: {
        requestTimeout: 300000, // 5 min socket timeout
        connectionTimeout: 30000,
    },
    maxAttempts: 5,
});

async function run() {
    const file = 'pool_tracks.json';
    const filePath = path.join(process.cwd(), 'public/data', file);
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    console.log(`Starting multipart upload for ${file}...`);
    const fileStream = fs.createReadStream(filePath);

    try {
        const parallelUpload = new Upload({
            client: s3,
            params: {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: `data/${file}`,
                Body: fileStream,
                ContentType: 'application/json'
            },
            partSize: 10 * 1024 * 1024, // 10 MB part size (min is 5MB)
            leavePartsOnError: false, // optional manually handle dropped parts
        });

        parallelUpload.on('httpUploadProgress', (progress) => {
            console.log(`Upload progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        });

        await parallelUpload.done();
        console.log(`✅ Successfully uploaded ${file} to R2!`);
    } catch (e) {
        console.error(`❌ Upload failed:`, e);
    }
}

run().catch(console.error);
