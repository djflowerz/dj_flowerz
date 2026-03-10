export class AdminHub {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = [];
    }

    async fetch(request) {
        const url = new URL(request.url);

        // WebSocket logic
        if (request.headers.get("Upgrade") === "websocket") {
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            server.accept();
            this.sessions.push(server);

            server.addEventListener("close", () => {
                this.sessions = this.sessions.filter(s => s !== server);
            });

            return new Response(null, { status: 101, webSocket: client });
        }

        // Broadcast logic (for webhook/admin)
        if (url.pathname === "/broadcast") {
            const data = await request.json();
            this.broadcast(data);
            return new Response("OK");
        }

        if (url.pathname === "/reset") {
            // Placeholder for state reset
            console.log("[AdminHub] System Reset requested.");
            return new Response("Reset OK");
        }

        return new Response("Not Found", { status: 404 });
    }

    broadcast(data) {
        const msg = JSON.stringify(data);
        this.sessions.forEach(s => {
            try { s.send(msg); } catch (e) { }
        });
    }
}
