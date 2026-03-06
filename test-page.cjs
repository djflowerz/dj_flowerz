const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log('Navigating...');
    await page.goto('http://localhost:3000/store/lenovo-thinkpad-yoga-11e-x360-core-i5-7th-gen-8gb-ram-256gb-ssd-11-6--touchscreen');
    await page.waitForTimeout(5000); // wait a bit to catch async errors

    console.log('HTML extraction...');
    const html = await page.content();
    console.log("HTML length:", html.length);

    await browser.close();
})();
