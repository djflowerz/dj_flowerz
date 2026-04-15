/**
 * Netlify Scheduled Function: sync-tracks
 *
 * Replaces the Vercel cron:
 *   { "path": "/api/sync-tracks", "schedule": "0 0 * * *" }
 *
 * Runs daily at 00:00 UTC.
 * Triggers the Cloudflare Worker's track-sync endpoint.
 */

const WORKER_URL =
  "https://djflowerz-worker.ianmuriithiflowerz.workers.dev/api/sync-tracks";

export const handler = async (event) => {
  console.log("[sync-tracks] Scheduled trigger fired:", event);

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET || "",
      },
    });

    const text = await response.text();
    console.log(`[sync-tracks] Worker responded ${response.status}: ${text}`);

    return {
      statusCode: response.ok ? 200 : response.status,
      body: text,
    };
  } catch (err) {
    console.error("[sync-tracks] Error calling worker:", err);
    return { statusCode: 500, body: err.message };
  }
};
