// worker/index.js
import { Router } from './router.js';
import { handleStorefrontProducts } from './api/storefront/products.js';
import { handleStorefrontOrders } from './api/storefront/orders.js';
import { handleDashboardProducts } from './api/dashboard/products.js';
import { handleDashboardOrders } from './api/dashboard/orders.js';
import { handleDashboardUsers } from './api/dashboard/users.js';
import { handleDashboardMixtapes } from './api/dashboard/mixtapes.js';
import { handleDashboardSubscriptions } from './api/dashboard/subscriptions.js';
import { handleDashboardUsage } from './api/dashboard/usage.js';
import { handleDashboardNewsletter } from './api/dashboard/newsletter.js';
import { handleDashboardReferrals } from './api/dashboard/referrals.js';
import { handleDashboardFinances } from './api/dashboard/finances.js';
import { handleR2Sync, handleR2Upload } from './api/dashboard/sync.js';
import { handleSyncTrack, handleSyncGenres, handleDeleteTrack, handleBulkSync, handleRefreshPool, handleDashboardTracks } from './api/dashboard/pool.js';
import { handlePoolScan } from './api/dashboard/scan.js';
import { handlePoolConsolidate } from './api/dashboard/consolidate.js';
import { handleStorefrontPool, handleGetSyncNotifications } from './api/storefront/pool.js';
import { handleBulkRebrand } from './api/admin/rebrand.js';
import { handleSetupDB } from './api/run_setup.js';
import { handleHealth } from './api/health.js';
import { handleSitemap } from './api/seo/sitemap.js';
import { handleTrackSEO } from './api/seo/track.js';
import { handleStorefrontReferrals } from './api/storefront/referrals.js';
import { handlePaystackWebhook } from './api/webhooks/paystack.js';
import { handleSupabaseWebhook } from './api/webhooks/supabase.js';
import { handleLegacy } from './api/legacy.js';
import { handleCommunity } from './api/community.js'; // Note: community.js is legacy reviews/etc.
import { handleCommunityFeed, handleCommunityInteraction } from './api/community/feed.js';
import { handleBookings } from './api/bookings.js';
import { handleSupport } from './api/support.js';
import { handleChat } from './api/chat.js';
import { handleScheduled } from './utils/cron.js';
import { AdminHub } from './utils/hub.js';
import { handleUserInstallments } from './api/user/installments.js';
import { handleWishlist } from './api/user/wishlist.js';
import { handleStoreSettings } from './api/dashboard/store_settings.js';
import { handleDashboardInstallments } from './api/dashboard/installments.js';
import { handlePaymentInitialize } from './api/storefront/payments.js';
import { handleLoyalty } from './api/loyalty.js';
import { handlePresence } from './api/presence.js';
import { handleAdminNotifications, handleUserStatus, handleUserNotifications, handleMarkNotificationsRead } from './api/dashboard/notifications.js';
import { handleStorefrontCoupons } from './api/storefront/coupons.js';
import { handleCommunityProfile } from './api/community/profile.js';
import { handleEscrow } from './api/escrow.js';
import { handleMe } from './api/user.js';
import { handleOffers } from './api/community/offers.js';
import { getShadowSalt } from './utils/shadow.js';
import { getAuthorizedUser } from './utils/auth.js';

const router = new Router();

router.get('/api/admin/setup-db', handleSetupDB);
router.post('/api/admin/rebrand', handleBulkRebrand);
router.get('/api/health', handleHealth);
router.get('/sitemap.xml', handleSitemap);
router.get('/api/seo/track/:id', handleTrackSEO);

// Community & Profile
router.get('/api/user/me', handleMe);
router.get('/api/community/profile/:username', handleCommunityProfile);
router.post('/api/community/profile/update', handleCommunityProfile);
router.get('/api/community/suggested', handleCommunityProfile);
router.get('/api/community/offers', handleOffers);
router.get('/api/handshake', async (req, env) => {
    const user = await getAuthorizedUser(req, env);
    if (!user) return new Response("Unauthorized", { status: 401 });
    const salt = await getShadowSalt(env.ENVIRONMENT_SECRET || 'djflowerz_stealth_default');
    return Response.json({ salt });
});
router.post('/api/community/offers', handleOffers);
router.patch('/api/community/offers/:id', handleOffers);

// Escrow System
router.get('/api/escrow/orders', handleEscrow);
router.get('/api/escrow/order/:id', handleEscrow);
router.post('/api/escrow/order', handleEscrow);
router.patch('/api/escrow/order/:id', handleEscrow);

// User Notifications (D1)
router.get('/api/user/notifications', handleUserNotifications);
router.post('/api/user/notifications/read', handleMarkNotificationsRead);


// Storefront API
router.get('/api/products', handleStorefrontProducts);
router.get('/api/products/:id', handleStorefrontProducts);
router.get('/api/coupons/validate', handleStorefrontCoupons);
router.post('/api/orders', handleStorefrontOrders);
router.get('/api/orders/track', handleStorefrontOrders);
router.get('/api/pool/tracks', handleStorefrontPool);
router.get('/api/pool/filters', handleStorefrontPool);
router.get('/api/pool/download', handleStorefrontPool);
router.post('/api/pool/download', handleStorefrontPool);
router.get('/api/referrals/stats', handleStorefrontReferrals);
router.get('/api/reviews', handleCommunity);
router.post('/api/reviews', handleCommunity);
router.post('/api/payments/initialize', handlePaymentInitialize);
router.get('/api/user/installments', handleUserInstallments);
router.get('/api/plans', handleDashboardSubscriptions);
router.post('/api/user/installments/pay', handleUserInstallments);
router.get('/api/user/wishlist', handleWishlist);
router.post('/api/user/wishlist', handleWishlist);
router.delete('/api/user/wishlist', handleWishlist);
router.get('/api/loyalty/history', handleLoyalty);
router.post('/api/presence', handlePresence);
router.get('/api/user/status', handleUserStatus);

// Dashboard API
router.get('/api/admin/products', handleDashboardProducts);
router.post('/api/admin/products', handleDashboardProducts);
router.put('/api/admin/products/:id', handleDashboardProducts);
router.delete('/api/admin/products/:id', handleDashboardProducts);

// New Booking & Support Routes
router.post('/api/bookings/gig', handleBookings);
router.post('/api/bookings/studio', handleBookings);
router.get('/api/admin/bookings/gigs', handleBookings);
router.get('/api/admin/bookings/studio', handleBookings);
router.post('/api/admin/bookings/gig', handleBookings);
router.post('/api/admin/bookings/studio', handleBookings);
router.put('/api/admin/bookings/gig/:id', handleBookings);
router.put('/api/admin/bookings/studio/:id', handleBookings);
router.patch('/api/admin/bookings/gig/:id', handleBookings);
router.patch('/api/admin/bookings/studio/:id', handleBookings);
router.get('/api/admin/bookings/blackout', handleBookings);
router.post('/api/admin/bookings/blackout', handleBookings);
router.delete('/api/admin/bookings/blackout/:id', handleBookings);
router.get('/api/blackouts', handleBookings); // Legacy support

router.post('/api/contact', handleSupport);
router.get('/api/admin/support/tickets', handleSupport);
router.patch('/api/admin/support/tickets/:id', handleSupport);

router.post('/api/admin/r2-sync', handleR2Sync);
router.post('/api/admin/r2-upload', handleR2Upload);
router.post('/api/admin/pool/sync-track', handleSyncTrack);
router.post('/api/admin/pool/bulk-sync', handleBulkSync);
router.post('/api/admin/pool/refresh', handleRefreshPool);
router.get('/api/admin/pool/tracks', handleDashboardTracks);
router.post('/api/admin/pool/sync-genres', handleSyncGenres);
router.delete('/api/admin/pool/track', handleDeleteTrack);
router.post('/api/admin/pool/scan', handlePoolScan);
router.post('/api/admin/pool/consolidate', handlePoolConsolidate);
router.get('/api/admin/orders', handleDashboardOrders);
router.get('/api/admin/orders/:id', handleDashboardOrders);
router.put('/api/admin/orders/:id', handleDashboardOrders);
router.delete('/api/admin/orders/:id', handleDashboardOrders);
router.get('/api/admin/pool/sync-notifications', handleGetSyncNotifications);
router.get('/api/admin/users', handleDashboardUsers);
router.get('/api/admin/profiles', handleDashboardUsers); // Standardized name for frontend useCollection('profiles')
router.put('/api/admin/users/:id', handleDashboardUsers);
router.put('/api/admin/profiles/:id', handleDashboardUsers);
router.delete('/api/admin/users/:id', handleDashboardUsers);
router.delete('/api/admin/profiles/:id', handleDashboardUsers);
router.get('/api/admin/mixtapes', handleDashboardMixtapes);
router.post('/api/admin/mixtapes', handleDashboardMixtapes);
router.put('/api/admin/mixtapes/:id', handleDashboardMixtapes);
router.delete('/api/admin/mixtapes/:id', handleDashboardMixtapes);
router.get('/api/admin/subscriptions', handleDashboardSubscriptions);
router.get('/api/admin/active-subscribers', handleDashboardSubscriptions);
router.get('/api/admin/expiry-watch', handleDashboardSubscriptions);
router.post('/api/admin/subscriptions/manage', handleDashboardSubscriptions);
router.get('/api/admin/subscription_plans', handleDashboardSubscriptions);
router.get('/api/admin/plans', handleDashboardSubscriptions);
router.post('/api/admin/subscription_plans', handleDashboardSubscriptions);
router.patch('/api/admin/subscription_plans/:id', handleDashboardSubscriptions);
router.put('/api/admin/subscription_plans/:id', handleDashboardSubscriptions);
router.delete('/api/admin/subscription_plans/:id', handleDashboardSubscriptions);
router.get('/api/admin/newsletter_subscribers', handleDashboardNewsletter);
router.get('/api/admin/newsletter_campaigns', handleDashboardNewsletter);
router.post('/api/admin/newsletter_campaigns', handleDashboardNewsletter);
router.post('/api/admin/newsletter/broadcast', handleDashboardNewsletter);
router.patch('/api/admin/newsletter_campaigns/:id', handleDashboardNewsletter);
router.put('/api/admin/newsletter_campaigns/:id', handleDashboardNewsletter);
router.delete('/api/admin/newsletter_campaigns/:id', handleDashboardNewsletter);
router.delete('/api/admin/newsletter_subscribers/:email', handleDashboardNewsletter);
router.post('/api/newsletter/subscribe', handleDashboardNewsletter);

router.post('/api/admin/loyalty/adjust', handleLoyalty);
router.get('/api/admin/coupons', handleDashboardNewsletter);
router.post('/api/admin/coupons', handleDashboardNewsletter);
router.patch('/api/admin/coupons/:id', handleDashboardNewsletter);
router.put('/api/admin/coupons/:id', handleDashboardNewsletter);
router.delete('/api/admin/coupons/:id', handleDashboardNewsletter);

router.get('/api/admin/referrals/stats', handleDashboardReferrals);
router.get('/api/admin/referrals/logs', handleDashboardReferrals);

router.get('/api/admin/tips', handleDashboardFinances);
router.get('/api/admin/finances/tips', handleDashboardFinances); // alias used by Payments page
router.post('/api/admin/tips', handleDashboardFinances);
router.get('/api/admin/payments', handleDashboardFinances);
router.get('/api/admin/dashboard', handleDashboardFinances);
router.get('/api/admin/stats', handleDashboardFinances);
router.post('/api/admin/sync-paystack', handleDashboardFinances);
router.get('/api/admin/usage', handleDashboardUsage);
router.get('/api/admin/notifications', handleAdminNotifications);
router.post('/api/admin/revoke-access', handleDashboardSubscriptions);

// Community & Interactions (Admin)
router.get('/api/admin/reviews', handleCommunity);
router.post('/api/admin/reviews', handleCommunity);
router.get('/api/admin/comments', handleCommunity);
router.post('/api/admin/comments', handleCommunity);
router.get('/api/admin/interactions', handleCommunity);
router.patch('/api/admin/interactions/:id', handleCommunity);
router.delete('/api/admin/interactions/:id', handleCommunity);

// Community interactions (New unified feed)
router.get('/api/community/posts', handleCommunityFeed);
router.post('/api/community/posts', handleCommunityFeed);
router.post('/api/community/likes', handleCommunityInteraction);
router.get('/api/community/comments', handleCommunityInteraction);
router.post('/api/community/comments', handleCommunityInteraction);
router.post('/api/community/follows', handleCommunityInteraction);
router.get('/api/community/follows', handleCommunityInteraction);

// Lipa Pole Pole (Installments)
router.get('/api/admin/installments', handleDashboardInstallments);
router.post('/api/admin/installments', handleDashboardInstallments);
router.patch('/api/admin/installments/:id', handleDashboardInstallments);
router.put('/api/admin/installments/:id', handleDashboardInstallments);
router.delete('/api/admin/installments/:id', handleDashboardInstallments);

// Webhooks
router.post('/api/webhooks/paystack', handlePaystackWebhook);
router.post('/api/webhooks/supabase', handleSupabaseWebhook);

// Store Settings (public read, admin write)
router.get('/api/store/settings', handleStoreSettings);
router.options('/api/store/settings', handleStoreSettings);
router.put('/api/admin/store/settings', handleStoreSettings);
router.patch('/api/admin/store/settings', handleStoreSettings);
router.options('/api/admin/store/settings', handleStoreSettings);

// Community & Studio
router.get('/api/studio/locations', handleCommunity);
router.get('/api/studio/gear', handleCommunity);
router.get('/api/mixtapes/comments/:id', handleCommunity);
router.post('/api/mixtapes/comments', handleCommunity);
router.get('/api/admin/reviews', handleCommunity);
router.get('/api/admin/comments', handleCommunity);
router.post('/api/admin/studio/locations', handleCommunity);
router.put('/api/admin/studio/locations/:id', handleCommunity);
router.patch('/api/admin/studio/locations/:id', handleCommunity);
router.delete('/api/admin/studio/locations/:id', handleCommunity);
router.post('/api/admin/studio/gear', handleCommunity);
router.put('/api/admin/studio/gear/:id', handleCommunity);
router.patch('/api/admin/studio/gear/:id', handleCommunity);
router.delete('/api/admin/studio/gear/:id', handleCommunity);
router.get('/api/admin/studio/maintenance', handleCommunity);
router.post('/api/admin/studio/maintenance', handleCommunity);
router.put('/api/admin/studio/maintenance/:id', handleCommunity);
router.patch('/api/admin/studio/maintenance/:id', handleCommunity);
router.get('/api/session_types', handleCommunity);
router.get('/api/admin/session_types', handleCommunity);
router.post('/api/admin/session_types', handleCommunity);
router.put('/api/admin/session_types/:id', handleCommunity);
router.patch('/api/admin/session_types/:id', handleCommunity);
router.delete('/api/admin/session_types/:id', handleCommunity);

// Support & Contact
router.post('/api/contact', handleSupport);
router.get('/api/admin/support/tickets', handleSupport);
router.patch('/api/admin/support/tickets/:id', handleSupport);
router.delete('/api/admin/support/tickets/:id', handleSupport);

// Live Chat
router.post('/api/chat/start', handleChat);
router.post('/api/chat/message', handleChat);
router.post('/api/chat/human', handleChat);
router.post('/api/chat/reply', handleChat);
router.get('/api/chat/session/:id', handleChat);
router.get('/api/admin/chat/sessions', handleChat);
router.patch('/api/admin/chat/sessions/:id', handleChat);

// WhatsApp Webhook (Twilio)
router.post('/api/webhooks/whatsapp', handleChat);

// Legacy/Mixtapes
router.get('/api/mixtapes', handleLegacy);
router.get('/api/data/:collection', handleLegacy);
router.post('/api/broadcast', handleLegacy);

// Admin WebSocket
router.get('/admin/ws', (request, env) => {
    const hubId = env.ADMIN_HUB.idFromName("global_admin");
    const hub = env.ADMIN_HUB.get(hubId);
    return hub.fetch(request);
});

export { AdminHub };

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get("Origin");
        const url = new URL(request.url);
        const salt = await getShadowSalt(env.ENVIRONMENT_SECRET || 'djflowerz_stealth_default');
        
        // 0. Shadow Route Pre-processor
        // If a request starts with /api/v1/sh-, we validate salt and strip it
        let pathname = url.pathname;
        if (pathname.startsWith('/api/v1/sh-')) {
            const parts = pathname.split('/');
            const requestSalt = parts[3].replace('sh-', '');
            
            if (requestSalt !== salt) {
                 return new Response(JSON.stringify({ error: "Access Denied: Expired Signature" }), { 
                     status: 403, 
                     headers: { "Content-Type": "application/json" } 
                 });
            }
            
            // Rewrite pathname for the router: /api/v1/sh-xyz/pool/tracks -> /api/pool/tracks
            pathname = '/api/' + parts.slice(4).join('/');
            
            // Re-bind pathname to url for router.handle (which uses url.pathname)
            // Note: Since we can't easily modify url.pathname directly, we'll pass a proxy-like request or just match manually
        }

        // 1. CORS Pre-flight & Origin Determination
        const corsWhitelist = [
            "https://djflowerz.co.ke",
            "https://www.djflowerz.co.ke",
            "https://dj-flowerz.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000"
        ];

        // Echo origin if it's in our whitelist or a vercel preview
        const isWhitelisted = origin && (
            corsWhitelist.includes(origin) || 
            origin.endsWith(".vercel.app")
        );
        
        // For Access-Control-Allow-Credentials: true, the origin MUST match exactly.
        const corsOrigin = isWhitelisted ? origin : corsWhitelist[0];
        if (origin && !isWhitelisted) {
            console.log(`[CORS] Rejected Origin: ${origin}. Falling back to: ${corsWhitelist[0]}`);
        } else if (origin) {
            console.log(`[CORS] Allowed Origin: ${origin}`);
        }

        // Standard CORS headers used for all responses
        const corsHeaders = {
            "Access-Control-Allow-Origin": corsOrigin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, x-folder, x-file-name, x-upsert",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
            "Access-Control-Allow-Credentials": "true",
            "Max-Age": "86400",
        };

        // Handle CORS PREFLIGHT immediately to save CPU/Network
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // --- PUBLIC FILE PROXY: GET /api/files/* ---
            if (request.method === "GET" && url.pathname.startsWith("/api/files/")) {
                const filePath = decodeURIComponent(url.pathname.replace("/api/files/", ""));
                const originParam = url.searchParams.get("origin");

                let originBase;
                if (originParam === "remix") {
                    originBase = "https://remix-and-mashups-worker.dennismacharia20.workers.dev";
                } else {
                    // Internal storage origin (hidden from public view)
                    originBase = "https://r2.vicknickvideopool.com";
                }

                // Re-encode just the path (not query) for the upstream request
                const encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
                const originUrl = `${originBase}/${encodedPath}`;
                const rangeHeader = request.headers.get("Range");

                const originRes = await fetch(originUrl, {
                    headers: {
                        "User-Agent": "DJFlowerz-Worker/1.0",
                        "Referer": "https://djflowerz.co.ke",
                        ...(rangeHeader ? { "Range": rangeHeader } : {})
                    }
                });

                const headers = new Headers();
                headers.set("Access-Control-Allow-Origin", corsOrigin);
                headers.set("Content-Type", originRes.headers.get("Content-Type") || "application/octet-stream");
                headers.set("Cache-Control", "public, max-age=86400"); // 1 day cache
                headers.set("Accept-Ranges", "bytes");

                // Pass through critical headers for seeking/streaming
                const contentLength = originRes.headers.get("Content-Length");
                const contentRange = originRes.headers.get("Content-Range");
                if (contentLength) headers.set("Content-Length", contentLength);
                if (contentRange) headers.set("Content-Range", contentRange);

                return new Response(originRes.body, {
                    status: originRes.status,
                    headers
                });
            }

            // Standardize request for router with potential shadow pathname
            const shadowRequest = new Request(url.origin + pathname, {
                method: request.method,
                headers: request.headers,
                body: request.body
            });

            const response = await router.handle(shadowRequest, env, ctx);

            // Special handling for WebSockets
            if (response.status === 101) {
                return response;
            }

            // 4. Finalize Response with standardized CORS headers
            const responseHeaders = new Headers(response.headers);
            
            // Only set CORS headers if they aren't already set by the specific handler
            Object.entries(corsHeaders).forEach(([k, v]) => {
                if (!responseHeaders.has(k)) {
                    responseHeaders.set(k, v);
                }
            });

            // Ensure Content-Type is JSON for API routes if not set
            if (url.pathname.startsWith('/api/') && !responseHeaders.has('Content-Type')) {
                responseHeaders.set('Content-Type', 'application/json');
            }

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders
            });
        } catch (e) {
            console.error("[Worker Error]", e);
            const errorHeaders = new Headers(corsHeaders);
            errorHeaders.set("Content-Type", "application/json");
            
            return new Response(JSON.stringify({ 
                error: e.message,
                stack: env.ENVIRONMENT === 'development' ? e.stack : undefined 
            }), {
                status: 500,
                headers: errorHeaders
            });
        }
    },
    async scheduled(event, env, ctx) {
        return handleScheduled(event, env, ctx);
    }
};
