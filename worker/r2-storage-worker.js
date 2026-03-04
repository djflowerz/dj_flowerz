
/**
 * Unified Cloudflare Worker for DJ Flowerz (D1 + R2 + KV + Vectorize)
 * 
 * Features:
 * - D1: Structured data (products, mixtapes, profiles)
 * - R2: Assets (images, audio)
 * - KV: Configuration, Sessions, A/B Testing
 * - Vectorize: AI Semantic Search
 * - Workers AI: Generating embeddings for Vector search
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // --- 1. CORS Pre-flight ---
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-folder, x-file-name",
        };

        if (method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // --- 2. CONFIGURATION (KV) ---
            if (path === "/api/config") {
                const config = await env.KV.get("SITE_CONFIG");
                return new Response(config || "{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // --- 3. PRODUCTS & MIXTAPES (D1) ---
            // Fetch All Products: GET /api/products
            if (method === "GET" && path === "/api/products") {
                const { results } = await env.DB.prepare("SELECT * FROM products WHERE is_active = 1").all();
                return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Add Product: POST /api/products
            if (method === "POST" && path === "/api/products") {
                const data = await request.json();
                const { id, name, description, price, category, image } = data;

                // Save to D1
                await env.DB.prepare(
                    "INSERT INTO products (id, name, description, price, category, image) VALUES (?, ?, ?, ?, ?, ?)"
                ).bind(id, name, description, price, category, image).run();

                // Vectorize: Generate embedding for semantic search
                if (env.AI && env.VECTOR_INDEX) {
                    const textToEmbed = `${name}: ${description || ''}`;
                    const embeddingResponse = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [textToEmbed] });
                    const vector = embeddingResponse.data[0];
                    await env.VECTOR_INDEX.upsert([{ id: id, values: vector, metadata: { name, type: 'product' } }]);
                }

                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // --- 4. SEMANTIC SEARCH (Vectorize) ---
            // Search: GET /api/search?q=chilled+reggae+vibe
            if (method === "GET" && path === "/api/search") {
                const query = url.searchParams.get("q");
                if (!query) return new Response("Missing query", { status: 400 });

                // Generate embedding for query
                const embeddingResponse = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [query] });
                const vector = embeddingResponse.data[0];

                // Search index
                const matches = await env.VECTOR_INDEX.query(vector, { topK: 5, returnMetadata: true });
                return new Response(JSON.stringify(matches), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // --- 5. ASSET STORAGE (R2) ---
            // Upload to R2: PUT /api/upload
            if (method === "PUT" && path.startsWith("/api/upload/")) {
                const key = path.replace("/api/upload/", "");
                const body = await request.arrayBuffer();
                const contentType = request.headers.get("content-type") || "application/octet-stream";

                await env.R2_BUCKET.put(key, body, {
                    httpMetadata: { contentType }
                });

                return new Response(JSON.stringify({
                    success: true,
                    url: `https://${env.PUBLIC_R2_DOMAIN}/${key}`
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            return new Response("DJ Flowerz API: Operation not found", { status: 404, headers: corsHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }
};
