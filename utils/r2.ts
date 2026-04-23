import { supabase } from './supabase';
import { Track, Genre } from '../types';

/**
 * Utility for fetching and syncing data from Cloudflare R2 via Workers
 */
export const STORAGE_WORKER_URL = (import.meta.env.VITE_STORAGE_WORKER_URL || '').trim();
export const REMIX_WORKER_URL = STORAGE_WORKER_URL; 
const VITE_R2_URL = (import.meta.env.VITE_R2_URL || STORAGE_WORKER_URL).trim();

export async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

export async function fetchFromR2<T>(collection: string): Promise<T[]> {
    const legacyDomain = 'pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev';
    const R2_URL = (import.meta.env.VITE_R2_URL || '').trim();
    let directUrl = '';
    
    // 1. Primary Source: Prefer Custom R2 URL if provided and not legacy
    if (R2_URL && !R2_URL.includes(legacyDomain)) {
        directUrl = `${R2_URL}/data/${collection}.json?t=${Date.now()}`;
        console.log(`[R2] Fetching ${collection} from custom URL: ${directUrl}`);
        try {
            const response = await fetch(directUrl);
            if (response.ok) return await response.json();
        } catch (e) {}
    }

    // Default or Legacy direct URL
    if (!directUrl) {
        directUrl = `https://${legacyDomain}/data/${collection}.json?t=${Date.now()}`;
    }

    console.log(`[R2] Fetching ${collection} from: ${directUrl}`);

    try {
        const response = await fetch(directUrl);
        if (response.ok) {
            const data = await response.json();
            console.log(`[R2] Successfully fetched ${collection} (${Array.isArray(data) ? data.length : 'unknown'} items)`);
            return Array.isArray(data) ? data : [];
        }
        console.warn(`[R2] Direct fetch failed for ${collection} (${response.status}), falling back to Worker...`);
    } catch (error) {
        console.warn(`[R2] Direct fetch error for ${collection}, falling back to Worker...`);
    }

    // 2. Fallback: Cloudflare Worker Proxy (May be rate-limited or 429'd)
    try {
        const url = `${STORAGE_WORKER_URL}/api/data/${collection}.json?t=${Date.now()}`;
        console.log(`[R2 Fallback] Fetching ${collection} from: ${url}`);
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
        console.log(`[R2 Fallback] Successfully fetched ${collection} (${Array.isArray(data) ? data.length : 'unknown'} items)`);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(`[Worker] Fetch exception for ${collection}:`, error);
        return [];
    }
}

export async function saveToR2(collection: string, data: any): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const key = `data/${collection}.json`;
    console.log(`[R2] Saving ${collection} to: ${STORAGE_WORKER_URL}/api/admin/r2-sync`, { key });
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ collection, key, action: 'save', data }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error(`[R2] Save failed for ${collection}:`, err);
        throw new Error(`R2 Sync Error: ${resStatus(response.status)} - ${err}`);
    }
    console.log(`[R2] Successfully saved ${collection}`);
    return true;
}

function resStatus(status: number) { return status; }

export async function addR2Item(collection: string, item: any): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const key = `data/${collection}.json`;
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
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
 * Execute D1 queries via the worker endpoints.
 */
export async function saveToD1(collection: string, method: 'POST' | 'PUT' | 'DELETE' | 'PATCH', data?: any, id?: string): Promise<boolean> {
    try {
        const authHeader = await getAuthHeader();

        // Most write operations go to /api/admin, but user interactions/wishlist go to /api/ (no admin prefix)
        const isAdminPath = !['interactions', 'wishlist', 'user/wishlist', 'user_preferences'].includes(collection);
        const basePath = isAdminPath ? '/api/admin' : '/api';

        const endpoint = id ? `${STORAGE_WORKER_URL}${basePath}/${collection}/${id}` : `${STORAGE_WORKER_URL}${basePath}/${collection}`;

        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`[D1] ${method} failed for ${collection} at ${endpoint}:`, err);
            return false;
        }
        return true;
    } catch (e) {
        console.error(`[D1] Exception on ${method} ${collection}:`, e);
        return false;
    }
}

/**
 * Upload a file to R2 via the API proxy
 */
export async function uploadFileToR2(file: File, folder: string = 'uploads'): Promise<{ url: string; key: string } | null> {
    const authHeader = await getAuthHeader();
    const uploadUrl = `${STORAGE_WORKER_URL}/api/upload`;
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
    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/r2-sync`, {
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

export async function fetchPoolTracks(): Promise<{ tracks: any[]; isAuthorized: boolean; downloadLimit?: number; downloadsCount?: number }> {
    const authHeader = await getAuthHeader();
    const url = `${STORAGE_WORKER_URL}/api/pool/tracks`;

    try {
        console.log(`[R2] Gated fetch for pool tracks: ${url}`);
        const response = await fetch(url, { headers: authHeader });

        if (response.status === 403) {
            console.warn("[R2] Access Denied for Music Pool");
            return { tracks: [], isAuthorized: false };
        }

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Pool fetch failed: ${err}`);
        }

        const data = await response.json();
        return {
            tracks: data.tracks || [],
            isAuthorized: true,
            downloadLimit: data.downloadLimit,
            downloadsCount: data.downloadsCount
        };
    } catch (error) {
        console.error("[R2] Pool fetch error:", error);
        return { tracks: [], isAuthorized: false };
    }
}

export async function trackPoolDownload(trackId: string): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const url = `${STORAGE_WORKER_URL}/api/pool/download`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ trackId })
        });
        return response.ok;
    } catch (error) {
        console.error("[R2] Track download error:", error);
        return false;
    }
}

export async function fetchPoolFilters(): Promise<{ genres: string[]; years: string[]; months: string[] }> {
    try {
        const url = `${STORAGE_WORKER_URL}/api/musicpool/filters`;
        const response = await fetch(url);
        if (!response.ok) return { genres: [], years: [], months: [] };
        return await response.json();
    } catch (error) {
        console.error("[R2] Filter fetch error:", error);
        return { genres: [], years: [], months: [] };
    }
}

export async function syncPoolTrackToD1(track: Track): Promise<boolean> {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/pool/sync-track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(track),
        });
        return response.ok;
    } catch (e) {
        console.error("[R2] Sync to D1 error:", e);
        return false;
    }
}

export async function deletePoolTrackFromD1(id: string): Promise<boolean> {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/pool/track?id=${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...authHeader },
        });
        return response.ok;
    } catch (e) {
        console.error("[R2] Delete from D1 error:", e);
        return false;
    }
}

export async function syncGenresToD1(genres: Genre[]): Promise<boolean> {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/pool/sync-genres`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ genres }),
        });
        return response.ok;
    } catch (e) {
        console.error("[R2] Sync genres to D1 error:", e);
        return false;
    }
}
