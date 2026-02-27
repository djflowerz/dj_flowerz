
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = "ca961f0eb41ca2bf77291b1769ca1c1d";
const R2_ACCESS_KEY_ID = "4edededb28b4666323bf7a763ab391d1";
const R2_SECRET_ACCESS_KEY = "5d2ce9467a45d362df943ea8e0c5afd0857c2be36524c97d4026f1bd570f3a22";

async function test() {
    console.log("Testing R2 credentials...");
    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });

    try {
        const response = await s3.send(new ListBucketsCommand({}));
        console.log("✅ Credentials valid!");
        console.log("Buckets:", response.Buckets?.map(b => b.Name));
    } catch (error: any) {
        console.error("❌ Credentials invalid:", error.message);
    }
}

test();
