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

async function run() {
  const cmd = new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
    Prefix: 'data/'
  });
  
  const response = await s3.send(cmd);
  console.log('Keys:');
  for (const obj of response.Contents || []) {
      console.log(`- ${obj.Key} (${(obj.Size/1024/1024).toFixed(2)} MB)`);
  }
}

run().catch(console.error);
