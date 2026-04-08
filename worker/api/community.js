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
            `).bind(data.name || null, data.rate || null, data.description || null, data.features ? JSON.stringify(data.features) : null, data.image_url || null, id).run();
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
            `).bind(data.name || null, data.hourly_rate || null, data.category || null, data.image_url || null, data.description || null, id).run();
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
        const { results } = await env.DB.prepare(`
            SELECT * FROM interactions 
            WHERE target_id = ? AND target_type = 'mixtape' AND type = 'comment' AND status = 'approved' 
            ORDER BY createdAt DESC
        `).bind(mixtapeId).all();
        return Response.json(results);
    }

    if (method === "POST" && path === "/api/mixtapes/comments") {
        const comment = await request.json();
        const id = `cmt_${Date.now()}`;
        await env.DB.prepare(`
            INSERT INTO interactions (id, user_id, user_name, target_id, target_type, type, content, status)
            VALUES (?, ?, ?, ?, 'mixtape', 'comment', 'approved')
        `).bind(id, comment.userId || null, comment.userName, comment.mixtapeId, comment.text).run();

        // Award 2 points for comment if logged in
        if (comment.userId) {
            await env.DB.prepare("UPDATE profiles SET loyalty_points = loyalty_points + 2 WHERE id = ?")
                .bind(comment.userId).run();

            const historyId = `lh_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
            await env.DB.prepare(`
                INSERT INTO loyalty_history (id, user_id, points, type, description)
                VALUES (?, ?, 2, 'comment', ?)
            `).bind(historyId, comment.userId, `Earned 2 points for commenting on mixtape`).run();
        }

        return Response.json({ success: true, id });
    }

    if (path === "/api/admin/comments" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM interactions WHERE type = 'comment' ORDER BY createdAt DESC").all();
        return Response.json(results || []);
    }

    if (path === "/api/admin/reviews" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM interactions WHERE type = 'review' ORDER BY createdAt DESC").all();
        return Response.json(results || []);
    }

    // Unified Admin Interactions (Approve/Hide/Edit/Delete)
    if (path.startsWith("/api/admin/interactions")) {
        const id = path.split("/").pop();
        
        if (method === "GET") {
            const { results } = await env.DB.prepare("SELECT * FROM interactions ORDER BY createdAt DESC").all();
            return Response.json(results || []);
        }

        if (method === "PATCH" || method === "PUT") {
            const data = await request.json();
            await env.DB.prepare(`
                UPDATE interactions 
                SET status = COALESCE(?, status),
                    content = COALESCE(?, content),
                    rating = COALESCE(?, rating)
                WHERE id = ?
            `).bind(data.status || null, data.content || null, data.rating || null, id).run();
            return Response.json({ success: true });
        }

        if (method === "DELETE") {
            await env.DB.prepare("DELETE FROM interactions WHERE id = ?").bind(id).run();
            return Response.json({ success: true });
        }
    }

    // --- Reviews ---
    if (path === "/api/reviews") {
        if (method === "GET") {
            const productId = url.searchParams.get("productId");
            let query = "SELECT * FROM interactions WHERE type = 'review' AND status = 'approved'";
            let params = [];
            if (productId) {
                query += " AND target_id = ? AND target_type = 'product'";
                params.push(productId);
            }
            query += " ORDER BY createdAt DESC";
            const { results } = await env.DB.prepare(query).bind(...params).all();
            return Response.json(results);
        }
        if (method === "POST") {
            const review = await request.json();
            const id = `rev_${Date.now()}`;
            await env.DB.prepare(`
                INSERT INTO interactions (id, user_id, target_id, target_type, type, user_name, rating, content, status)
                VALUES (?, ?, ?, 'product', 'review', ?, ?, ?, 'approved')
            `).bind(id, review.userId || null, review.productId, review.userName, review.rating, review.comment).run();

            // Award 5 points for review if logged in
            if (review.userId) {
                await env.DB.prepare("UPDATE profiles SET loyalty_points = loyalty_points + 5 WHERE id = ?")
                    .bind(review.userId).run();

                const historyId = `lh_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
                await env.DB.prepare(`
                    INSERT INTO loyalty_history (id, user_id, points, type, description)
                    VALUES (?, ?, 5, 'review', ?)
                `).bind(historyId, review.userId, `Earned 5 points for product review`).run();
            }

            return Response.json({ success: true, id });
        }
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
            `).bind(data.studioId || null, data.gearId || null, data.issue || null, data.status || null, id).run();
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
            `).bind(data.name || null, data.price || null, data.duration || null, data.description || null, data.features ? JSON.stringify(data.features) : null, data.image_url || null, data.active !== undefined ? (data.active ? 1 : 0) : null, id).run();
            return Response.json({ success: true });
        }
        if (method === "DELETE") {
            await env.DB.prepare("DELETE FROM session_types WHERE id = ?").bind(id).run();
            return Response.json({ success: true });
        }
    }

    return new Response("Not Found", { status: 404 });
}
