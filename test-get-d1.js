const WORKER_URL = 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

async function verify() {
  try {
    console.log("Fetching GET /api/products...");
    const pRes = await fetch(`${WORKER_URL}/api/products`);
    const products = await pRes.json();
    console.log(`Products Count: ${products.length}`);
    const testProd = products.find(p => p.id && p.id.startsWith("test-d1-prod-"));
    console.log("Found test product in D1:", !!testProd);

    console.log("\nFetching GET /api/mixtapes...");
    const mRes = await fetch(`${WORKER_URL}/api/mixtapes`);
    const mixtapes = await mRes.json();
    console.log(`Mixtapes Count: ${mixtapes.length}`);
    const testMix = mixtapes.find(m => m.id && m.id.startsWith("test-d1-mix-"));
    console.log("Found test mixtape in D1:", !!testMix);
  } catch(e) {
    console.error("Verification failed", e);
  }
}
verify();
