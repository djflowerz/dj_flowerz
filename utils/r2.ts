
/**
 * Utility for fetching data from Cloudflare R2 (Object Storage)
 * This replaces Supabase direct database calls for content data.
 */

const R2_URL = import.meta.env.VITE_R2_URL || 'https://pub-59a613f808794c48972e0d794770331f.r2.dev';

export async function fetchFromR2<T>(collection: string): Promise<T[]> {
    try {
        // We add a timestamp to bypass browser cache during development/admin updates
        const url = `${R2_URL}/data/${collection}.json?t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Collection ${collection} not found on R2. Falling back to empty array.`);
                return [];
            }
            throw new Error(`R2 Fetch Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch ${collection} from R2:`, error);
        return [];
    }
}

/**
 * For writing to R2, we use a Vercel API proxy since the frontend cannot 
 * write directly to R2 without exposing AWS keys.
 */
export async function saveToR2(collection: string, data: any): Promise<boolean> {
    try {
        const response = await fetch('/api/admin/r2-sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ collection, data }),
        });

        return response.ok;
    } catch (error) {
        console.error(`Failed to save ${collection} to R2 via API:`, error);
        return false;
    }
}
