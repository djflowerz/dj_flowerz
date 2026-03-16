const https = require('https');

async function verifyProductR2() {
  console.log('Checking for product in public R2 bucket...');
  
  const url = `https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/data/products.json?t=${Date.now()}`;
  
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
        console.log(`Fetched ${products.length} products from R2.`);
        
        const product = products.find(p => p.name === 'Neon Stealth Headset Case');
        
        if (product) {
            console.log('✅ Product FOUND successfully in R2:');
            console.log(JSON.stringify(product, null, 2));
        } else {
            console.log('❌ Product NOT found in the returned data.');
            console.log('Latest 3 products added (based on createdAt sorting):');
            const sorted = products.filter(p => p.createdAt).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,3);
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

verifyProductR2();
