import { chromium } from 'playwright';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

async function addProduct() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 }); 
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning' || msg.text().includes('[DataContext]')) {
      console.log(`[Browser Console ${msg.type().toUpperCase()}]: ${msg.text()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/products') || response.url().includes('r2-sync')) {
      console.log(`[Network Response] ${response.request().method()} ${response.url()} => ${response.status()}`);
    }
  });

  const baseUrl = 'https://www.djflowerz.co.ke';
  const adminEmail = 'testadmin@example.com';
  const adminPassword = 'Admin_Password_123!'; 

  console.log('Navigating to login page...');
  await page.goto(`${baseUrl}/login`);
  await page.waitForLoadState('networkidle');

  try {
    console.log('Attempting login...');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    console.log('Waiting for login to process...');
    await page.waitForTimeout(5000); 

    if (!page.url().includes('/admin')) {
      console.log('Navigating explicitly to /admin...');
      await page.goto(`${baseUrl}/admin`);
    }

    await page.waitForURL(url => url.toString().includes('/admin'), { timeout: 30000 });
    console.log('Admin Dashboard Loaded.');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // EXTRA WAIT for hydration

    console.log('Clicking "Catalog Manager" button...');
    await page.waitForSelector('button:has-text("Catalog Manager")', { timeout: 15000 });
    await page.click('button:has-text("Catalog Manager")', { force: true });

    console.log('Waiting for Inventory page to load...');
    await page.waitForTimeout(5000);

    console.log('Clicking "CATALOG NEW ITEM" button...');
    await page.waitForSelector('button:has-text("CATALOG NEW ITEM")', { timeout: 15000 });
    await page.click('button:has-text("CATALOG NEW ITEM")', { force: true });

    console.log('Waiting for modal...');
    await page.waitForTimeout(3000);
    const modalScreenshot = `modal_check_${Date.now()}.png`;
    await page.screenshot({ path: modalScreenshot, fullPage: true });
    console.log(`Modal screenshot saved: ${modalScreenshot}`);

    // Based on previous knowledge of this UI:
    console.log('Selecting Physical Product if present...');
    try {
        await page.click('h3:has-text("Physical Product")', { force: true, timeout: 5000 });
    } catch (e) {
        console.log('Physical Product selection not needed or not found.');
    }

    console.log('Navigating tabs and filling data...');
    
    // BASIC Tab
    console.log('Filling BASIC tab...');
    await page.click('button:has-text("BASIC")');
    await page.fill('label:has-text("PRODUCT NAME") + div input', 'Neon Stealth Headset Case V6');
    await page.fill('label:has-text("BRAND") + div input', 'Havit Pro Apex');
    await page.fill('label:has-text("BASE PRICE (KES)") + div input', '1200');
    await page.fill('label:has-text("DISCOUNT PRICE") + div input', '900');
    await page.fill('label:has-text("COMPARE AT PRICE") + div input', '1500');

    // Scroll to find Logistics/Status if hidden
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1000);

    // VARIANTS Tab
    console.log('Clicking VARIANTS tab...');
    await page.click('button:has-text("VARIANTS")');
    await page.waitForTimeout(1000);
    // Note: We might want to add a variant here, but for now let's just test basics
    
    // IMAGES Tab
    console.log('Clicking IMAGES tab...');
    await page.click('button:has-text("IMAGES")');
    await page.waitForTimeout(1000);
    
    try {
        console.log('Attempting image upload...');
        const imagePath = path.resolve(__dirname, 'public/images/products/havit-waterproof.png');
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }),
          page.click('label:has-text("UPLOAD TO CF R2")', { force: true }),
        ]);
        await fileChooser.setFiles(imagePath);
        console.log('Image uploaded.');
        await page.waitForTimeout(3000); 
    } catch (e) {
        console.log('Image upload issue:', e.message);
    }

    console.log('Saving...');
    await page.click('button:has-text("Save Product")', { force: true });

    console.log('Waiting for confirmation...');
    await page.waitForTimeout(5000);
    
    const finalScreenshot = `success_final_${Date.now()}.png`;
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    console.log(`Mission accomplished! Screenshot: ${finalScreenshot}`);

  } catch (error) {
    console.error('ERROR:', error);
    const failScreenshot = `fail_final_${Date.now()}.png`;
    await page.screenshot({ path: failScreenshot, fullPage: true });
    console.log(`Failure saved: ${failScreenshot}`);
  } finally {
    await browser.close();
  }
}

addProduct().catch(console.error);
