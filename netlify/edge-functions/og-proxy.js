/**
 * Netlify Edge Function: og-proxy
 *
 * Replaces the Vercel `has: [{type: "header", key: "user-agent", value: "...bot..."}]` rewrites.
 * Intercepts requests from social crawlers / bots and proxies them to the Cloudflare
 * Worker's SEO endpoint so they get proper Open Graph meta tags.
 *
 * All normal browser requests pass straight through to the SPA.
 */

const BOT_PATTERN =
  /bot|facebookexternalhit|whatsapp|telegram|discord|slack|twitter|crawl|spider|preview/i;

const WORKER_BASE = "https://djflowerz-worker.ianmuriithiflowerz.workers.dev";

export default async function handler(request, context) {
  const ua = request.headers.get("user-agent") || "";

  // Let normal browser requests pass through to the SPA
  if (!BOT_PATTERN.test(ua)) {
    return context.next();
  }

  const url = new URL(request.url);
  const pathname = url.pathname; // e.g. /store/my-product-slug or /track/abc123

  // Determine target Worker endpoint
  let workerUrl;
  if (pathname.startsWith("/store/")) {
    const slug = pathname.replace("/store/", "");
    workerUrl = `${WORKER_BASE}/api/og-proxy?slug=${encodeURIComponent(slug)}`;
  } else if (pathname.startsWith("/track/")) {
    const trackId = pathname.replace("/track/", "");
    workerUrl = `${WORKER_BASE}/api/seo/track/${encodeURIComponent(trackId)}`;
  } else {
    return context.next();
  }

  try {
    const response = await fetch(workerUrl, {
      headers: {
        "user-agent": ua,
        accept: request.headers.get("accept") || "text/html",
      },
    });
    return response;
  } catch {
    // If worker is unreachable, fall back to the SPA
    return context.next();
  }
}

export const config = {
  // Runs on both /store/* and /track/* — paths defined in netlify.toml
  path: ["/store/*", "/track/*"],
};
