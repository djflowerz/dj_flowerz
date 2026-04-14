
/**
 * Generates a rotating 8-character hash based on a secret and the current hour.
 * This makes static scraping of API endpoints impossible.
 */
export async function getShadowSalt(secret) {
    const encoder = new TextEncoder();
    // Use date up to the hour to rotate salts hourly
    const dateStr = new Date().toISOString().substring(0, 13); 
    const data = encoder.encode(secret + dateStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
}

/**
 * Wraps a route path with the current shadow salt.
 * Example: /api/pool/tracks -> /api/v1/sh-abcd1234/pool/tracks
 */
export async function wrapShadowPath(path, env) {
    if (!path.startsWith('/api/')) return path;
    const salt = await getShadowSalt(env.ENVIRONMENT_SECRET || 'djflowerz_stealth_default');
    const version = 'v1';
    const cleanPath = path.substring(5); // Remove /api/
    return `/api/${version}/sh-${salt}/${cleanPath}`;
}
