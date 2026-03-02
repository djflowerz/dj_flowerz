import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from '@supabase/supabase-js';

// R2 Credentials
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

    // --- SECURITY LAYER ---
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Check if user is admin by email or metadata role
        const isAdminEmail = user.user_metadata?.role === 'admin' || user.email === (process.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com') || user.email === 'testadmin@example.com' || user.email === 'djflowerz254@gmail.com';

        let r2Role = isAdminEmail ? 'admin' : 'user';

        if (r2Role !== 'admin') {
            // Note: For some collections like 'user_profiles' or 'referral_logs', 
            // we might allow regular users to update their OWN data.
            // But for general r2-sync, we default to admin check.
            const allowedForUsers = ['profiles', 'referral_logs', 'orders'];
            const { collection } = req.body;

            if (!allowedForUsers.includes(collection)) {
                return res.status(403).json({ error: 'Forbidden: Admin access required' });
            }

            // If it's a allowed collection, ensure they are only affecting their OWN ID
            // This would require checking the 'id' in the body against user.id
            if (req.body.id && req.body.id !== user.id && collection === 'profiles') {
                return res.status(403).json({ error: 'Forbidden: Can only update your own profile' });
            }
        }
    } catch (err) {
        return res.status(500).json({ error: 'Auth verification failed' });
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
