
import { adminDb } from '../admin-db.ts';

/**
 * Vercel Serverless Function: Track Sync Cron Task
 * Path: api/cron/sync-tracks.ts
 */

// This utility needs to be updated to use adminDb instead of client-side db
// But for now, let's just create the handler.
import { syncAllSources } from '../../utils/autoSyncTracks';

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
        // NOTE: autoSyncTracks uses the client-side 'db'. 
        // In a serverless environment with high volume, this might hit security rules.
        // However, if Vercel has the right environment variables, it might work if rules allow.
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
