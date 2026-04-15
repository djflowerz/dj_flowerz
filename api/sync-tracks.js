/**
 * Netlify Function: sync-tracks
 * Can be triggered manually at /.netlify/functions/sync-tracks
 * Scheduled version lives in netlify/functions/sync-tracks.js
 */
export const handler = async (event) => {
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = event.headers?.authorization || '';
  const cronHeader = event.headers?.['x-cron-secret'] || '';
  const querySecret = event.queryStringParameters?.secret || '';

  if (cronSecret) {
    const isAuthorised =
      authHeader === `Bearer ${cronSecret}` ||
      cronHeader === cronSecret ||
      querySecret === cronSecret;
    if (!isAuthorised) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }
  }

  try {
    const { syncAllSources } = await import('../utils/autoSyncTracks.js');
    const results = await syncAllSources();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Tracks synchronized successfully',
        results,
      }),
    };
  } catch (error) {
    console.error('Track sync error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
