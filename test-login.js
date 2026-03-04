import { chromium } from 'playwright';

(async () => {
    console.log("Launching browser using local Chrome...");
    const browser = await chromium.launch({ channel: 'chrome' });
    const page = await browser.newPage();
    await page.goto('https://www.djflowerz.co.ke/#/login');
    console.log("Navigated to login page.");

    try {
        await page.fill('input[type="email"]', 'admin_test@example.com');
        await page.fill('input[type="password"]', 'WrongPassword123!');
        await page.click('button[type="submit"]');

        console.log("Clicked submit. Waiting for network or UI changes...");
        await page.waitForTimeout(3000);

        const pageText = await page.innerText('nav');
        console.log("--- NAVBAR TEXT ---");
        console.log(pageText.replace(/\n/g, ' '));
        console.log("-------------------");

        const errorText = await page.innerText('.bg-red-500\\/10').catch(() => "No error shown");
        console.log("Login Error shown on page:", errorText);

    } catch (e) {
        console.error("Test error:", e);
    }

    await browser.close();
})();
