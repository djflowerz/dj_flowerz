async function checkR2() {
  try {
    const pRes = await fetch('https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products.json');
    const products = await pRes.json();
    console.log(`R2 Products Count: ${products.length}`);
    const testProd = products.find(p => p.id && p.id.startsWith("test-d1-prod-"));
    console.log("Found test product in R2:", !!testProd);

    const mRes = await fetch('https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/mixtapes.json');
    const mixtapes = await mRes.json();
    console.log(`R2 Mixtapes Count: ${mixtapes.length}`);
    const testMix = mixtapes.find(m => m.id && m.id.startsWith("test-d1-mix-"));
    console.log("Found test mixtape in R2:", !!testMix);

  } catch(e) {
    console.error("R2 fetch failed", e);
  }
}
checkR2();
