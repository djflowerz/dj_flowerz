// worker/router.js

export class Router {
    constructor() {
        this.routes = [];
    }

    add(method, path, handler) {
        this.routes.push({
            method,
            path: new RegExp(`^${path.replace(/:[^\/]+/g, '([^/]+)')}$`),
            paramNames: (path.match(/:[^\/]+/g) || []).map(s => s.substring(1)),
            handler
        });
    }

    get(path, handler) { this.add('GET', path, handler); }
    post(path, handler) { this.add('POST', path, handler); }
    put(path, handler) { this.add('PUT', path, handler); }
    patch(path, handler) { this.add('PATCH', path, handler); }
    delete(path, handler) { this.add('DELETE', path, handler); }

    async handle(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;
        const method = request.method;

        for (const route of this.routes) {
            if (route.method === method) {
                const match = pathname.match(route.path);
                if (match) {
                    const params = {};
                    route.paramNames.forEach((name, i) => {
                        params[name] = match[i + 1];
                    });
                    return await route.handler(request, env, ctx, params);
                }
            }
        }

        return new Response("Not Found", { status: 404 });
    }
}
