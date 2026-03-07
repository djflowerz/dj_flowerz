export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
        const { action, key: providedKey, collection, data, bucket } = req.body;
        const key = providedKey || (collection ? `data/${collection}.json` : null);

        if (!action || !key) {
            return res.status(400).json({ error: 'Missing action, key, or collection' });
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
        } else if (['add', 'update', 'delete'].includes(action)) {
            // Read existing data first to perform partial updates on R2 JSON files
            let existingData = [];
            try {
                const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
                const response = await s3.send(getCmd);
                const str = await response.Body?.transformToString();
                if (str) existingData = JSON.parse(str);
            } catch (e) {
                console.warn(`[R2 Sync] Could not read existing data for ${key}, starting fresh.`);
            }

            const { item, id, items, ids } = req.body;
            if (action === 'add' && item) {
                existingData.unshift(item);
            } else if (action === 'addBatch' && Array.isArray(items)) {
                existingData = [...items, ...existingData];
            } else if (action === 'update' && item && id) {
                const idx = existingData.findIndex(i => i.id === id);
                if (idx !== -1) existingData[idx] = { ...existingData[idx], ...item };
                else existingData.unshift({ ...item, id });
            } else if (action === 'delete' && id) {
                existingData = existingData.filter(i => i.id !== id);
            } else if (action === 'deleteBatch' && Array.isArray(ids)) {
                const idSet = new Set(ids);
                existingData = existingData.filter(i => !idSet.has(i.id));
            }

            // Deduplicate
            const seenIds = new Set();
            existingData = existingData.filter(i => {
                if (!i.id) return true;
                if (seenIds.has(i.id)) return false;
                seenIds.add(i.id);
                return true;
            });

            const putCmd = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: JSON.stringify(existingData),
                ContentType: 'application/json'
            });
            await s3.send(putCmd);
            return res.status(200).json({ success: true, message: `Synced ${action} to R2` });
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('R2 Sync Error:', error);
        return res.status(500).json({ error: 'R2 Sync Failed', details: error.message });
    }
}
