
import { syncAllSources } from '../../../utils/autoSyncTracks';

interface Env {
    CRON_SECRET?: string;
}

export async function onRequest(context: any) {
    const { request, env } = context;
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const CRON_SECRET = env.CRON_SECRET || 'your-secret-key-change-this';

    if (secret !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const results = await syncAllSources();
        return new Response(JSON.stringify({ success: true, results }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
