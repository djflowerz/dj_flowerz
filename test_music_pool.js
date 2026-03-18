import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Music Pool...');
  await page.goto('https://www.djflowerz.co.ke/music-pool', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for the tracks to load
  await page.waitForSelector('h3', { timeout: 15000 });
  const title = await page.title();
  console.log('Page title:', title);

  // Take an initial screenshot
  await page.screenshot({ path: '/Users/DJFLOWERZ/.gemini/antigravity/brain/f93168e4-7d2e-4386-b38f-95161aee9a9f/music_pool_load.png' });
  console.log('Screenshot saved to music_pool_load.png');

  // Find the first track title
  const firstTrack = page.locator('h3').first();
  const trackName = await firstTrack.innerText();
  console.log('Found track:', trackName);

  // Find the play button (cursor-pointer)
  const playButton = page.locator('div.cursor-pointer').first();
  await playButton.click();
  console.log('Clicked play button for:', trackName);

  // Wait for the player to expand (AnimatePresence usually takes a bit)
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/Users/DJFLOWERZ/.gemini/antigravity/brain/f93168e4-7d2e-4386-b38f-95161aee9a9f/music_pool_play.png' });
  console.log('Screenshot saved to music_pool_play.png');

  // Check for "All Versions" button visibility
  const allVersionsBtn = page.getByRole('button', { name: /all versions/i });
  if (await allVersionsBtn.isVisible()) {
    console.log('All Versions button is visible.');
  } else {
    console.log('All Versions button NOT found.');
  }

  await browser.close();
})();
