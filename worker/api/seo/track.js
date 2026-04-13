export async function handleTrackSEO(request, env) {
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const url = new URL(request.url);
        // Assuming path is /api/seo/track/:id
        const pathParts = url.pathname.split('/');
        const trackId = pathParts[pathParts.length - 1];

        if (!trackId) {
            return new Response('Track ID is required', { status: 400 });
        }

        const track = await env.DB.prepare(
            `SELECT title, key, bpm, file_size FROM pool_tracks WHERE id = ?`
        ).bind(trackId).first();

        if (!track) {
            return new Response('Track Not Found', { status: 404 });
        }

        const siteUrl = 'https://djflowerz.co.ke';
        const trackUrl = `${siteUrl}/track/${trackId}`;
        const title = `${track.title} - DJ Flowerz Music Pool`;
        
        // Enhance SEO description
        const bpmText = track.bpm ? `${track.bpm} BPM` : '';
        const keyText = track.key ? `Key: ${track.key}` : '';
        const sizeText = track.file_size ? `${(track.file_size / (1024 * 1024)).toFixed(2)} MB` : '';
        
        const description = `Download ${track.title} inside the DJ Flowerz Premium Music Pool. High-quality track for professional DJs. ${bpmText} ${keyText} ${sizeText}`.trim();
        
        // General fallback image, or we could use the album art if the table had it
        const imageUrl = `https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/seo_banner_fallback.jpg`; // We'll assume this exists or use a generic one

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="music.song">
    <meta property="og:url" content="${trackUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${trackUrl}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="${imageUrl}">

    <!-- Music specific OG tags -->
    <meta property="music:duration" content="0">
</head>
<body>
    <h1>${track.title}</h1>
    <p>${description}</p>
    <p>Please visit <a href="${siteUrl}/music-pool">our Music Pool</a> to preview and download.</p>
</body>
</html>`;

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'Cache-Control': 'public, max-age=86400' // cache for 24 hours
            }
        });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
}
