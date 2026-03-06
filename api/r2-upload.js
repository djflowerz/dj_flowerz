export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

        // Get metadata from headers (matches utils/r2.ts)
        const fileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : (req.body?.fileName);
        const fileType = req.headers['content-type'] || (req.body?.fileType);
        const folder = req.headers['x-folder'] || 'uploads';
        const bucket = req.body?.bucket;

        if (!fileName) {
            return res.status(400).json({ error: 'Missing fileName' });
        }

        // R2 Credentials (fallback to VITE_ names) - Trimmed to prevent header errors
        const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || process.env.VITE_STORAGE_ACCOUNT_ID || '').trim();
        const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || process.env.VITE_STORAGE_ACCESS_KEY || '').trim();
        const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_STORAGE_SECRET_KEY || '').trim();
        const R2_BUCKET_NAME = (bucket || process.env.R2_BUCKET_NAME || process.env.VITE_STORAGE_BUCKET || 'dj-flowerz').trim();

        const s3 = new S3Client({
            region: "auto",
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });

        // Determine the key (path in R2)
        const key = fileName.startsWith(folder) ? fileName : `${folder}/${fileName}`;

        // Handle body
        let body;
        if (req.body && req.body.data) {
            body = Buffer.from(req.body.data.replace(/^data:.*;base64,/, ""), 'base64');
        } else {
            body = req.body;
        }

        const putCmd = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: fileType
        });

        await s3.send(putCmd);

        return res.status(200).json({
            success: true,
            url: `https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/${key}`,
            key: key
        });
    } catch (error) {
        console.error('R2 Upload Error:', error);
        return res.status(500).json({ error: 'R2 Upload Failed', details: error.message });
    }
}
