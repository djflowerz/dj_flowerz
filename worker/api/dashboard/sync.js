// worker/api/dashboard/sync.js

export async function handleR2Upload(request, env, ctx, params) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const rawFileName = request.headers.get("x-file-name") || `upload_${Date.now()}`;
        // Decode any URL-encoded characters, then sanitize for R2 key safety
        const decodedName = decodeURIComponent(rawFileName);
        const safeFileName = decodedName.replace(/[^a-zA-Z0-9._\-]/g, '_');
        const folder = request.headers.get("x-folder") || 'uploads';
        const contentType = request.headers.get("content-type") || "application/octet-stream";
        const key = `${folder}/${safeFileName}`;

        // Stream the request body directly to R2 for better memory efficiency with large files
        await env.R2_BUCKET.put(key, request.body, {
            httpMetadata: { contentType }
        });

        const publicDomain = env.PUBLIC_R2_DOMAIN || 'pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev';
        return new Response(JSON.stringify({
            success: true,
            url: `https://${publicDomain}/${key}`,
            key: key
        }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleR2Sync(request, env, ctx, params) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const bodyBytes = await request.text();
        // Ensure we handle huge JSON bodies safely
        const body = JSON.parse(bodyBytes);

        const { collection, data, action, item, id, items, ids } = body;

        if (!collection) {
            return new Response(JSON.stringify({ error: "Missing collection" }), { status: 400 });
        }

        const key = `data/${collection}.json`;

        if (action) {
            let existingData = [];
            try {
                const obj = await env.R2_BUCKET.get(key);
                if (obj) {
                    const text = await obj.text();
                    existingData = JSON.parse(text);
                }
            } catch (err) {
                // ignore if doesn't exist
            }

            if (action === 'add' && item) {
                existingData.unshift(item);
            } else if (action === 'addBatch' && Array.isArray(items)) {
                existingData = [...items, ...existingData];
            } else if (action === 'deleteBatch' && Array.isArray(ids)) {
                const idSet = new Set(ids);
                existingData = existingData.filter(i => !idSet.has(i.id));
            } else if (action === 'update' && item && id) {
                const idx = existingData.findIndex(i => i.id === id);
                if (idx !== -1) existingData[idx] = { ...existingData[idx], ...item };
                else existingData.unshift({ ...item, id });
            } else if (action === 'delete' && id) {
                existingData = existingData.filter(i => i.id !== id);
            }

            // Deduplication Step
            const seenIds = new Set();
            existingData = existingData.filter(i => {
                if (!i.id) return true;
                if (seenIds.has(i.id)) return false;
                seenIds.add(i.id);
                return true;
            });

            await env.R2_BUCKET.put(key, JSON.stringify(existingData), {
                httpMetadata: { contentType: "application/json" }
            });

            return new Response(JSON.stringify({ success: true, message: `Synced ${collection} via ${action}` }), { headers: { "Content-Type": "application/json" } });
        } else if (data) {
            // Full replace
            await env.R2_BUCKET.put(key, JSON.stringify(data), {
                httpMetadata: { contentType: "application/json" }
            });
            return new Response(JSON.stringify({ success: true, message: `Replaced ${collection} to R2` }), { headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ error: "Must provide data or action" }), { status: 400 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
