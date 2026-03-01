import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

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

export async function fetchFromR2Server<T>(collection: string): Promise<T[]> {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: `data/${collection}.json`
        });

        const response = await s3.send(command);
        const str = await response.Body?.transformToString();
        if (!str) return [];
        return JSON.parse(str);
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            return [];
        }
        console.error(`Failed to fetch ${collection} from R2 via Server:`, error);
        return [];
    }
}

export async function saveToR2Server(collection: string, data: any): Promise<boolean> {
    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: `data/${collection}.json`,
            Body: JSON.stringify(data, null, 2),
            ContentType: "application/json",
        });

        await s3.send(command);
        return true;
    } catch (error) {
        console.error(`Failed to save ${collection} to R2 via Server:`, error);
        return false;
    }
}

async function modifyR2ServerRecord(collection: string, action: 'add' | 'update' | 'delete', id?: string, item?: any) {
    let existingData: any[] = [];
    try {
        const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: `data/${collection}.json` });
        const response = await s3.send(getCmd);
        const str = await response.Body?.transformToString();
        if (str) existingData = JSON.parse(str);
    } catch (err: any) {
        if (err.name !== 'NoSuchKey') throw err;
    }

    if (action === 'add' && item) {
        existingData.unshift(item);
    } else if (action === 'update' && item && id) {
        const idx = existingData.findIndex((i: any) => i.id === id);
        if (idx !== -1) existingData[idx] = { ...existingData[idx], ...item };
        else existingData.unshift({ ...item, id });
    } else if (action === 'delete' && id) {
        existingData = existingData.filter((i: any) => i.id !== id);
    }

    await saveToR2Server(collection, existingData);
    return true;
}

export async function addR2ItemServer(collection: string, item: any): Promise<boolean> {
    return modifyR2ServerRecord(collection, 'add', undefined, item);
}

export async function updateR2ItemServer(collection: string, id: string, item: any): Promise<boolean> {
    return modifyR2ServerRecord(collection, 'update', id, item);
}

export async function removeR2ItemServer(collection: string, id: string): Promise<boolean> {
    return modifyR2ServerRecord(collection, 'delete', id);
}
