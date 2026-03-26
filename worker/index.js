// worker/index.js
import { Router } from './router.js';
import { handleStorefrontProducts } from './api/storefront/products.js';
import { handleStorefrontOrders } from './api/storefront/orders.js';
import { handleDashboardProducts } from './api/dashboard/products.js';
import { handleDashboardOrders } from './api/dashboard/orders.js';
import { handleDashboardUsers } from './api/dashboard/users.js';
import { handleDashboardMixtapes } from './api/dashboard/mixtapes.js';
import { handleDashboardSubscriptions } from './api/dashboard/subscriptions.js';
import { handleDashboardNewsletter } from './api/dashboard/newsletter.js';
import { handleDashboardReferrals } from './api/dashboard/referrals.js';
import { handleDashboardFinances } from './api/dashboard/finances.js';
import { handleR2Sync, handleR2Upload } from './api/dashboard/sync.js';
import { handleStorefrontPool, handleGetSyncNotifications } from './api/storefront/pool.js';
import { handleStorefrontReferrals } from './api/storefront/referrals.js';
import { handlePaystackWebhook } from './api/webhooks/paystack.js';
import { handleLegacy } from './api/legacy.js';
import { handleCommunity } from './api/community.js';
import { handleTrialActivation, handleTrialStatus } from './api/user/trial.js';
import { handleBookings } from './api/bookings.js';
import { handleSupport } from './api/support.js';
import { handleScheduled } from './utils/cron.js';
import { AdminHub } from './utils/hub.js';
import { handleStoreSettings } from './api/dashboard/store_settings.js';

import { handleStorefrontCoupons } from './api/storefront/coupons.js';

const router = new Router();

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

router.post('/api/contact', handleSupport);
router.get('/api/admin/support/tickets', handleSupport);
router.patch('/api/admin/support/tickets/:id', handleSupport);

router.post('/api/admin/r2-sync', handleR2Sync);
router.post('/api/admin/r2-upload', handleR2Upload);
router.get('/api/admin/orders', handleDashboardOrders);
router.get('/api/admin/orders/:id', handleDashboardOrders);
router.put('/api/admin/orders/:id', handleDashboardOrders);
router.delete('/api/admin/orders/:id', handleDashboardOrders);
router.get('/api/admin/pool/sync-notifications', handleGetSyncNotifications);
router.get('/api/admin/users', handleDashboardUsers);
router.put('/api/admin/users/:id', handleDashboardUsers);
router.delete('/api/admin/users/:id', handleDashboardUsers);
router.get('/api/admin/mixtapes', handleDashboardMixtapes);
router.post('/api/admin/mixtapes', handleDashboardMixtapes);
router.put('/api/admin/mixtapes/:id', handleDashboardMixtapes);
router.delete('/api/admin/mixtapes/:id', handleDashboardMixtapes);
router.get('/api/admin/subscriptions', handleDashboardSubscriptions);
router.post('/api/admin/subscriptions/manage', handleDashboardSubscriptions);
router.get('/api/admin/subscription_plans', handleDashboardSubscriptions);
router.post('/api/admin/subscription_plans', handleDashboardSubscriptions);
router.patch('/api/admin/subscription_plans/:id', handleDashboardSubscriptions);
router.put('/api/admin/subscription_plans/:id', handleDashboardSubscriptions);
router.delete('/api/admin/subscription_plans/:id', handleDashboardSubscriptions);
router.get('/api/admin/newsletter_subscribers', handleDashboardNewsletter);
router.get('/api/admin/newsletter_campaigns', handleDashboardNewsletter);
router.post('/api/admin/newsletter_campaigns', handleDashboardNewsletter);
router.patch('/api/admin/newsletter_campaigns/:id', handleDashboardNewsletter);
router.put('/api/admin/newsletter_campaigns/:id', handleDashboardNewsletter);
router.delete('/api/admin/newsletter_campaigns/:id', handleDashboardNewsletter);
router.delete('/api/admin/newsletter_subscribers/:email', handleDashboardNewsletter);
router.post('/api/newsletter/subscribe', handleDashboardNewsletter);

router.get('/api/admin/coupons', handleDashboardNewsletter);
router.post('/api/admin/coupons', handleDashboardNewsletter);
router.patch('/api/admin/coupons/:id', handleDashboardNewsletter);
router.put('/api/admin/coupons/:id', handleDashboardNewsletter);
router.delete('/api/admin/coupons/:id', handleDashboardNewsletter);

router.get('/api/admin/referrals/stats', handleDashboardReferrals);
router.get('/api/admin/referrals/logs', handleDashboardReferrals);

router.get('/api/admin/tips', handleDashboardFinances);
router.post('/api/admin/tips', handleDashboardFinances);

// Webhooks
router.post('/api/webhooks/paystack', handlePaystackWebhook);

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

// User Profile
router.post('/api/user/trial', handleTrialActivation);
router.get('/api/trial/status', handleTrialStatus);

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
        const url = new URL(request.url);
        const origin = request.headers.get("Origin");

        // Allowed origins for CORS
        const allowedOrigins = [
            "https://djflowerz.co.ke",
            "https://www.djflowerz.co.ke",
            "https://dj-flowerz.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000"
        ];

        // Simplified CORS logic: check if origin is in whitelist or is a vercel preview
        const isAllowedOrigin = origin && (
            allowedOrigins.includes(origin) || 
            origin.endsWith(".vercel.app")
        );

        // If origin is allowed, echo it. Otherwise, use the first allowed origin as default if not a credentialed request,
        // but since we want to be strict with credentials, we MUST return the specific origin.
        const corsOrigin = isAllowedOrigin ? origin : (origin ? "null" : allowedOrigins[0]);
        
        // Handle CORS PREFLIGHT
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": corsOrigin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, x-folder, x-file-name",
                    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
                    "Access-Control-Allow-Credentials": "true",
                    "Max-Age": "86400",
                }
            });
        }

        try {
            // --- PUBLIC FILE PROXY: GET /files/* ---
            if (request.method === "GET" && url.pathname.startsWith("/files/")) {
                const filePath = decodeURIComponent(url.pathname.replace("/files/", ""));
                const originParam = url.searchParams.get("origin");

                let originBase;
                if (originParam === "remix") {
                    originBase = "https://remix-and-mashups-worker.dennismacharia20.workers.dev";
                } else {
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

            const response = await router.handle(request, env, ctx);

            // Special handling for WebSockets
            if (response.status === 101) {
                return response;
            }

            // Add CORS headers to all responses
            const newHeaders = new Headers(response.headers);
            newHeaders.set("Access-Control-Allow-Origin", corsOrigin);
            newHeaders.set("Access-Control-Allow-Credentials", "true");

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (e) {
            console.error("[Worker Error]", e);
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: { 
                    "Content-Type": "application/json", 
                    "Access-Control-Allow-Origin": corsOrigin,
                    "Access-Control-Allow-Credentials": "true"
                }
            });
        }
    },
    async scheduled(event, env, ctx) {
        return handleScheduled(event, env, ctx);
    }
};
