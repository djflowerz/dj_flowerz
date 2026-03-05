import { supabase } from './supabase';

/**
 * Utility for fetching and syncing data from Cloudflare R2 via Workers
 */
const STORAGE_WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
const VITE_R2_URL = import.meta.env.VITE_R2_URL || STORAGE_WORKER_URL;

async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

export async function fetchFromR2<T>(collection: string): Promise<T[]> {
    try {
        const url = `${VITE_R2_URL}/data/${collection}.json?t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`R2 fetch not ok for ${collection}:`, response.status);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch ${collection} from R2:`, error);
        return [];
    }
}

export async function saveToR2(collection: string, data: any): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, data }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`R2 Sync Error: ${resStatus(response.status)} - ${err}`);
    }
    return true;
}

function resStatus(status: number) { return status; }

export async function addR2Item(collection: string, item: any): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, action: 'add', item }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`R2 Add Error: ${err}`);
    }
    return true;
}

export async function updateR2Item(collection: string, id: string, item: any): Promise<boolean> {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ collection, action: 'update', id, item }),
        });
        return response.ok;
    } catch (e) { return false; }
}

export async function removeR2Item(collection: string, id: string): Promise<boolean> {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ collection, action: 'delete', id }),
        });
        return response.ok;
    } catch (e) { return false; }
}


/**
 * Upload a file to R2 via the API proxy
 */
export async function uploadFileToR2(file: File, folder: string = 'uploads'): Promise<{ url: string; key: string } | null> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-upload`, {
        method: 'POST',
        headers: {
            'x-file-name': encodeURIComponent(file.name),
            'x-folder': folder,
            'content-type': file.type,
            ...authHeader
        },
        body: file,
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`Upload failed (${response.status}): ${errText}`);
    }

    const result = await response.json();
    return { url: result.url, key: result.key };
}


export async function addBatchR2Items(collection: string, items: any[]): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, action: 'addBatch', items }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`R2 AddBatch Error: ${err}`);
    }
    return true;
}

export async function removeBatchR2Items(collection: string, ids: string[]): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, action: 'deleteBatch', ids }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`R2 Sync Error: ${resStatus(response.status)} - ${err}`);
    }
    return true;
}
