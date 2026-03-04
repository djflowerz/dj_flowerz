
import { supabase } from './supabase';

/**
 * Cloudflare Worker Service (BFF)
 * Unified interface for D1, R2, and KV
 */
const STORAGE_WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://remix-and-mashups-worker.dennismacharia20.workers.dev';

async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

// --- 1. D1 (Relational Data: Products, Mixtapes, Profiles, Orders) ---

export async function fetchFromD1<T>(collection: string): Promise<T[]> {
    try {
        const response = await fetch(`${STORAGE_WORKER_URL}/api/${collection}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error(`D1 Fetch Error [${collection}]:`, error);
        return [];
    }
}

export async function saveToD1(collection: string, data: any): Promise<boolean> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${STORAGE_WORKER_URL}/api/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(data),
    });
    return response.ok;
}

// --- 2. R2 (Large Static Data & Blobs: Pool Tracks, Images) ---

export async function fetchFromR2<T>(collection: string): Promise<T[]> {
    try {
        const url = `${STORAGE_WORKER_URL}/data/${collection}.json?t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error(`R2 Fetch Error [${collection}]:`, error);
        return [];
    }
}

export async function uploadToR2(file: File, folder: string = 'uploads'): Promise<{ url: string; key: string } | null> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${STORAGE_WORKER_URL}/api/upload/${folder}/${file.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, ...authHeader },
        body: file,
    });
    if (!response.ok) return null;
    return await response.json();
}

// --- 3. KV (Quick Config, A/B Test Defaults, Sessions) ---

export async function fetchFromKV<T>(key: string): Promise<T | null> {
    try {
        const response = await fetch(`${STORAGE_WORKER_URL}/api/config?key=${key}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
}

// --- 4. Vectorize (AI Search) ---

export async function searchAI(query: string): Promise<any[]> {
    try {
        const response = await fetch(`${STORAGE_WORKER_URL}/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) return [];
        const result = await response.json();
        return result.matches || [];
    } catch (error) {
        return [];
    }
}
