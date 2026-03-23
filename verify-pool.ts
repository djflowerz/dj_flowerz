import { chromium } from 'playwright';

(async () => {
    console.log("Starting verification...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log("Navigating to Music Pool live site...");
    await page.goto('https://djflowerz.co.ke/music-pool');
    
    // Wait for the tracks to load
    try {
        console.log("Waiting for track rows...");
        await page.waitForSelector('.group.relative', { timeout: 15000 });
    } catch (e) {
        console.log("Timeout waiting for tracks. Taking screenshot to debug.");
    }
    
    await page.screenshot({ path: 'pool-screenshot.png', fullPage: true });
    
    // Check TrackRows and HypeTrackRows
    // Usually they are in motion.div elements with specific classes like "group relative flex flex-col"
    const trackRows = await page.locator('.group.relative.flex.flex-col').all();
    console.log(`Found ${trackRows.length} track rows loading on the page.`);
    
    let allHaveButtons = true;
    for (let i = 0; i < Math.min(trackRows.length, 10); i++) {
        const row = trackRows[i];
        const titleText = await row.locator('h3').first().textContent();
        const title = titleText ? titleText.trim().replace('NEW', '').trim() : 'Unknown';
        
        // Count play/download buttons inside this row
        const playBtns = await row.locator('button:has(svg.lucide-play), button:has(svg.lucide-video)').count();
        const dlBtns = await row.locator('button:has(svg.lucide-download)').count();
        
        // Also check main thumbnail which usually has a play icon inside
        const thumbPlay = await row.locator('.group\\/play').count();
        
        const hasPlay = playBtns > 0 || thumbPlay > 0;
        const hasDl = dlBtns > 0;
        
        console.log(`Track [${title}] -> Has Play: ${hasPlay}, Has Download: ${hasDl} (DL count: ${dlBtns})`);
        
        if (!hasPlay || !hasDl) {
            allHaveButtons = false;
        }
    }
    
    if (trackRows.length === 0) {
        console.log("No tracks found, maybe loading took too long or there's an issue fetching.");
    } else {
        console.log(`\nVERIFICATION RESULT: All checked tracks have buttons: ${allHaveButtons ? 'YES! ✓' : 'NO ❌'}`);
    }
    
    await browser.close();
})().catch(err => {
    console.error("Error during verification:", err);
    process.exit(1);
});
