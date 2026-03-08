const WORKER_URL = 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

async function testD1() {
  console.log("Creating a test product in D1...");
  try {
    const productData = {
      id: "test-d1-prod-" + Date.now(),
      name: "Test D1 Integration Product",
      price: 15.99,
      description: "This is a product created via the test script to verify D1 integration works correctly.",
      category: "Test",
      type: "Digital",
      cover_image: "https://djflowerz.co.ke/placeholder.png",
      date_added: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${WORKER_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer TEST_TOKEN_IGNORE" },
      body: JSON.stringify(productData)
    });
    const result = await res.text();
    console.log(`POST /api/products response [${res.status}]:`, result);

    console.log("\nCreating a test mixtape in D1...");
    const mixtapeData = {
      id: "test-d1-mix-" + Date.now(),
      title: "Test D1 Integration Mixtape",
      dj_name: "DJ Test API",
      price: 5.99,
      genre: "Bongo",
      download_url: "https://djflowerz.co.ke/placeholder.mp3",
      cover_image: "https://djflowerz.co.ke/placeholder.png",
      date_added: new Date().toISOString()
    };

    const mixRes = await fetch(`${WORKER_URL}/api/mixtapes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer TEST_TOKEN_IGNORE" },
      body: JSON.stringify(mixtapeData)
    });
    const mixResult = await mixRes.text();
    console.log(`POST /api/mixtapes response [${mixRes.status}]:`, mixResult);

  } catch (err) {
    console.error("Test failed:", err);
  }
}

testD1();
