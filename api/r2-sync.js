export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
        const { action, key, data, bucket } = req.body;

        if (!action || !key) {
            return res.status(400).json({ error: 'Missing action or key' });
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

        if (action === 'save') {
            const putCmd = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: JSON.stringify(data),
                ContentType: 'application/json'
            });
            await s3.send(putCmd);
            return res.status(200).json({ success: true });
        } else if (action === 'read') {
            const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
            const response = await s3.send(getCmd);
            const str = await response.Body?.transformToString();
            return res.status(200).json({ success: true, data: str ? JSON.parse(str) : null });
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('R2 Sync Error:', error);
        return res.status(500).json({ error: 'R2 Sync Failed', details: error.message });
    }
}
