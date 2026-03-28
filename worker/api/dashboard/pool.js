// worker/api/dashboard/pool.js
import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';

export async function handleSyncTrack(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const track = await request.json();
        if (!track || !track.id) {
            return new Response(JSON.stringify({ error: "Invalid track data" }), { status: 400 });
        }

        const queries = [];

        // 1. Upsert Track
        queries.push(env.DB.prepare(`
            INSERT INTO tracks (
                id, title, artist, genre, sub_genre, display_genre, collection_hub, 
                vibe, bpm, [key], release_date, release_year, release_month, 
                cover_url, audio_url, download_url, duration, is_featured, is_active, tags,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                artist=excluded.artist,
                genre=excluded.genre,
                sub_genre=excluded.sub_genre,
                display_genre=excluded.display_genre,
                collection_hub=excluded.collection_hub,
                vibe=excluded.vibe,
                bpm=excluded.bpm,
                [key]=excluded.[key],
                release_date=excluded.release_date,
                release_year=excluded.release_year,
                release_month=excluded.release_month,
                cover_url=excluded.cover_url,
                audio_url=excluded.audio_url,
                download_url=excluded.download_url,
                duration=excluded.duration,
                is_featured=excluded.is_featured,
                is_active=excluded.is_active,
                tags=excluded.tags,
                updated_at=excluded.updated_at
        `).bind(
            track.id, 
            track.title, 
            track.artist, 
            track.genre, 
            track.subGenre || track.sub_genre, 
            track.displayGenre || track.display_genre,
            track.collectionHub || track.collection_hub,
            track.vibe,
            track.bpm,
            track.key,
            track.releaseDate || track.release_date,
            track.releaseYear || track.release_year,
            track.releaseMonth || track.release_month,
            track.coverUrl || track.cover_url,
            track.audioUrl || track.audio_url,
            track.downloadUrl || track.download_url,
            track.duration,
            track.isFeatured ? 1 : 0,
            track.isActive !== false ? 1 : 0,
            track.tags,
            track.createdAt || new Date().toISOString(),
            new Date().toISOString()
        ));

        // 2. Upsert Versions if present
        if (track.versions && Array.isArray(track.versions)) {
            for (const v of track.versions) {
                queries.push(env.DB.prepare(`
                    INSERT INTO track_versions (
                        id, track_id, version_name, preview_url, file_url, download_url, 
                        file_size, format, is_main_version, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        track_id=excluded.track_id,
                        version_name=excluded.version_name,
                        preview_url=excluded.preview_url,
                        file_url=excluded.file_url,
                        download_url=excluded.download_url,
                        file_size=excluded.file_size,
                        format=excluded.format,
                        is_main_version=excluded.is_main_version
                `).bind(
                    v.id,
                    track.id,
                    v.versionName || v.version_name,
                    v.previewUrl || v.preview_url,
                    v.fileUrl || v.file_url,
                    v.downloadUrl || v.download_url,
                    v.fileSize || v.file_size,
                    v.format || 'mp3',
                    v.isMainVersion ? 1 : 0,
                    v.createdAt || new Date().toISOString()
                ));
            }
        }

        if (queries.length > 0) {
            await env.DB.batch(queries);
        }

        return new Response(JSON.stringify({ success: true, message: `Synced track ${track.id} to D1` }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        console.error("[Sync Track Error]", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleBulkSync(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const { tracks } = await request.json();
        if (!tracks || !Array.isArray(tracks)) {
            return new Response(JSON.stringify({ error: "Invalid tracks data" }), { status: 400 });
        }

        const queries = [];
        const timestamp = new Date().toISOString();

        for (const track of tracks) {
            if (!track.id) continue;

            // Helper: convert undefined to null for D1 compatibility
            const s = (v) => (v === undefined ? null : v ?? null);

            // 1. Upsert Track
            queries.push(env.DB.prepare(`
                INSERT INTO tracks (
                    id, title, artist, display_genre, collection_hub, 
                    sub_genre, vibe, bpm, release_year, release_month, 
                    is_featured, is_active, date_added, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    artist=excluded.artist,
                    display_genre=excluded.display_genre,
                    collection_hub=excluded.collection_hub,
                    sub_genre=excluded.sub_genre,
                    vibe=excluded.vibe,
                    bpm=excluded.bpm,
                    release_year=excluded.release_year,
                    release_month=excluded.release_month,
                    is_featured=excluded.is_featured,
                    is_active=excluded.is_active,
                    updated_at=excluded.updated_at
            `).bind(
                s(track.id),
                s(track.title),
                s(track.artist),
                s(track.displayGenre ?? track.display_genre),
                s(track.collectionHub ?? track.collection_hub),
                s(track.subGenre ?? track.sub_genre),
                s(track.vibe),
                s(track.bpm),
                s(track.releaseYear ?? track.release_year),
                s(track.releaseMonth ?? track.release_month),
                track.isFeatured ? 1 : 0,
                track.isActive !== false ? 1 : 0,
                s(track.dateAdded ?? track.date_added ?? timestamp),
                s(track.createdAt ?? track.created_at ?? timestamp),
                timestamp
            ));

            // 2. Upsert Versions
            if (track.versions && Array.isArray(track.versions)) {
                for (const v of track.versions) {
                    queries.push(env.DB.prepare(`
                        INSERT INTO track_versions (
                            id, track_id, version_name, preview_url, download_url, 
                            file_size, is_main_version, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            track_id=excluded.track_id,
                            version_name=excluded.version_name,
                            preview_url=excluded.preview_url,
                            download_url=excluded.download_url,
                            file_size=excluded.file_size,
                            is_main_version=excluded.is_main_version
                    `).bind(
                        s(v.id ?? `${track.id}-${v.versionName ?? v.version_name ?? 'original'}`),
                        s(track.id),
                        s(v.versionName ?? v.version_name ?? 'Original'),
                        s(v.previewUrl ?? v.preview_url),
                        s(v.downloadUrl ?? v.download_url),
                        s(v.fileSize ?? v.file_size ?? 0),
                        v.isMainVersion ? 1 : 0,
                        s(v.createdAt ?? v.created_at ?? timestamp)
                    ));
                }
            }
        }

        if (queries.length > 0) {
            const BATCH_LIMIT = 100;
            for (let i = 0; i < queries.length; i += BATCH_LIMIT) {
                const chunk = queries.slice(i, i + BATCH_LIMIT);
                await env.DB.batch(chunk);
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Successfully synced ${tracks.length} tracks to D1` 
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        console.error("[Bulk Sync Error]", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleSyncGenres(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const { genres } = await request.json();
        if (!genres || !Array.isArray(genres)) {
            return new Response(JSON.stringify({ error: "Invalid genres data" }), { status: 400 });
        }

        const queries = [];
        for (const g of genres) {
            queries.push(env.DB.prepare(`
                INSERT INTO genres (id, name, description, image_url, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    description=excluded.description,
                    image_url=excluded.image_url
            `).bind(
                g.id,
                g.name,
                g.description,
                g.imageUrl || g.image_url,
                g.createdAt || new Date().toISOString()
            ));
        }

        if (queries.length > 0) {
            await env.DB.batch(queries);
        }

        return new Response(JSON.stringify({ success: true, message: `Synced ${genres.length} genres to D1` }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleDeleteTrack(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) {
            return new Response(JSON.stringify({ error: "Missing track ID" }), { status: 400 });
        }

        // Use a batch to delete track and its versions
        await env.DB.batch([
            env.DB.prepare("DELETE FROM track_versions WHERE track_id = ?").bind(id),
            env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id)
        ]);

        return new Response(JSON.stringify({ success: true, message: `Deleted track ${id} from D1` }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
