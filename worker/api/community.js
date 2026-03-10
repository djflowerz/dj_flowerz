export async function handleCommunity(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "GET" && path === "/api/studio/locations") {
        const { results } = await env.DB.prepare("SELECT * FROM studio_locations").all();
        const formatted = results.map(l => ({
            ...l,
            features: l.features ? JSON.parse(l.features) : []
        }));
        return Response.json(formatted);
    }

    if (method === "GET" && path === "/api/studio/gear") {
        const { results } = await env.DB.prepare("SELECT * FROM studio_gear").all();
        return Response.json(results);
    }

    if (method === "GET" && path.startsWith("/api/mixtapes/comments/")) {
        const mixtapeId = path.split("/").pop();
        const { results } = await env.DB.prepare("SELECT * FROM mixtape_comments WHERE mixtape_id = ? AND status = 'approved' ORDER BY created_at DESC").bind(mixtapeId).all();
        return Response.json(results);
    }

    if (method === "POST" && path === "/api/mixtapes/comments") {
        const comment = await request.json();
        const id = `cmt_${Date.now()}`;
        await env.DB.prepare(`
            INSERT INTO mixtape_comments (id, mixtape_id, user_name, text, status)
            VALUES (?, ?, ?, ?, 'approved')
        `).bind(id, comment.mixtapeId, comment.userName, comment.text).run();
        return Response.json({ success: true, id });
    }

    return new Response("Not Found", { status: 404 });
}
