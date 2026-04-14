
import { marketplaceItems, profiles } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthorizedUser } from '../utils/auth.js';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function handleMarketplace(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const user = await getAuthorizedUser(request, env);

    // 1. GET Marketplace Items (Public)
    if (request.method === 'GET' && !url.pathname.includes('/my-listings')) {
        try {
            const items = await env.DB.select()
                .from(marketplaceItems)
                .where(eq(marketplaceItems.status, 'active'))
                .orderBy(desc(marketplaceItems.createdAt))
                .all();
            
            return Response.json(items, { headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 2. GET My Listings (Vendor Only)
    if (request.method === 'GET' && url.pathname.includes('/my-listings')) {
        if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        try {
            const items = await env.DB.select()
                .from(marketplaceItems)
                .where(eq(marketplaceItems.vendorId, user.id))
                .all();
            return Response.json(items, { headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 3. POST Create Listing (Vendor Only)
    if (request.method === 'POST') {
        if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        
        // Ensure user is an approved vendor
        if (!user.isVendor || user.vendorStatus !== 'approved') {
            return new Response(JSON.stringify({ error: "Only approved vendors can list items." }), { status: 403, headers: corsHeaders });
        }

        try {
            const body = await request.json();
            const id = crypto.randomUUID();
            
            await env.DB.insert(marketplaceItems).values({
                id,
                vendorId: user.id,
                name: body.name,
                description: body.description,
                price: body.price,
                category: body.category,
                fileUrl: body.fileUrl,
                previewUrl: body.previewUrl,
                imageUrl: body.imageUrl,
                isDigital: body.isDigital ?? true,
                status: 'pending' // Admin must approve every listing
            }).run();

            return Response.json({ success: true, id }, { headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
}

/**
 * Handle Vendor Application
 */
export async function handleVendorSetup(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    
    const user = await getAuthorizedUser(request, env);
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    if (request.method === 'POST') {
        try {
            const body = await request.json();
            
            await env.DB.update(profiles)
                .set({
                    vendorSlug: body.vendorSlug,
                    vendorStatus: 'pending' // Admin veto
                })
                .where(eq(profiles.id, user.id))
                .run();

            return Response.json({ success: true }, { headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    }
}
