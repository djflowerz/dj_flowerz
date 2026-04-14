import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';

export async function handleDashboardTracks(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const { results: tracks } = await env.DB.prepare(`
            SELECT t.*, 
                   (SELECT json_group_array(json_object(
                       'id', v.id, 
                       'versionName', v.version_name, 
                       'previewUrl', v.preview_url, 
                       'downloadUrl', v.download_url,
                       'fileSize', v.file_size
                   )) FROM track_versions v WHERE v.track_id = t.id) as versions
            FROM tracks t
            ORDER BY t.created_at DESC
        `).all();

        const formattedTracks = tracks.map(t => ({
            ...t,
            versions: JSON.parse(t.versions || '[]')
        }));

        return new Response(JSON.stringify(formattedTracks), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

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
        queries.push(env.DB.prepare(`
            INSERT INTO tracks (
                id, title, artist, sub_genre, display_genre, collection_hub, 
                vibe, bpm, release_year, release_month, 
                is_featured, is_active,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                artist=excluded.artist,
                sub_genre=excluded.sub_genre,
                display_genre=excluded.display_genre,
                collection_hub=excluded.collection_hub,
                vibe=excluded.vibe,
                bpm=excluded.bpm,
                release_year=excluded.release_year,
                release_month=excluded.release_month,
                is_featured=excluded.is_featured,
                is_active=excluded.is_active,
                updated_at=excluded.updated_at
        `).bind(
            track.id, 
            track.title, 
            track.artist, 
            track.subGenre || track.sub_genre, 
            track.displayGenre || track.display_genre,
            track.collectionHub || track.collection_hub,
            track.vibe,
            track.bpm,
            track.releaseYear || track.release_year,
            track.releaseMonth || track.release_month,
            track.isFeatured ? 1 : 0,
            track.isActive !== false ? 1 : 0,
            track.createdAt || new Date().toISOString(),
            new Date().toISOString()
        ));

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
                    v.id,
                    track.id,
                    v.versionName || v.version_name,
                    v.previewUrl || v.preview_url,
                    v.downloadUrl || v.download_url,
                    v.fileSize || v.file_size,
                    v.isMainVersion ? 1 : 0,
                    v.createdAt || new Date().toISOString()
                ));
            }
        }

        if (queries.length > 0) {
            await env.DB.batch(queries);
        }

        return new Response(JSON.stringify({ success: true, message: `Synced track \${track.id} to D1` }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
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
            const s = (v) => (v === undefined ? null : v ?? null);

            queries.push(env.DB.prepare(`
                INSERT INTO tracks (
                    id, title, artist, display_genre, collection_hub, 
                    sub_genre, vibe, bpm, release_year, release_month, 
                    is_featured, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                s(track.createdAt ?? track.created_at ?? timestamp),
                timestamp
            ));

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
                        s(v.id ?? `\${track.id}-\${v.versionName ?? v.version_name ?? 'original'}`),
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
                await env.DB.batch(queries.slice(i, i + BATCH_LIMIT));
            }
        }

        return new Response(JSON.stringify({ success: true, message: `Synced \${tracks.length} tracks to D1` }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
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
        const queries = [];
        for (const g of genres || []) {
            queries.push(env.DB.prepare(`
                INSERT INTO genres (id, name, description, image_url, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, image_url=excluded.image_url
            `).bind(g.id, g.name, g.description, g.imageUrl || g.image_url, g.createdAt || new Date().toISOString()));
        }
        if (queries.length > 0) await env.DB.batch(queries);
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
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
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
        await env.DB.batch([
            env.DB.prepare("DELETE FROM track_versions WHERE track_id = ?").bind(id),
            env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id)
        ]);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleRefreshPool(request, env, ctx, params) {
    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        console.log("[Pool Refresh] Starting full R2 scan...");
        let allObjects = [];
        let cursor = undefined;
        let truncated = true;

        while (truncated) {
            const list = await env.R2_BUCKET.list({ cursor, include: ['httpMetadata', 'customMetadata'] });
            allObjects.push(...list.objects);
            truncated = list.truncated;
            cursor = list.cursor;
        }

        const mediaFiles = allObjects.filter(obj => 
            obj.key.toLowerCase().endsWith('.mp3') || obj.key.toLowerCase().endsWith('.wav') ||
            obj.key.toLowerCase().endsWith('.m4a') || obj.key.toLowerCase().endsWith('.mp4')
        );

        if (mediaFiles.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "R2 is empty.", count: 0 }));
        }

        const timestamp = new Date().toISOString();
        const queries = [];
        queries.push(env.DB.prepare("DELETE FROM track_versions"));
        queries.push(env.DB.prepare("DELETE FROM tracks"));

        for (const obj of mediaFiles) {
            const key = obj.key;
            const parts = (key.startsWith('/') ? key.slice(1) : key).split('/');
            
            // Logic: Enforce "Video Pool" hub for everything NOT in "Remix & Mashups Hub"
            // And use first folder as Genre.
            let hub = "Video Pool";
            let genre = parts[0] || "General";
            let subGenre = "";

            if (parts[0] === "Remix & Mashups Hub") {
                hub = "Remix & Mashups Hub";
                genre = parts[1] || "General";
                subGenre = parts.slice(2, -1).join(" / ");
            } else {
                hub = "Video Pool";
                genre = parts[0];
                subGenre = parts.length > 2 ? parts.slice(1, -1).join(" / ") : "";
            }

            let rawTitle = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
            let displayTitle = rawTitle;
            let displayArtist = "Unknown Artist";

            if (rawTitle.includes(" - ")) {
                const s = rawTitle.split(" - ");
                displayArtist = s[0].trim();
                displayTitle = s[1].trim();
            } else if (rawTitle.includes("-")) {
                 const s = rawTitle.split("-");
                 displayArtist = s[0].trim();
                 displayTitle = (s.slice(1).join("-")).trim();
            }

            const handleRebrand = (s) => (s || "")
                .replace(/dj[-_\s]*vick[-_\s]*nick/gi, "DJ Flowerz")
                .replace(/vick[-_\s]*nick/gi, "Flowerz")
                .replace(/Reggae\s+Fussion/gi, "Reggae Fusion")
                .replace(/Reggaetone/gi, "Reggaeton");
            
            displayArtist = handleRebrand(displayArtist);
            displayTitle = handleRebrand(displayTitle);
            hub = handleRebrand(hub);
            genre = handleRebrand(genre);
            subGenre = handleRebrand(subGenre);

            const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const YEAR_REGEX = /\b(20\d{2})\b/;

            let releaseYear = null;
            let releaseMonth = null;

            for (const p of parts) {
                if (!releaseYear) {
                    const match = p.match(YEAR_REGEX);
                    if (match) releaseYear = parseInt(match[1]);
                }
                if (!releaseMonth) {
                    const monthMatch = MONTH_NAMES.find(m => p.includes(m));
                    if (monthMatch) releaseMonth = monthMatch;
                }
            }

            const trackId = crypto.randomUUID();
            // Using the worker's own proxy endpoint for branded URLs
            const encodedPath = parts.map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
            const fileUrl = `/api/files/${encodedPath}`;

            queries.push(env.DB.prepare(`
                INSERT INTO tracks (
                    id, title, artist, display_genre, collection_hub, sub_genre, 
                    release_year, release_month, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            `).bind(
                trackId, 
                displayTitle, 
                displayArtist, 
                genre, 
                hub, 
                subGenre, 
                releaseYear || new Date().getFullYear(),
                releaseMonth || MONTH_NAMES[new Date().getMonth()],
                timestamp, 
                timestamp
            ));

            queries.push(env.DB.prepare(`
                INSERT INTO track_versions (id, track_id, version_name, preview_url, download_url, file_size, is_main_version, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            `).bind(crypto.randomUUID(), trackId, 'Original Mix', fileUrl, fileUrl, obj.size || 0, timestamp));
        }

        const BATCH_LIMIT = 50;
        for (let i = 0; i < queries.length; i += BATCH_LIMIT) {
            await env.DB.batch(queries.slice(i, i + BATCH_LIMIT));
        }

        return new Response(JSON.stringify({ success: true, message: `Indexed \${mediaFiles.length} tracks.` }));
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
