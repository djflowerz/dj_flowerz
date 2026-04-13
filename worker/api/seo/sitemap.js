export async function handleSitemap(request, env) {
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // Fetch public pool tracks (prioritize newer/popular tracks if we had views, for now just order by created_at)
        const { results: tracks } = await env.DB.prepare(
            `SELECT id, created_at FROM pool_tracks ORDER BY created_at DESC LIMIT 5000`
        ).all();

        const siteUrl = 'https://djflowerz.co.ke';
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Base static URLs
        xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        xml += `  <url>\n    <loc>${siteUrl}/music-pool</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        xml += `  <url>\n    <loc>${siteUrl}/store</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        
        // Add all dynamic tracks
        for (const track of tracks) {
            // Using /track/:id as the public URL
            xml += `  <url>\n`;
            xml += `    <loc>${siteUrl}/track/${track.id}</loc>\n`;
            if (track.created_at) {
                // Formatting ISO 8601 date, expecting created_at might be unix or string
                let dateStr = new Date().toISOString();
                try {
                    dateStr = new Date(track.created_at).toISOString();
                } catch(e){}
                xml += `    <lastmod>${dateStr}</lastmod>\n`;
            }
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.7</priority>\n`;
            xml += `  </url>\n`;
        }

        xml += `</urlset>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600' // cache for 1 hour
            }
        });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
}
