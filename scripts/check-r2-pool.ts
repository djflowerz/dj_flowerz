async function checkPool() {
    try {
        const url = 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/data/pool_tracks.json';
        console.log(`Fetching from: ${url}`);
        const res = await fetch(url);
        if (res.ok) {
            const data: any = await res.json();
            console.log(`Total tracks: ${data.length}`);

            // Look for 2026
            const tracks2026 = data.filter((t: any) =>
                JSON.stringify(t).toLowerCase().includes('2026')
            );
            console.log(`2026 tracks found: ${tracks2026.length}`);

            if (tracks2026.length > 0) {
                console.log('Sample 2026 track categories/genres:');
                tracks2026.slice(0, 5).forEach((t: any) => {
                    console.log(`- ${t.title} | Genre: ${t.genre} | Categories: ${JSON.stringify(t.category)} | Date Added: ${t.dateAdded}`);
                });

                const feb2026 = tracks2026.filter((t: any) =>
                    JSON.stringify(t).toLowerCase().includes('feb')
                );
                console.log(`Feb 2026 tracks found: ${feb2026.length}`);
            } else {
                console.log('No 2026 tracks found in the JSON.');
                console.log('Top 5 recent tracks in JSON:');
                data.slice(0, 5).forEach((t: any) => {
                    console.log(`- ${t.title} | Date: ${t.dateAdded || t.createdAt}`);
                });
            }
        } else {
            console.error(`Fetch failed: ${res.status} ${res.statusText}`);
        }
    } catch (err: any) {
        console.error(`Error: ${err.message}`);
    }
}

checkPool();
