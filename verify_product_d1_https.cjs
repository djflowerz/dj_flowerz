const https = require('https');

async function verifyProductWorker() {
  console.log('Checking for product via Cloudflare Worker API...');
  
  const url = `https://djflowerz-worker.ianmuriithiflowerz.workers.dev/api/data/products.json?t=${Date.now()}`;
  
  https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        if (res.statusCode !== 200) {
            console.error(`Received status code ${res.statusCode}`);
            return;
        }

        const products = JSON.parse(data);
        console.log(`Fetched ${products.length} products.`);
        
        const product = products.find(p => p.name === 'Neon Stealth Headset Case');
        
        if (product) {
            console.log('Product FOUND successfully:');
            console.log(JSON.stringify(product, null, 2));
        } else {
            console.log('Product NOT found in the returned data.');
            console.log('Latest 3 products added (based on createdAt sorting):');
            const sorted = products.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,3);
            console.log(JSON.stringify(sorted.map(p => ({id: p.id, name: p.name, createdAt: p.createdAt})), null, 2));
        }
      } catch (e) {
        console.error('Error parsing JSON:', e.message);
      }
    });

  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });
}

verifyProductWorker();
