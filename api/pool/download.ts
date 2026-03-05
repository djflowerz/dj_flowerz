
import { createClient } from '@supabase/supabase-js';
import { getR2Collection, updateR2Item, addR2Item } from '../../utils/server-r2';

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

// Trusted domains for proxying (Strictly Cloudflare R2 / Custom Domains)
const TRUSTED_DOMAINS = [
    'vicknickvideopool.com',
    'pub-59a613f808794c48972e0d794770331f.r2.dev',
    'pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev',
    'hearthis.at',
    'r2.vicknickvideopool.com',
    'djflowerz.co.ke'
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
        const orders = await getR2Collection<any>('orders');
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return new Response('Order not found or invalid', { status: 404 });
        }

        const hasProduct = order.items?.some((item: any) =>
            item.productId === trackId || item.id === trackId || item.trackId === trackId
        );

        if (!hasProduct && type !== 'mixtape_audio' && type !== 'mixtape_video') {
            return new Response('Product not found in this order', { status: 403 });
        }

        user = { id: order.user_id || 'guest', email: order.customer_email };
        profile = { id: user.id, email: user.email, role: 'user' }; // Order exists = temporary privilege
    } else {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        if (token) {
            // Still need Supabase for AUTH (token verification)
            const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (!authError && authUser) {
                user = authUser;
                const profiles = await getR2Collection<any>('profiles');
                profile = profiles.find(p => p.id === user.id);
            }
        }

        // If no user/profile, check if this is a free mixtape public download
        if (!profile && (type === 'mixtape_audio' || type === 'mixtape_video')) {
            const mixtapes = await getR2Collection<any>('mixtapes');
            const mixtape = mixtapes.find(m => m.id === trackId);

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
    if (!orderId && type === 'track' && !profile?.is_subscriber && profile?.role !== 'admin') {
        return new Response('Subscription required', { status: 403 });
    }

    // 3. Daily Limits (Simplified for R2 - checking last_download_date and downloads_today)
    const nowISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let downloadsToday = profile?.downloads_today || 0;
    const lastDownloadDate = profile?.last_download_date?.split('T')[0];

    if (lastDownloadDate !== nowISO) {
        downloadsToday = 0;
    }

    if (profile && profile.role !== 'admin') {
        const planId = (profile.subscription_plan || '').toLowerCase();
        const isTrial = planId.includes('trial');
        const isWeekly = planId.includes('week') || planId.includes('7');

        let limit = 200;
        if (isTrial) limit = 10;
        else if (isWeekly) limit = 30;

        if (downloadsToday >= limit) {
            return new Response(`Daily limit reached (${limit}/day).`, { status: 429 });
        }

        // Increment count in R2
        await updateR2Item<any>('profiles', profile.id, {
            downloads_today: downloadsToday + 1,
            last_download_date: new Date().toISOString()
        });
    }

    // 4. Log Download (Optional: append to daily log file instead of central DB)
    // For now, we contribute to the global download log collection
    try {
        await addR2Item<any>('download_logs', {
            id: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: user?.id || 'guest',
            order_id: orderId || null,
            type: type,
            track_id: trackId,
            details: { artist: body.artist, title: body.title },
            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('[Download] Failed to log download to R2:', e);
    }

    // 5. Fetch and Proxy OR Redirect
    try {
        // Increment Track stats (optional, could be done via separate collection)
        // await updateR2Item<any>('pool_tracks', trackId, { download_count: (track.download_count || 0) + 1 });

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
