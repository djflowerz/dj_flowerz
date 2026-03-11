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
                `SELECT * FROM mixtapes ORDER BY created_at DESC LIMIT 200`
            ).all();
            return Response.json(results || []);
        }

        if (method === 'POST') {
            const body = await request.json();
            const {
                id, title, artist, description, genre, coverUrl,
                audioUrl, duration, trackCount, featured, isFree,
                downloadEnabled, releaseDate
            } = body;

            const mixtapeId = id || crypto.randomUUID();
            const now = new Date().toISOString();

            await env.DB.prepare(
                `INSERT INTO mixtapes (id, title, artist, description, genre, cover_url,
                 audio_url, duration, track_count, featured, is_free, download_enabled,
                 release_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                   title=excluded.title, artist=excluded.artist,
                   description=excluded.description, genre=excluded.genre,
                   cover_url=excluded.cover_url, audio_url=excluded.audio_url,
                   duration=excluded.duration, track_count=excluded.track_count,
                   featured=excluded.featured, is_free=excluded.is_free,
                   download_enabled=excluded.download_enabled,
                   release_date=excluded.release_date, updated_at=excluded.updated_at`
            ).bind(
                mixtapeId, title, artist || 'DJ Flowerz', description || '',
                genre || 'Afrobeat', coverUrl || '', audioUrl || '',
                duration || '', trackCount || 0,
                featured ? 1 : 0, isFree ? 1 : 0, downloadEnabled ? 1 : 0,
                releaseDate || now, now, now
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
                title: 'title', artist: 'artist', description: 'description',
                genre: 'genre', coverUrl: 'cover_url', audioUrl: 'audio_url',
                duration: 'duration', trackCount: 'track_count',
                featured: 'featured', isFree: 'is_free',
                downloadEnabled: 'download_enabled', releaseDate: 'release_date'
            };

            for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
                if (body[jsKey] !== undefined) {
                    fields.push(`${dbCol} = ?`);
                    // Convert booleans to integers for SQLite
                    if (typeof body[jsKey] === 'boolean') {
                        values.push(body[jsKey] ? 1 : 0);
                    } else {
                        values.push(body[jsKey]);
                    }
                }
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
