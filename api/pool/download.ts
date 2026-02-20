
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

    const fileUrl = body.url;
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

    // 3. Daily Limits (Only apply to Auth users for now, guest orders are one-off)
    const today = new Date().toISOString().split('T')[0];
    let downloadsToday = 0;
    if (profile) {
        const planId = (profile.subscription_plan || '').toLowerCase();
        const isWeekly = planId.includes('week') || planId.includes('7');
        const limit = isWeekly ? 30 : 200;

        downloadsToday = profile.downloads_today || 0;
        const lastDate = profile.last_download_date;

        if (lastDate && lastDate !== today) {
            downloadsToday = 0;
        }

        if (downloadsToday >= limit && profile.role !== 'admin') {
            return new Response(`Daily limit reached (${limit}/day).`, { status: 429 });
        }
    }

    // 4. Log Download & Increment Count (Parallel-ish)
    // We update first to ensure we don't accidentally allow extra downloads if the stream takes long
    const updatePromise = profile ? supabaseAdmin.from('profiles').update({
        downloads_today: downloadsToday + 1,
        last_download_date: today
    }).eq('id', user.id) : Promise.resolve();

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

    // 5. Fetch and Proxy
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch from source');

        // Execute DB updates
        await Promise.all([updatePromise, logPromise, statsPromise]);

        const headers = new Headers(response.headers);
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

        return new Response(response.body, {
            status: 200,
            headers
        });
    } catch (err: any) {
        console.error('Download Proxy Error:', err);
        return new Response('Download failed', { status: 500 });
    }
}
