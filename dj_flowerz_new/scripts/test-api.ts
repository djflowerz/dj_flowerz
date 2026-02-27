
import fetch from 'node-fetch';

const SOURCES = {
    remix: 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks',
    video: 'https://r2.vicknickvideopool.com/api/tracks'
};

async function testApis() {
    console.log("Testing Remix API...");
    try {
        const res1 = await fetch(SOURCES.remix);
        if (res1.ok) {
            const data1 = await res1.json();
            console.log(`Remix API OK. Count: ${Array.isArray(data1) ? data1.length : 'Not array'}`);
            if (Array.isArray(data1) && data1.length > 0) {
                console.log("Sample Remix Track:", data1[0]);
            }
        } else {
            console.log(`Remix API Failed: ${res1.status}`);
        }
    } catch (e) {
        console.log(`Remix API Error: ${e.message}`);
    }

    console.log("\nTesting Video Pool API...");
    try {
        const res2 = await fetch(SOURCES.video);
        if (res2.ok) {
            const data2 = await res2.json();
            console.log(`Video API OK. Count: ${Array.isArray(data2) ? data2.length : 'Not array'}`);
            if (Array.isArray(data2) && data2.length > 0) {
                console.log("Sample Video Track:", data2[0]);
            }
        } else {
            console.log(`Video API Failed: ${res2.status}`);
        }
    } catch (e) {
        console.log(`Video API Error: ${e.message}`);
    }
}

testApis();
