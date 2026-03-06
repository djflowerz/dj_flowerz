export default async function handler(req, res) {
    // 1. Verify Secret (for security)
    const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';
    const authHeader = req.headers['authorization'];

    // Check both query param and auth header
    const secret = req.query?.secret || (authHeader ? authHeader.replace('Bearer ', '') : null);

    if (secret !== CRON_SECRET) {
        // Also allow Vercel cron signature
        if (!req.headers['x-vercel-cron-signature']) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        // Use dynamic import for the utility to avoid top-level issues
        const { syncAllSources } = await import('../utils/autoSyncTracks.js');

        const results = await syncAllSources();

        return res.status(200).json({
            success: true,
            message: 'Tracks synchronized successfully',
            results
        });
    } catch (error) {
        console.error('Track sync error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
