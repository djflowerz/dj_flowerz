
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from '@supabase/supabase-js';

// R2 Credentials
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

export const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

/**
 * Verifies if the request is from an authorized admin.
 * Checks: hardcoded emails, metadata role, and R2 profiles.json.
 */
export async function verifyAdmin(req: any) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new Error('Missing token');

    const token = authHeader.split(' ')[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    const adminEmails = [
        (process.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com').toLowerCase(),
        'djflowerz254@gmail.com',
        'testadmin@example.com'
    ];

    const isHardcodedAdmin = user.user_metadata?.role === 'admin' ||
        (user.email && adminEmails.includes(user.email.toLowerCase()));

    if (isHardcodedAdmin) return user;

    // Fallback: Check profiles.json in R2
    try {
        const profiles = await getR2Collection<any>('profiles');
        const profile = profiles.find((p: any) => p.id === user.id);
        if (profile?.role === 'admin') return user;
    } catch (err) {
        console.error("verifyAdmin: Error checking profiles in R2", err);
    }

    throw new Error('Forbidden: Admin access required');
}

export async function getR2Collection<T>(collection: string): Promise<T[]> {
    const key = `data/${collection}.json`;
    try {
        const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
        const response = await s3.send(getCmd);
        const str = await response.Body?.transformToString();
        if (str) return JSON.parse(str);
        return [];
    } catch (err: any) {
        if (err.name === 'NoSuchKey') return [];
        throw err;
    }
}

export async function saveR2Collection<T extends { id?: string | number }>(collection: string, data: T[]): Promise<void> {
    const key = `data/${collection}.json`;

    // Deduplication
    const seenIds = new Set();
    const uniqueData = data.filter(item => {
        if (!item.id) return true;
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
    });

    const putCmd = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(uniqueData),
        ContentType: 'application/json'
    });
    await s3.send(putCmd);
}

export async function updateR2Item<T extends { id: string | number } & Record<string, any>>(collection: string, id: string | number, updates: Partial<T>): Promise<void> {
    const data = await getR2Collection<T>(collection);
    const idx = data.findIndex(i => i.id === id);
    if (idx !== -1) {
        data[idx] = { ...data[idx], ...updates };
    } else {
        // If not found, add as new (upsert behavior)
        data.unshift({ ...updates, id } as T);
    }
    await saveR2Collection(collection, data);
}

export async function addR2Item<T extends { id?: string | number } & Record<string, any>>(collection: string, item: T): Promise<void> {
    const data = await getR2Collection<T>(collection);
    data.unshift(item);
    await saveR2Collection(collection, data);
}


export async function deleteR2Item(collection: string, id: string | number): Promise<void> {
    const data = await getR2Collection<any>(collection);
    const filtered = data.filter(i => i.id !== id);
    await saveR2Collection(collection, filtered);
}

export async function addAdminNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' | 'product' | 'mixtape' | 'promotion' | 'subscription' = 'info', link?: string) {
    const notification = {
        id: `ntf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId: 'admin', // Marker for admin notifications
        title,
        message,
        type,
        link,
        read: false,
        created_at: new Date().toISOString()
    };
    await addR2Item('notifications', notification);
}

