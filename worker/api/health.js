// worker/api/health.js

export async function handleHealth(request, env) {
    try {
        // Test D1 connection
        await env.DB.prepare("SELECT 1").run();
        
        // Test R2 connection
        await env.R2_BUCKET.list({ limit: 1 });

        return new Response(JSON.stringify({
            status: "online",
            timestamp: new Date().toISOString(),
            components: { 
                d1: "connected", 
                r2: "connected", 
                do: "active" 
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({
            status: "degraded",
            error: e.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
