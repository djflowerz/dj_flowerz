const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function listAllImages() {
    console.log('🔍 Listing objects in R2 bucket: djflowerz-images...');

    const command = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME
    });

    try {
        const response = await s3.send(command);
        if (response.Contents) {
            console.log(`✅ Found ${response.Contents.length} objects.`);
            response.Contents.forEach(obj => {
                console.log(`- ${obj.Key}`);
            });
        } else {
            console.log('ℹ️ No objects found with prefix "images/".');
        }
    } catch (error) {
        console.error('❌ Failed to list objects:', error);
    }
}

listAllImages();
