
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// R2 Credentials
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
