/**
 * Netlify Scheduled Function: check-subscriptions
 *
 * Replaces the Vercel cron:
 *   { "path": "/api/check-subscriptions", "schedule": "0 1 * * *" }
 *
 * Runs daily at 01:00 UTC.
 * Triggers the Cloudflare Worker's subscription-checker endpoint.
 */

const WORKER_URL =
  "https://djflowerz-worker.ianmuriithiflowerz.workers.dev/api/check-subscriptions";

export const handler = async (event) => {
  console.log("[check-subscriptions] Scheduled trigger fired:", event);

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass a shared secret so the worker knows this is an authorised cron call
        "x-cron-secret": process.env.CRON_SECRET || "",
      },
    });

    const text = await response.text();
    console.log(
      `[check-subscriptions] Worker responded ${response.status}: ${text}`
    );

    return {
      statusCode: response.ok ? 200 : response.status,
      body: text,
    };
  } catch (err) {
    console.error("[check-subscriptions] Error calling worker:", err);
    return { statusCode: 500, body: err.message };
  }
};
