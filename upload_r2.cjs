const fs = require('fs');
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
  const data = JSON.parse(fs.readFileSync('products_backup.json', 'utf-8'));
  
  // optionally add the test product or maybe they don't want it?
  // Let's just upload their original products so it's not empty!
  
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: 'data/products.json',
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json'
  });
  
  await s3.send(cmd);
  console.log('Successfully uploaded products to R2!');
}

run().catch(console.error);
