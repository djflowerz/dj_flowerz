export async function handleCommunity(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- Studio Locations ---
    if (path === "/api/studio/locations") {
        if (method === "GET") {
            const { results } = await env.DB.prepare("SELECT * FROM studio_locations").all();
            const formatted = results.map(l => ({
                ...l,
                features: l.features ? JSON.parse(l.features) : []
            }));
            return Response.json(formatted);
        }
    }

    if (path.startsWith("/api/admin/studio/locations")) {
        // Admin operations for locations
        const id = path.split("/").pop();
        if (method === "POST") {
            const data = await request.json();
            const newId = data.id || `loc_${Date.now()}`;
            await env.DB.prepare(`
                INSERT INTO studio_locations (id, name, rate, description, features, image_url)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(newId, data.name, data.rate, data.description, JSON.stringify(data.features || []), data.image_url).run();
            return Response.json({ success: true, id: newId });
        }
        if (method === "PUT" || method === "PATCH") {
            const data = await request.json();
            await env.DB.prepare(`
                UPDATE studio_locations 
                SET name = COALESCE(?, name), 
                    rate = COALESCE(?, rate), 
                    description = COALESCE(?, description), 
                    features = COALESCE(?, features), 
                    image_url = COALESCE(?, image_url)
                WHERE id = ?
            `).bind(data.name, data.rate, data.description, data.features ? JSON.stringify(data.features) : null, data.image_url, id).run();
            return Response.json({ success: true });
        }
        if (method === "DELETE") {
            await env.DB.prepare("DELETE FROM studio_locations WHERE id = ?").bind(id).run();
            return Response.json({ success: true });
        }
    }

    // --- Studio Gear ---
    if (path === "/api/studio/gear") {
        if (method === "GET") {
            const { results } = await env.DB.prepare("SELECT * FROM studio_gear").all();
            return Response.json(results);
        }
    }

    if (path.startsWith("/api/admin/studio/gear")) {
        const id = path.split("/").pop();
        if (method === "POST") {
            const data = await request.json();
            const newId = data.id || `gear_${Date.now()}`;
            await env.DB.prepare(`
                INSERT INTO studio_gear (id, name, hourly_rate, category, image_url, description)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(newId, data.name, data.hourly_rate, data.category, data.image_url, data.description).run();
            return Response.json({ success: true, id: newId });
        }
        if (method === "PUT" || method === "PATCH") {
            const data = await request.json();
            await env.DB.prepare(`
                UPDATE studio_gear 
                SET name = COALESCE(?, name), 
                    hourly_rate = COALESCE(?, hourly_rate), 
                    category = COALESCE(?, category), 
                    image_url = COALESCE(?, image_url), 
                    description = COALESCE(?, description)
                WHERE id = ?
            `).bind(data.name, data.hourly_rate, data.category, data.image_url, data.description, id).run();
            return Response.json({ success: true });
        }
        if (method === "DELETE") {
            await env.DB.prepare("DELETE FROM studio_gear WHERE id = ?").bind(id).run();
            return Response.json({ success: true });
        }
    }

    // --- Mixtape Comments ---
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

    if (path === "/api/admin/comments" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM mixtape_comments ORDER BY created_at DESC").all();
        return Response.json(results);
    }

    // --- Reviews ---
    if (path === "/api/reviews") {
        if (method === "GET") {
            const productId = url.searchParams.get("productId");
            let query = "SELECT * FROM reviews WHERE status = 'approved'";
            let params = [];
            if (productId) {
                query += " AND product_id = ?";
                params.push(productId);
            }
            query += " ORDER BY created_at DESC";
            const { results } = await env.DB.prepare(query).bind(...params).all();
            return Response.json(results);
        }
        if (method === "POST") {
            const review = await request.json();
            const id = `rev_${Date.now()}`;
            await env.DB.prepare(`
                INSERT INTO reviews (id, product_id, user_name, rating, comment, status)
                VALUES (?, ?, ?, ?, ?, 'approved')
            `).bind(id, review.productId, review.userName, review.rating, review.comment).run();
            return Response.json({ success: true, id });
        }
    }

    if (path === "/api/admin/reviews" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM reviews ORDER BY created_at DESC").all();
        return Response.json(results);
    }

    // --- Studio Maintenance ---
    if (path === "/api/admin/studio/maintenance") {
        if (method === "GET") {
            const { results } = await env.DB.prepare("SELECT * FROM studio_maintenance ORDER BY created_at DESC").all();
            return Response.json(results);
        }
        if (method === "POST") {
            const data = await request.json();
            const id = data.id || `maint_${Date.now()}`;
            await env.DB.prepare(`
                INSERT INTO studio_maintenance (id, studio_id, gear_id, issue, status)
                VALUES (?, ?, ?, ?, ?)
            `).bind(id, data.studioId, data.gearId, data.issue, data.status || 'pending').run();
            return Response.json({ success: true, id });
        }
    }

    if (path.startsWith("/api/admin/studio/maintenance/")) {
        const id = path.split("/").pop();
        if (method === "PATCH" || method === "PUT") {
            const data = await request.json();
            await env.DB.prepare(`
                UPDATE studio_maintenance 
                SET studio_id = COALESCE(?, studio_id),
                    gear_id = COALESCE(?, gear_id),
                    issue = COALESCE(?, issue),
                    status = COALESCE(?, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(data.studioId, data.gearId, data.issue, data.status, id).run();
            return Response.json({ success: true });
        }
    }

    // --- Session Types ---
    if (path === "/api/session_types") {
        if (method === "GET") {
            const { results } = await env.DB.prepare("SELECT * FROM session_types WHERE active = 1 ORDER BY created_at DESC").all();
            const formatted = results.map(s => ({
                ...s,
                features: s.features ? JSON.parse(s.features) : []
            }));
            return Response.json(formatted);
        }
    }

    if (path.startsWith("/api/admin/session_types")) {
        const id = path.split("/").pop();
        if (method === "GET") {
            const { results } = await env.DB.prepare("SELECT * FROM session_types ORDER BY created_at DESC").all();
            const formatted = results.map(s => ({
                ...s,
                features: s.features ? JSON.parse(s.features) : []
            }));
            return Response.json(formatted);
        }
        if (method === "POST") {
            const data = await request.json();
            const newId = data.id || `st_${Date.now()}`;
            await env.DB.prepare(`
                INSERT INTO session_types (id, name, price, duration, description, features, image_url, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(newId, data.name, data.price, data.duration, data.description, JSON.stringify(data.features || []), data.image_url, data.active !== false ? 1 : 0).run();
            return Response.json({ success: true, id: newId });
        }
        if (method === "PUT" || method === "PATCH") {
            const data = await request.json();
            await env.DB.prepare(`
                UPDATE session_types 
                SET name = COALESCE(?, name), 
                    price = COALESCE(?, price), 
                    duration = COALESCE(?, duration), 
                    description = COALESCE(?, description), 
                    features = COALESCE(?, features), 
                    image_url = COALESCE(?, image_url),
                    active = COALESCE(?, active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(data.name, data.price, data.duration, data.description, data.features ? JSON.stringify(data.features) : null, data.image_url, data.active !== undefined ? (data.active ? 1 : 0) : null, id).run();
            return Response.json({ success: true });
        }
        if (method === "DELETE") {
            await env.DB.prepare("DELETE FROM session_types WHERE id = ?").bind(id).run();
            return Response.json({ success: true });
        }
    }

    return new Response("Not Found", { status: 404 });
}
