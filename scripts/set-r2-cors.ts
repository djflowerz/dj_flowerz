
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function setCors() {
    console.log(`Setting CORS for bucket: ${R2_BUCKET_NAME}...`);
    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID!,
            secretAccessKey: R2_SECRET_ACCESS_KEY!,
        },
    });

    try {
        const command = new PutBucketCorsCommand({
            Bucket: R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedOrigins: ["*"],
                        AllowedMethods: ["GET", "HEAD", "OPTIONS"],
                        AllowedHeaders: ["*"],
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        });

        await s3.send(command);
        console.log("✅ CORS Policy set successfully via S3 API!");
    } catch (error: any) {
        console.error("❌ Error setting CORS:", error.message);
    }
}

setCors();
