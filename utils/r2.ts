import { supabase } from './supabase';

/**
 * Utility for fetching and syncing data from Cloudflare R2 via Workers
 */
const STORAGE_WORKER_URL = (import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev').trim();
const VITE_R2_URL = (import.meta.env.VITE_R2_URL || STORAGE_WORKER_URL).trim();

async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

export async function fetchFromR2<T>(collection: string): Promise<T[]> {
    // 1. Primary Source: High-Reliability Public R2 CDN
    const PUBLIC_R2_URL = 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev';
    const R2_URL = (import.meta.env.VITE_R2_URL || PUBLIC_R2_URL).trim();
    const directUrl = `${R2_URL}/data/${collection}.json?t=${Date.now()}`;

    try {
        const response = await fetch(directUrl);
        if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        }
        console.warn(`[R2] Direct fetch failed for ${collection} (${response.status}), falling back to Worker...`);
    } catch (error) {
        console.warn(`[R2] Direct fetch error for ${collection}, falling back to Worker...`);
    }

    // 2. Fallback: Cloudflare Worker Proxy (May be rate-limited or 429'd)
    try {
        const url = `${STORAGE_WORKER_URL}/api/data/${collection}.json?t=${Date.now()}`;
        const response = await fetch(url);

        if (response.status === 429) {
            console.error(`[Worker] Rate limited (429) for ${collection}.`);
            return [];
        }

        if (!response.ok) {
            console.error(`[Worker] Fetch failed for ${collection} (${response.status}).`);
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(`[Worker] Fetch exception for ${collection}:`, error);
        return [];
    }
}

export async function saveToR2(collection: string, data: any): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const key = `data/${collection}.json`;
    const response = await fetch(`/api/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, key, data }),
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
    const key = `data/${collection}.json`;
    const response = await fetch(`/api/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, key, action: 'add', item }),
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
        const response = await fetch(`/api/r2-sync`, {
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
        const response = await fetch(`/api/r2-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ collection, action: 'delete', id }),
        });
        return response.ok;
    } catch (e) { return false; }
}

export async function addAdminNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', link?: string): Promise<boolean> {
    return addR2Item('notifications', {
        id: `admin_notif_${Date.now()}`,
        title,
        message,
        type,
        link,
        read: false,
        createdAt: new Date().toISOString()
    });
}


/**
 * Upload a file to R2 via the API proxy
 */
export async function uploadFileToR2(file: File, folder: string = 'uploads'): Promise<{ url: string; key: string } | null> {
    const authHeader = await getAuthHeader();
    const uploadUrl = `/api/r2-upload`;
    console.log(`[R2] Attempting upload to: ${uploadUrl}`, { folder, fileName: file.name, type: file.type });

    const response = await fetch(uploadUrl, {
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
        console.error(`[R2] Upload failed:`, { status: response.status, error: errText });
        throw new Error(`Upload failed (${response.status}): ${errText}`);
    }

    const result = await response.json();
    console.log(`[R2] Upload successful:`, result);
    return { url: result.url, key: result.key };
}


export async function addBatchR2Items(collection: string, items: any[]): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const key = `data/${collection}.json`;
    const response = await fetch(`/api/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, key, action: 'addBatch', items }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`R2 AddBatch Error: ${err}`);
    }
    return true;
}

export async function removeBatchR2Items(collection: string, ids: string[]): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`/api/r2-sync`, {
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
