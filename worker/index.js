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
import { handleR2Sync, handleR2Upload } from './api/dashboard/sync.js';
import { handleStorefrontPool } from './api/storefront/pool.js';
import { handlePaystackWebhook } from './api/webhooks/paystack.js';
import { handleLegacy } from './api/legacy.js';
import { handleCommunity } from './api/community.js';
import { handleTrialActivation } from './api/user/trial.js';
import { AdminHub } from './utils/hub.js';

const router = new Router();

// Storefront API
router.get('/api/products', handleStorefrontProducts);
router.get('/api/products/:id', handleStorefrontProducts);
router.post('/api/orders', handleStorefrontOrders);
router.get('/api/pool/tracks', handleStorefrontPool);
router.get('/api/pool/download', handleStorefrontPool);

// Dashboard API
router.get('/api/admin/products', handleDashboardProducts);
router.post('/api/admin/products', handleDashboardProducts);
router.put('/api/admin/products/:id', handleDashboardProducts);
router.delete('/api/admin/products/:id', handleDashboardProducts);
router.post('/api/admin/r2-sync', handleR2Sync);
router.post('/api/admin/r2-upload', handleR2Upload);
router.get('/api/admin/orders', handleDashboardOrders);
router.get('/api/admin/orders/:id', handleDashboardOrders);
router.put('/api/admin/orders/:id', handleDashboardOrders);
router.delete('/api/admin/orders/:id', handleDashboardOrders);
router.get('/api/admin/users', handleDashboardUsers);
router.put('/api/admin/users/:id', handleDashboardUsers);
router.delete('/api/admin/users/:id', handleDashboardUsers);
router.get('/api/admin/mixtapes', handleDashboardMixtapes);
router.post('/api/admin/mixtapes', handleDashboardMixtapes);
router.put('/api/admin/mixtapes/:id', handleDashboardMixtapes);
router.delete('/api/admin/mixtapes/:id', handleDashboardMixtapes);
router.get('/api/admin/subscriptions', handleDashboardSubscriptions);
router.post('/api/admin/subscriptions/manage', handleDashboardSubscriptions);
router.get('/api/admin/newsletter_subscribers', handleDashboardNewsletter);
router.get('/api/admin/newsletter_campaigns', handleDashboardNewsletter);
router.delete('/api/admin/newsletter_subscribers/:id', handleDashboardNewsletter);
router.post('/api/newsletter/subscribe', handleDashboardNewsletter);

// Webhooks
router.post('/api/webhooks/paystack', handlePaystackWebhook);

// Community & Studio
router.get('/api/studio/locations', handleCommunity);
router.get('/api/studio/gear', handleCommunity);
router.get('/api/mixtapes/comments/:id', handleCommunity);
router.post('/api/mixtapes/comments', handleCommunity);

// User Profile
router.post('/api/user/trial', handleTrialActivation);

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
        // Handle CORS
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                }
            });
        }

        try {
            const response = await router.handle(request, env, ctx);

            // Special handling for WebSockets: return the original response if status is 101
            if (response.status === 101) {
                return response;
            }

            // Add CORS headers to all responses
            const newHeaders = new Headers(response.headers);
            newHeaders.set("Access-Control-Allow-Origin", "*");

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (e) {
            console.error("[Worker Error]", e);
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }
    }
};
