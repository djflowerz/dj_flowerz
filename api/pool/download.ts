
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
    SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY || ''
);

export const config = {
    runtime: 'edge',
};

// Trusted domains for proxying
const TRUSTED_DOMAINS = [
    'cdn.vicknickvideopool.com',
    'vicknickvideopool.com',
    'firebasestorage.googleapis.com',
    'pub-59a613f808794c48972e0d794770331f.r2.dev',
    'hearthis.at',
    'r2.vicknickvideopool.com'
];

function parseHearthisUrl(url: string) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'hearthis.at' && urlObj.hostname !== 'www.hearthis.at') return null;
        const paths = urlObj.pathname.split('/').filter(p => !!p);
        if (paths.length < 2) return null;
        return { artist: paths[0], track: paths[1] };
    } catch (e) {
        return null;
    }
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch (e) {
        return new Response('Invalid JSON body', { status: 400 });
    }

    let fileUrl = body.url;
    const fileName = body.fileName || 'download';
    const trackId = body.trackId || 'unknown';
    const type = body.type || 'track'; // track, mixtape_audio, mixtape_video, digital_product
    const orderId = body.orderId;

    if (!fileUrl) {
        return new Response('Missing URL', { status: 400 });
    }

    // SSRF Protection: Check if URL host is trusted
    try {
        const parsedFileUrl = new URL(fileUrl);
        if (!TRUSTED_DOMAINS.some(domain => parsedFileUrl.hostname === domain || parsedFileUrl.hostname.endsWith('.' + domain))) {
            return new Response('Untrusted download source', { status: 403 });
        }
    } catch (e) {
        return new Response('Invalid File URL', { status: 400 });
    }

    // RESOLVE Hearthis.at URLs to direct audio links
    if (fileUrl.includes('hearthis.at')) {
        const hearthisParams = parseHearthisUrl(fileUrl);
        if (hearthisParams) {
            const apiKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
            const apiHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || 'hearthis-at.p.rapidapi.com';

            if (apiKey) {
                try {
                    const res = await fetch(`https://${apiHost}/${hearthisParams.artist}/${hearthisParams.track}/`, {
                        headers: {
                            'x-rapidapi-key': apiKey,
                            'x-rapidapi-host': apiHost
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        fileUrl = data.download_url || data.stream_url || data.preview_url || fileUrl;
                    }
                } catch (e) {
                    console.error('[Download] Hearthis API resolution failed:', e);
                }
            }

            // Fallback for Hearthis:
            // If API resolution failed (fileUrl == body.url) or we don't have a direct file link (cdn/storage),
            // we need to ensure we have a usable endpoint.
            if (fileUrl === body.url && !fileUrl.includes('cdn.') && !fileUrl.includes('storage.')) {
                const cleanUrl = fileUrl.split('?')[0].replace(/\/$/, '');

                // If it's already an explicit download or stream link, preserve it
                if (cleanUrl.includes('/download') || cleanUrl.includes('/listen')) {
                    fileUrl = cleanUrl + '/';
                } else {
                    // It's a bare track page: https://hearthis.at/artist/slug/
                    // For ACTUAL downloads (this proxy), /download/ is better for full file access
                    fileUrl = `${cleanUrl}/download/`;
                }
                console.log(`[Download] Hearthis fallback resolved to: ${fileUrl}`);
            }
        }
    }

    let user: any = null;
    let profile: any = null;

    // 1. Verification Strategy: Auth Token OR Order ID OR Public Mixtape
    if (orderId) {
        // ... (existing order logic)
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();

        if (orderError || !order) {
            return new Response('Order not found or invalid', { status: 404 });
        }

        const hasProduct = order.items?.some((item: any) =>
            item.productId === trackId || item.id === trackId || item.trackId === trackId
        );

        if (!hasProduct && type !== 'mixtape_audio' && type !== 'mixtape_video') {
            return new Response('Product not found in this order', { status: 403 });
        }

        user = { id: order.user_id || 'guest', email: order.customer_email };
    } else {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        if (token) {
            const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (!authError && authUser) {
                user = authUser;
                const { data: p } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                profile = p;
            }
        }

        // If no user/profile, check if this is a free mixtape public download
        if (!profile && (type === 'mixtape_audio' || type === 'mixtape_video')) {
            const { data: mixtape, error: mError } = await supabaseAdmin
                .from('mixtapes')
                .select('id, download_type, allow_download')
                .eq('id', trackId)
                .maybeSingle();

            if (mixtape && mixtape.allow_download && mixtape.download_type === 'free') {
                // Allow public download
                console.log(`[Download] Allowing public download for free mixtape: ${trackId}`);
            } else if (!user) {
                return new Response('Authentication required for this content', { status: 401 });
            }
        } else if (!user && !orderId) {
            return new Response('Unauthorized: Login required', { status: 401 });
        }
    }

    // 2. Privilege Check
    // If it's a store purchase (orderId provided), we already verified the link.
    // If it's a Pool track download via Auth, check subscription.
    if (!orderId && type === 'track' && !profile?.is_subscriber && profile?.role !== 'admin') {
        return new Response('Subscription required', { status: 403 });
    }

    // 3. Deduplicated Daily Limits (Rolling 24-hour window)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let uniqueDownloadsCount = 0;
    let hasDownloadedThisTrack = false;

    if (profile) {
        // Fetch unique tracks downloaded in the last 24 hours
        const { data: recentDownloads, error: logsError } = await supabaseAdmin
            .from('download_logs')
            .select('track_id')
            .eq('user_id', user.id)
            .gt('created_at', twentyFourHoursAgo);

        if (logsError) {
            console.error('[Download] Error fetching logs for limit check:', logsError);
        }

        const uniqueTrackIds = new Set(recentDownloads?.map(l => l.track_id) || []);
        uniqueDownloadsCount = uniqueTrackIds.size;
        hasDownloadedThisTrack = uniqueTrackIds.has(trackId);

        const planId = (profile.subscription_plan || '').toLowerCase();
        const isWeekly = planId.includes('week') || planId.includes('7');
        const limit = isWeekly ? 30 : 200;

        // If this is a new unique track and we're at the limit, block it
        if (!hasDownloadedThisTrack && uniqueDownloadsCount >= limit && profile.role !== 'admin') {
            return new Response(`Daily unique limit reached (${limit}/day).`, {
                status: 429,
                headers: { 'X-Downloads-Remaining': '0' }
            });
        }

        // Calculate remaining (if this is a new track, it will take up one slot)
        const effectiveRemaining = Math.max(0, limit - (hasDownloadedThisTrack ? uniqueDownloadsCount : uniqueDownloadsCount + 1));

        // Update profile with the latest unique count (for real-time sync)
        // Note: We use the *new* count if this is a new unique download
        const finalUniqueCount = hasDownloadedThisTrack ? uniqueDownloadsCount : uniqueDownloadsCount + 1;

        // Use background promise for profile update to avoid blocking
        const updatePromise = supabaseAdmin.from('profiles').update({
            downloads_today: finalUniqueCount, // Using this column for the unique count now
            last_download_date: new Date().toISOString()
        }).eq('id', user.id);

        // Attach the update promise to be awaited later
        body._updatePromise = updatePromise;
        body._remaining = hasDownloadedThisTrack ? limit - uniqueDownloadsCount : limit - (uniqueDownloadsCount + 1);
    }

    // 4. Log Download & Increment Global Count
    const logPromise = supabaseAdmin.from('download_logs').insert({
        user_id: user.id === 'guest' ? null : user.id,
        order_id: orderId || null,
        type: type,
        track_id: trackId,
        details: { artist: body.artist, title: body.title },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
    });

    const statsPromise = type === 'track' ? supabaseAdmin.rpc('increment_download_count', { t_id: trackId }) : Promise.resolve();

    // 5. Fetch and Proxy OR Redirect
    try {
        // EXECUTE DB updates
        await Promise.all([body._updatePromise || Promise.resolve(), logPromise, statsPromise]);

        // OPTIMIZATION: Always use Direct Redirect for Mixtapes (and Large files)
        if (type === 'mixtape_audio' || type === 'mixtape_video') {
            console.log(`[Download] Sending redirect instruction for mixtape ${trackId}: ${fileUrl}`);
            return new Response(JSON.stringify({
                success: true,
                redirectUrl: fileUrl,
                fileName: fileName,
                remaining: body._remaining // Include in JSON
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Downloads-Remaining': String(body._remaining || '')
                }
            });
        }

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch from source');

        const headers = new Headers(response.headers);
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        headers.set('X-Downloads-Remaining', String(body._remaining || ''));

        return new Response(response.body, {
            status: 200,
            headers
        });
    } catch (err: any) {
        console.error('Download Proxy Error:', err);
        return new Response('Download failed', { status: 500 });
    }
}
