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
            // List all mixtapes - using actual schema columns
            const { results } = await env.DB.prepare(
                `SELECT 
                    id, title, slug, artist, description, genre, status,
                    cover_url AS coverUrl, cover_image AS coverImage,
                    audio_url AS audioUrl, video_url AS videoUrl,
                    download_url AS downloadUrl, video_download_url AS videoDownloadUrl,
                    duration, release_date AS releaseDate,
                    tracklist, tags,
                    is_featured AS isFeatured,
                    show_in_gallery AS showInGallery,
                    show_in_music_pool AS showInMusicPool,
                    is_exclusive AS isExclusive,
                    allow_full_stream AS allowFullStream,
                    allow_download AS allowDownload,
                    download_type AS downloadType,
                    stream_quality AS streamQuality,
                    download_limit AS downloadLimit,
                    download_expiry_days AS downloadExpiryDays,
                    youtube_url AS youtubeUrl,
                    soundcloud_url AS soundcloudUrl,
                    enable_comments AS enableComments,
                    require_login_to_comment AS requireLoginToComment,
                    moderate_comments AS moderateComments,
                    play_count AS playCount,
                    download_count AS downloadCount,
                    updated_at AS updatedAt, created_at AS createdAt
                FROM mixtapes 
                ORDER BY created_at DESC 
                LIMIT 200`
            ).all();
            
            // Parse JSON fields
            const formattedResults = (results || []).map(m => ({
                ...m,
                tracklist: m.tracklist ? (() => { try { return JSON.parse(m.tracklist); } catch { return []; } })() : [],
                tags: m.tags ? (() => { try { return JSON.parse(m.tags); } catch { return typeof m.tags === 'string' ? m.tags.split(',').map(t => t.trim()) : []; } })() : []
            }));

            return Response.json(formattedResults);
        }

        if (method === 'POST') {
            const body = await request.json();
            const {
                id, title, slug, artist, description, genre, coverUrl, coverImage,
                audioUrl, videoUrl, downloadUrl, videoDownloadUrl,
                duration, releaseDate, status,
                tracklist, tags, isFeatured, showInGallery, showInMusicPool,
                isExclusive, allowFullStream, allowDownload, downloadType,
                streamQuality, downloadLimit, downloadExpiryDays,
                youtubeUrl, soundcloudUrl,
                enableComments, requireLoginToComment, moderateComments
            } = body;

            const mixtapeId = id || `m${Date.now()}`;
            const now = new Date().toISOString();
            const titleSlug = slug || (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

            await env.DB.prepare(
                `INSERT INTO mixtapes (
                    id, title, slug, artist, description, genre, status,
                    cover_url, cover_image, audio_url, video_url,
                    download_url, video_download_url,
                    duration, release_date,
                    tracklist, tags,
                    is_featured, show_in_gallery, show_in_music_pool, is_exclusive,
                    allow_full_stream, allow_download, download_type, stream_quality,
                    download_limit, download_expiry_days,
                    youtube_url, soundcloud_url,
                    enable_comments, require_login_to_comment, moderate_comments,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?
                )`
            ).bind(
                mixtapeId, title || '', titleSlug, artist || '', description || '', genre || '', status || 'published',
                coverUrl || coverImage || '', coverImage || coverUrl || '',
                audioUrl || '', videoUrl || '',
                downloadUrl || '', videoDownloadUrl || '',
                duration || '', releaseDate || now,
                tracklist ? JSON.stringify(tracklist) : '[]',
                tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : '[]',
                isFeatured ? 1 : 0, showInGallery !== false ? 1 : 0, showInMusicPool ? 1 : 0, isExclusive ? 1 : 0,
                allowFullStream !== false ? 1 : 0, allowDownload !== false ? 1 : 0, downloadType || 'free', streamQuality || 'high',
                downloadLimit || null, downloadExpiryDays || null,
                youtubeUrl || '', soundcloudUrl || '',
                enableComments !== false ? 1 : 0, requireLoginToComment ? 1 : 0, moderateComments ? 1 : 0,
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
                title: 'title',
                slug: 'slug',
                artist: 'artist',
                description: 'description',
                genre: 'genre',
                status: 'status',
                coverUrl: 'cover_url',
                coverImage: 'cover_image',
                audioUrl: 'audio_url',
                videoUrl: 'video_url',
                downloadUrl: 'download_url',
                videoDownloadUrl: 'video_download_url',
                duration: 'duration',
                releaseDate: 'release_date',
                isFeatured: 'is_featured',
                showInGallery: 'show_in_gallery',
                showInMusicPool: 'show_in_music_pool',
                isExclusive: 'is_exclusive',
                allowFullStream: 'allow_full_stream',
                allowDownload: 'allow_download',
                downloadType: 'download_type',
                streamQuality: 'stream_quality',
                downloadLimit: 'download_limit',
                downloadExpiryDays: 'download_expiry_days',
                youtubeUrl: 'youtube_url',
                soundcloudUrl: 'soundcloud_url',
                enableComments: 'enable_comments',
                requireLoginToComment: 'require_login_to_comment',
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

            // Handle JSON fields separately
            if (body.tracklist !== undefined) {
                fields.push('tracklist = ?');
                values.push(JSON.stringify(body.tracklist));
            }
            if (body.tags !== undefined) {
                fields.push('tags = ?');
                values.push(JSON.stringify(Array.isArray(body.tags) ? body.tags : []));
            }

            if (fields.length === 0) {
                return Response.json({ success: true, message: 'No fields to update' });
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
