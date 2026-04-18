import { Env } from './types';
import { handleRequest } from './router';

// ─── Durable Object: AdminHub ──────────────────────────────────────────────────
// Handles real-time notifications for the Admin Dashboard via WebSockets.

export class AdminHub {
  state: DurableObjectState;
  sessions: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // WebSocket handshakes
    if (url.pathname === '/admin/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const [client, server] = new WebSocketPair();
      await this.handleSession(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // Broadcast messages via POST (internal or authorized external)
    if (request.method === 'POST') {
      try {
        const msg = await request.json();
        this.broadcast(msg);
        return new Response('OK');
      } catch (e) {
        return new Response('Invalid JSON', { status: 400 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  async handleSession(ws: WebSocket) {
    ws.accept();
    this.sessions.add(ws);

    ws.addEventListener('message', async (msg) => {
      // Logic for incoming client messages if needed
    });

    ws.addEventListener('close', () => {
      this.sessions.delete(ws);
    });

    ws.addEventListener('error', () => {
      this.sessions.delete(ws);
    });
  }

  broadcast(message: any) {
    const data = JSON.stringify(message);
    for (const session of this.sessions) {
      try {
        session.send(data);
      } catch (e) {
        this.sessions.delete(session);
      }
    }
  }
}

// ─── Main Worker Export ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // If it's an admin websocket request, route to AdminHub DO
    const url = new URL(request.url);
    if (url.pathname === '/api/admin/ws' || url.pathname === '/admin/ws') {
      const id = env.ADMIN_HUB.idFromName('global');
      const obj = env.ADMIN_HUB.get(id);
      return obj.fetch(request);
    }

    // Otherwise, route through the standard API router
    try {
      const response = await handleRequest(request, env, ctx);
      // Ensure blob: is allowed so Vite lazy-loaded chunks are never blocked
      const newHeaders = new Headers(response.headers);
      newHeaders.set(
        'Content-Security-Policy',
        "script-src 'self' blob: 'unsafe-inline' https:; object-src 'none';"
      );
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Actor-Id');
      
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (e: any) {
      console.error('Worker Error:', e);
      return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};
