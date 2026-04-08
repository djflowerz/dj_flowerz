import { execSync } from 'child_process';

async function verify() {
    console.log("--- Music Pool Restoration Verification ---");

    try {
        console.log("\n1. Checking Track Counts...");
        const trackCount = execSync('npx wrangler d1 execute djflowerz-db --command="SELECT COUNT(*) FROM tracks;" --remote').toString();
        const versionCount = execSync('npx wrangler d1 execute djflowerz-db --command="SELECT COUNT(*) FROM track_versions;" --remote').toString();

        console.log("Track Count Output:", trackCount.match(/│\s+(\d+)\s+│/)[1]);
        console.log("Version Count Output:", versionCount.match(/│\s+(\d+)\s+│/)[1]);

        console.log("\n2. Spot Checking March 2026 content...");
        const marchTrack = execSync('npx wrangler d1 execute djflowerz-db --command="SELECT title, genre FROM tracks WHERE genre = \'March 2026 Edits\' LIMIT 3;" --remote').toString();
        console.log("March 2026 Samples:\n", marchTrack);

        console.log("\n3. Checking Hub mapping (Remix & Mashups)...");
        const remixCheck = execSync('npx wrangler d1 execute djflowerz-db --command="SELECT title, hub FROM tracks WHERE hub = \'Remix & Mashups Hub\' LIMIT 1;" --remote').toString();
        console.log("Remix Hub Sample:\n", remixCheck);

        console.log("\n4. Checking Video Pool mapping...");
        const videoCheck = execSync('npx wrangler d1 execute djflowerz-db --command="SELECT title, hub FROM tracks WHERE hub = \'Video Pool\' LIMIT 1;" --remote').toString();
        console.log("Video Pool Sample:\n", videoCheck);

    } catch (error) {
        console.error("Verification failed:", error.message);
    }
}

verify();
