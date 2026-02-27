
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

export const config = {
    api: {
        bodyParser: false,
    },
};

async function buffer(readable: any) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const contentType = req.headers['content-type'] || 'application/octet-stream';
        const fileName = req.headers['x-file-name'] || `upload_${Date.now()}`;
        const folder = req.headers['x-folder'] || 'uploads';

        const key = `${folder}/${fileName}`;
        const body = await buffer(req);

        console.log(`Uploading ${fileName} to R2 bucket ${R2_BUCKET_NAME} at ${key}...`);

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType,
        });

        await s3.send(command);

        const publicUrl = `${process.env.VITE_R2_URL || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev'}/${key}`;

        return res.status(200).json({
            success: true,
            url: publicUrl,
            key: key
        });
    } catch (error: any) {
        console.error('R2 Upload Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
