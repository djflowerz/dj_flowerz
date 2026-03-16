const fetch = require('node-fetch'); // May need to install or use native fetch if Node >= 18

async function verifyProductWorker() {
  console.log('Checking for product via Cloudflare Worker API...');
  
  // Try to fetch from the /api/data/products.json endpoint as used in fetchFromR2
  const url = `https://djflowerz-worker.ianmuriithiflowerz.workers.dev/api/data/products.json?t=${Date.now()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch from worker: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.length} products.`);
    
    const product = data.find(p => p.name === 'Neon Stealth Headset Case');
    
    if (product) {
        console.log('Product FOUND successfully:');
        console.log(JSON.stringify(product, null, 2));
    } else {
        console.log('Product NOT found in the returned data.');
    }
  } catch (error) {
    console.error('Verification error:', error.message);
  }
}

verifyProductWorker();
