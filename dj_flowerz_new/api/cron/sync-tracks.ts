
/**
 * Vercel Serverless Function: Track Sync Cron Task
 * Path: api/cron/sync-tracks.ts
 */

import { syncAllSources } from '../../utils/autoSyncTracks.js';

export default async function handler(req: any, res: any) {
    // 1. Verify Secret (for security)
    const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';
    const authHeader = req.headers['authorization'];

    // Check both query param and auth header
    const secret = req.query.secret || (authHeader ? authHeader.replace('Bearer ', '') : null);

    if (secret !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const results = await syncAllSources();

        return res.status(200).json({
            success: true,
            message: 'Tracks synchronized successfully',
            results
        });
    } catch (error: any) {
        console.error('Track sync error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
