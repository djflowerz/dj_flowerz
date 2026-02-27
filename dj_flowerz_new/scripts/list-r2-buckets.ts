
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

async function test() {
    console.log("Listing R2 buckets...");
    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID!,
            secretAccessKey: R2_SECRET_ACCESS_KEY!,
        },
    });

    try {
        const response = await s3.send(new ListBucketsCommand({}));
        console.log("✅ Success! Buckets found:");
        response.Buckets?.forEach(b => console.log(` - ${b.Name}`));
    } catch (error: any) {
        console.error("❌ Error listing buckets:", error.message);
    }
}

test();
