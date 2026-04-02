// worker/api/dashboard/mixtapes.js

export async function handleDashboardMixtapes(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // Verify admin authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        if (method === 'GET') {
            // List all mixtapes
            const { results } = await env.DB.prepare(
                `SELECT 
                    id, title, slug, artist, description, genre, 
                    cover_url AS coverUrl, audio_url AS audioUrl, video_url AS videoUrl, 
                    duration, release_date AS releaseDate, status, 
                    tracklist, tags, is_featured AS isFeatured, 
                    show_in_gallery AS showInGallery, show_in_music_pool AS showInMusicPool, 
                    is_exclusive AS isExclusive, updated_at, created_at
                FROM mixtapes 
                ORDER BY created_at DESC 
                LIMIT 200`
            ).all();
            
            // Parse JSON fields
            const formattedResults = (results || []).map(m => ({
                ...m,
                tracklist: m.tracklist ? JSON.parse(m.tracklist) : [],
                tags: m.tags ? JSON.parse(m.tags) : []
            }));

            return Response.json(formattedResults);
        }

        if (method === 'POST') {
            const body = await request.json();
            const {
                id, title, slug, artist, description, genre, coverUrl,
                audioUrl, videoUrl, duration, releaseDate, status,
                tracklist, tags, isFeatured, showInGallery, showInMusicPool,
                isExclusive, allowFullStream, allowDownload, downloadType,
                streamQuality, videoDownloadUrl, downloadLimit, downloadExpiryDays,
                youtubeUrl, soundcloudUrl, metaTitle, metaDescription, ogImage,
                enableComments, requireLoginToComment, moderateComments
            } = body;

            const mixtapeId = id || `m${Date.now()}`;
            const now = new Date().toISOString();

            await env.DB.prepare(
                `INSERT INTO mixtapes (
                    id, title, slug, artist, description, genre, cover_url,
                    audio_url, video_url, duration, release_date, status,
                    tracklist, tags, is_featured, show_in_gallery, show_in_music_pool,
                    is_exclusive, allow_full_stream, allow_download, download_type,
                    stream_quality, video_download_url, download_limit, download_expiry_days,
                    youtube_url, soundcloud_url, meta_title, meta_description, og_image,
                    enable_comments, require_login_to_comment, moderate_comments,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                mixtapeId, title, slug || title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                artist || 'DJ Flowerz', description || '', genre || '', coverUrl || '',
                audioUrl || '', videoUrl || '', duration || '', releaseDate || now, status || 'draft',
                tracklist ? JSON.stringify(tracklist) : '[]',
                tags ? JSON.stringify(tags) : '[]',
                isFeatured ? 1 : 0, showInGallery ? 1 : 0, showInMusicPool ? 1 : 0,
                isExclusive ? 1 : 0, allowFullStream ? 1 : 0, allowDownload ? 1 : 0, downloadType || 'free',
                streamQuality || 'high', videoDownloadUrl || '', downloadLimit || null, downloadExpiryDays || null,
                youtubeUrl || '', soundcloudUrl || '', metaTitle || '', metaDescription || '', ogImage || '',
                enableComments ? 1 : 0, requireLoginToComment ? 1 : 0, moderateComments ? 1 : 0,
                now, now
            ).run();

            return Response.json({ success: true, id: mixtapeId }, { status: 201 });
        }

        if (method === 'PUT') {
            const pathParts = url.pathname.split('/');
            const mixtapeId = pathParts[pathParts.length - 1];
            const body = await request.json();

            const fields = [];
            const values = [];
            
            const fieldMap = {
                title: 'title', slug: 'slug', artist: 'artist', description: 'description',
                genre: 'genre', coverUrl: 'cover_url', audioUrl: 'audio_url',
                videoUrl: 'video_url', duration: 'duration', releaseDate: 'release_date',
                status: 'status', isFeatured: 'is_featured', showInGallery: 'show_in_gallery',
                showInMusicPool: 'show_in_music_pool', isExclusive: 'is_exclusive',
                allowFullStream: 'allow_full_stream', allowDownload: 'allow_download',
                downloadType: 'download_type', streamQuality: 'stream_quality',
                videoDownloadUrl: 'video_download_url', downloadLimit: 'download_limit',
                downloadExpiryDays: 'download_expiry_days', youtubeUrl: 'youtube_url',
                soundcloudUrl: 'soundcloud_url', metaTitle: 'meta_title',
                metaDescription: 'meta_description', ogImage: 'og_image',
                enableComments: 'enable_comments', requireLoginToComment: 'require_login_to_comment',
                moderateComments: 'moderate_comments'
            };

            for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
                if (body[jsKey] !== undefined) {
                    fields.push(`${dbCol} = ?`);
                    if (typeof body[jsKey] === 'boolean') {
                        values.push(body[jsKey] ? 1 : 0);
                    } else {
                        values.push(body[jsKey]);
                    }
                }
            }

            if (body.tracklist !== undefined) {
                fields.push('tracklist = ?');
                values.push(JSON.stringify(body.tracklist));
            }
            if (body.tags !== undefined) {
                fields.push('tags = ?');
                values.push(JSON.stringify(body.tags));
            }

            fields.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(mixtapeId);

            await env.DB.prepare(
                `UPDATE mixtapes SET ${fields.join(', ')} WHERE id = ?`
            ).bind(...values).run();

            return Response.json({ success: true });
        }

        if (method === 'DELETE') {
            const pathParts = url.pathname.split('/');
            const mixtapeId = pathParts[pathParts.length - 1];

            await env.DB.prepare('DELETE FROM mixtapes WHERE id = ?').bind(mixtapeId).run();

            return Response.json({ success: true });
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('[Dashboard/Mixtapes] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
