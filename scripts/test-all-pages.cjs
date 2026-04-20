const { chromium } = require('playwright');

/**
 * DJ FLOWERZ - COMPREHENSIVE PAGE VERIFICATION
 * This script verifies that all core public routes render correctly.
 */

const BASE_URL = process.env.TEST_URL || 'https://www.djflowerz.co.ke';
const ROUTES = [
    '/',
    '/community',
    '/music-pool',
    '/store',
    '/mixtapes',
    '/bookings',
    '/contact',
    '/about',
    '/community/djflowerz',
    '/login',
    '/signup'
];

async function run() {
    console.log(`\n🚀 Starting verification for: ${BASE_URL}\n`);
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'DJ-Flowerz-Verification-Bot/1.0'
    });
    const page = await context.newPage();

    let successCount = 0;
    let failCount = 0;

    for (const route of ROUTES) {
        const url = `${BASE_URL}${route}`;
        console.log(`🔍 Checking: ${route}...`);
        
        try {
            const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const status = response.status();
            
            if (status >= 200 && status < 400) {
                console.log(`✅ [${status}] OK`);
                successCount++;
            } else {
                console.error(`❌ [${status}] FAILED`);
                failCount++;
            }

            // Check for critical console errors
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    console.log(`   🔸 Console Error: ${msg.text()}`);
                }
            });

        } catch (error) {
            console.error(`❌ FATAL ERROR: ${error.message}`);
            failCount++;
        }
    }

    console.log(`\n📊 Final Result: ${successCount} PASSED, ${failCount} FAILED\n`);
    
    await browser.close();
    
    if (failCount > 0) process.exit(1);
    process.exit(0);
}

run();
