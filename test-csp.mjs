import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  console.log('Navigating to product page...');
  await page.goto('https://djflowerz.co.ke/store/alphatheta-ddj-flx2-2-deck-dj-controller', { waitUntil: 'networkidle' });

  console.log('Page loaded. Checking for errors...');
  if (errors.length > 0) {
    console.log('Errors found:');
    errors.forEach(e => console.log(e));
  } else {
    console.log('No CSP or console errors detected!');
  }

  await browser.close();
})();
