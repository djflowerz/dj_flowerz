
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// R2 Credentials from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Basic Auth Check - Admin only
    // In a real app, verify Supabase token here

    const { collection, data } = req.body;

    if (!collection || !data) {
        return res.status(400).json({ error: 'Missing collection or data' });
    }

    try {
        const key = `data/${collection}.json`;

        // Save to R2
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(data, null, 2),
            ContentType: "application/json",
        });

        await s3.send(command);

        return res.status(200).json({ success: true, message: `Synced ${collection} to R2` });
    } catch (error: any) {
        console.error('R2 Sync Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
