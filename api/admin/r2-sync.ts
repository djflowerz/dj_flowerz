import { verifyAdmin, s3 } from "../../utils/server-r2";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// R2 Credentials
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'djflowerz-images';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let user;
    try {
        user = await verifyAdmin(req);
    } catch (err: any) {
        return res.status(err.message.includes('Forbidden') ? 403 : 401).json({ error: err.message });
    }

    // --- END SECURITY LAYER ---

    const { collection, data, action, item, id, items, ids } = req.body;

    if (!collection) {
        return res.status(400).json({ error: 'Missing collection' });
    }

    try {
        const key = `data/${collection}.json`;

        if (action) {
            let existingData: any[] = [];
            try {
                const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
                const response = await s3.send(getCmd);
                const str = await response.Body?.transformToString();
                if (str) existingData = JSON.parse(str);
            } catch (err: any) {
                if (err.name !== 'NoSuchKey') throw err;
            }

            if (action === 'add' && item) {
                // Add to beginning
                existingData.unshift(item);
            } else if (action === 'addBatch' && Array.isArray(items)) {
                // Prepend batch
                existingData = [...items, ...existingData];
            } else if (action === 'deleteBatch' && Array.isArray(ids)) {
                // Remove multiple items at once
                const idSet = new Set(ids);
                existingData = existingData.filter((i: any) => !idSet.has(i.id));
            } else if (action === 'update' && item && id) {
                const idx = existingData.findIndex((i: any) => i.id === id);
                if (idx !== -1) existingData[idx] = { ...existingData[idx], ...item };
                else existingData.unshift({ ...item, id });
            } else if (action === 'delete' && id) {
                existingData = existingData.filter((i: any) => i.id !== id);
            }

            // --- Deduplication Step (Critical for data integrity) ---
            const seenIds = new Set();
            existingData = existingData.filter((i: any) => {
                if (!i.id) return true;
                if (seenIds.has(i.id)) return false;
                seenIds.add(i.id);
                return true;
            });

            const jsonString = JSON.stringify(existingData);
            console.log(`Writing ${existingData.length} items to ${collection} [Size: ${Math.round(jsonString.length / 1024)} KB]`);

            const putCmd = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: jsonString,
                ContentType: 'application/json'
            });
            await s3.send(putCmd);
            return res.status(200).json({ success: true, message: `Synced ${collection} via ${action}` });
        } else if (data) {
            // Full replace
            console.log(`Fully replacing ${collection} with ${data.length} items [Size: ${Math.round(JSON.stringify(data).length / 1024)} KB]`);
            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: JSON.stringify(data), // No indentation
                ContentType: "application/json",
            });
            await s3.send(command);
            return res.status(200).json({ success: true, message: `Replaced ${collection} to R2` });
        }

        return res.status(400).json({ error: 'Must provide data or action' });
    } catch (error: any) {
        console.error('R2 Sync Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
