const { S3Client, ListObjectsV2Command, ListBucketsCommand } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

async function run() {
    try {
        console.log(`Listing buckets...`);
        const command = new ListBucketsCommand({});
        const response = await s3.send(command);
        if (response.Buckets) {
            for (const b of response.Buckets) {
                console.log(b.Name);
            }
        } else {
            console.log('No buckets found.');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
run();
