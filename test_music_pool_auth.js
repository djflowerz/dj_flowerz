import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const adminEmail = process.env.VITE_ADMIN_EMAIL || '';
  const adminPassword = '15457641c1d1c8016ed07e92c97685998ec1d   v1.0-d7c28c002855c962aae0a8b0-0acd7c6e666b03da632bf7caddb0f3f365b3d1bd4f871dbbdf49497c57a9368321409897fa20d6508e2fa79718ef65774030c73a25eff8d49de66989eeb628d3372dc0abda13605061';

  console.log('Navigating to login...');
  await page.goto('https://www.djflowerz.co.ke/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');

  console.log('Login submitted, waiting for redirect to Music Pool...');
  // Navigate directly after a short wait for the session to be established
  await page.waitForTimeout(5000);
  await page.goto('https://www.djflowerz.co.ke/music-pool', { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('Verifying Music Pool content...');
  // Wait for the tracks to load - look for h3 (track titles)
  await page.waitForSelector('h3', { timeout: 20000 });
  
  // Capture screenshot of the logged-in pool
  await page.screenshot({ path: '/Users/DJFLOWERZ/.gemini/antigravity/brain/f93168e4-7d2e-4386-b38f-95161aee9a9f/music_pool_auth.png' });
  console.log('Auth screenshot saved.');

  // Find a video track. We can look for tracks with a video icon or just the first one if we assume it works.
  // In TrackRow.tsx, the play button is a div.cursor-pointer.
  const firstTrack = page.locator('h3').first();
  const trackName = await firstTrack.innerText();
  console.log('Attempting to play track:', trackName);

  const playButtons = page.locator('div.cursor-pointer');
  console.log('Found', await playButtons.count(), 'play buttons.');
  
  if (await playButtons.count() > 0) {
    await playButtons.first().click();
    console.log('Clicked play.');
    await page.waitForTimeout(5000); // Wait for the player to expand
    await page.screenshot({ path: '/Users/DJFLOWERZ/.gemini/antigravity/brain/f93168e4-7d2e-4386-b38f-95161aee9a9f/music_pool_video_verify.png' });
    console.log('Playback screenshot saved.');
  }

  // Check for "All Versions" button which should now be visible for a subscriber/admin
  const allVersionsBtn = page.getByRole('button', { name: /all versions/i }).first();
  if (await allVersionsBtn.isVisible()) {
      console.log('SUCCESS: "All Versions" button is visible.');
  } else {
      console.log('WARNING: "All Versions" button NOT found even after login.');
  }

  await browser.close();
})();
