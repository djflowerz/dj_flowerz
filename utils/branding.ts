/**
 * Utility to mask backend media URLs with the branded proxy path.
 * This ensures that absolute legacy URLs are never shown in the "Inspect Element" view.
 */
export function maskMediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    
    // If it's already a relative path or our branded proxy, return as is
    if (url.startsWith('/') || url.startsWith('./')) {
        return url;
    }

    const lowerUrl = url.toLowerCase();
    let maskedUrl = url;

    // 1. Handle Remix & Mashups Worker
    if (lowerUrl.includes('remix-and-mashups-worker') || lowerUrl.includes('dennismacharia20')) {
        const parts = url.split('.dev/');
        const path = parts[1] || '';
        maskedUrl = `/api/files/${path}${path.includes('?') ? '&' : '?'}origin=remix`;
    }
    // 2. Handle Vicknick domains (CDN or R2)
    else if (lowerUrl.includes('vicknickvideopool.com')) {
        // Handle both r2.vicknickvideopool.com and cdn.vicknickvideopool.com
        const parts = url.split('.com/');
        const path = parts[1] || '';
        maskedUrl = `/api/files/${path}`;
    }

    // Ensure no double slashes at the start and clean up common prefixes
    return maskedUrl
        .replace(/^\/\/api\/files\//, '/api/files/')
        .replace(/^https?:\/\/djflowerz\.co\.ke\/api\/files\//, '/api/files/');
}
