const fs = require('fs');
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

async function run() {
  const getCmd = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: 'data/pool_tracks.json'
  });
  
  const response = await s3.send(getCmd);
  const str = await response.Body?.transformToString();
  fs.writeFileSync('pool_tracks.json', str);
  console.log(`Saved pool_tracks.json, size: ${(str.length/1024/1024).toFixed(2)} MB`);
}

run().catch(console.error);
