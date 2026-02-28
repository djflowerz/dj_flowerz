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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials.' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    if (allScanned.length > 0) {
        const { error } = await supabase
            .from('scanned_tracks')
            .upsert(allScanned, { onConflict: 'id' });

        if (error) {
            errors.push(`DB upsert error: ${error.message}`);
        } else {
            saved = allScanned.length;
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
