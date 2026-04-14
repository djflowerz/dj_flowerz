import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';

/**
 * Migration handler to scrub "Vicknick" branding from the D1 database
 * and update all track URLs to use the worker's internal proxy.
 */
export async function handleBulkRebrand(request, env) {
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        console.log("[Migration] Starting bulk rebranding...");
        
        const timestamp = new Date().toISOString();
        const queries = [];

        // 1. Rebrand Track Metadata (Title, Artist, Genre, Hub)
        // We use sqlite's replace() for bulk efficiency
        const fields = ['title', 'artist', 'genre', 'collection_hub'];
        const brandRules = [
            { old: 'DJ Vicknick', new: 'DJ Flowerz' },
            { old: 'Vicknick', new: 'Flowerz' }
        ];

        for (const field of fields) {
            for (const rule of brandRules) {
                queries.push(env.DB.prepare(`
                    UPDATE tracks 
                    SET \${field} = REPLACE(\${field}, ?, ?), updated_at = ?
                    WHERE \${field} LIKE ?
                `).bind(rule.old, rule.new, timestamp, `%\${rule.old}%`));
            }
        }

        // 2. Update Track URLs (tracks table)
        // Convert https://cdn.vicknickvideopool.com/path -> /api/files/path
        queries.push(env.DB.prepare(`
            UPDATE tracks 
            SET audio_url = REPLACE(audio_url, 'https://cdn.vicknickvideopool.com/', '/api/files/'),
                download_url = REPLACE(download_url, 'https://cdn.vicknickvideopool.com/', '/api/files/'),
                updated_at = ?
            WHERE audio_url LIKE '%vicknickvideopool.com%' OR download_url LIKE '%vicknickvideopool.com%'
        `).bind(timestamp));

        // 3. Update Track Version URLs (track_versions table)
        // Handle both r2 and cdn domains
        const domains = ['https://r2.vicknickvideopool.com/', 'https://cdn.vicknickvideopool.com/'];
        for (const domain of domains) {
            queries.push(env.DB.prepare(`
                UPDATE track_versions 
                SET preview_url = REPLACE(preview_url, ?, '/api/files/'),
                    download_url = REPLACE(download_url, ?, '/api/files/'),
                    file_url = REPLACE(file_url, ?, '/api/files/')
                WHERE preview_url LIKE ? OR download_url LIKE ? OR file_url LIKE ?
            `).bind(domain, domain, domain, `%vicknickvideopool.com%`, `%vicknickvideopool.com%`, `%vicknickvideopool.com%`));
        }

        // Execute in batches
        if (queries.length > 0) {
            for (let i = 0; i < queries.length; i += 50) {
                await env.DB.batch(queries.slice(i, i + 50));
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Rebranding migration completed and track URLs updated to proxy." 
        }));
    } catch (e) {
        console.error("[Migration Error]", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
