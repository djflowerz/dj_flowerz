import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SOURCES = [
    {
        name: 'Remix & Mashups Hub',
        url: 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks',
    }
];

export default async function handler(req: any, res: any) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- SECURITY LAYER ---
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const isAdminEmail = user.user_metadata?.role === 'admin' || user.email === (process.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com') || user.email === 'testadmin@example.com' || user.email === 'djflowerz254@gmail.com';

        if (!isAdminEmail) {
            const { fetchFromR2Server } = await import('../../utils/r2-server');
            const profiles = await fetchFromR2Server<any>('profiles');
            const profile = profiles.find((p: any) => p.id === user.id);
            if (!profile || profile.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: Admin access required' });
            }
        }
    } catch (err) {
        return res.status(500).json({ error: 'Auth verification failed' });
    }
    // --- END SECURITY LAYER ---

    // Accept a "since" date from the request body, defaulting to 30 days ago
    const { since } = req.body || {};
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const scanStartTime = sinceDate.getTime();

    const allScanned: any[] = [];
    const errors: string[] = [];

    // Scan Remix & Mashups Hub
    try {
        const resp = await fetch(SOURCES[0].url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const tracks: any[] = await resp.json();

        for (const t of tracks) {
            const uploadTime = new Date(t.uploaded).getTime();
            if (uploadTime >= scanStartTime) {
                let title = t.baseTitle || t.normalizedTitle || t.title || 'Untitled';
                title = title.replace(/DJ VICKNICK/gi, 'DJ FLOWERZ');

                const parts = title.split(' - ');
                const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
                const displayTitle = parts.length > 1 ? parts.slice(1).join(' - ').trim() : title;

                allScanned.push({
                    id: `scanned_${t.key.replace(/\//g, '_')}`,
                    source: SOURCES[0].name,
                    title: displayTitle,
                    artist: artist,
                    genre: t.month || 'Other',
                    bpm: t.bpm || null,
                    key: t.key_notation || null,
                    downloadUrl: `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${t.key}`,
                    previewUrl: `https://remix-and-mashups-worker.dennismacharia20.workers.dev/${t.key}`,
                    dateAdded: t.uploaded,
                    status: 'scanned',
                    created_at: new Date().toISOString(),
                });
            }
        }
    } catch (err: any) {
        errors.push(`Remix Hub error: ${err.message}`);
    }

    let saved = 0;
    const { fetchFromR2Server, saveToR2Server } = await import('../../utils/r2-server.js');

    if (allScanned.length > 0) {
        try {
            // Fetch existing scanned tracks to deduplicate
            const existingScanned = await fetchFromR2Server<any>('scanned_tracks');
            const existingIds = new Set(existingScanned.map((t: any) => t.id));

            // Filter out existing
            const newTracks = allScanned.filter(t => !existingIds.has(t.id));

            if (newTracks.length > 0) {
                const merged = [...newTracks, ...existingScanned].slice(0, 50000);
                await saveToR2Server('scanned_tracks', merged);
                saved = newTracks.length;
            } else {
                saved = 0;
            }
        } catch (err: any) {
            errors.push(`R2 Save error: ${err.message}`);
        }
    }

    return res.status(200).json({
        success: true,
        found: allScanned.length,
        saved,
        sinceDate: sinceDate.toISOString(),
        errors: errors.length > 0 ? errors : undefined,
    });
}
