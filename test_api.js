
import fetch from 'node-fetch';

async function test() {
    const REMIX_HUB_URL = 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks';
    try {
        const resp = await fetch(REMIX_HUB_URL);
        const tracks = await resp.json();
        console.log(`Total tracks: ${tracks.length}`);
        const newest = tracks.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime()).slice(0, 5);
        console.log('Newest 5 tracks:');
        newest.forEach(t => console.log(`${t.uploaded} - ${t.key}`));
    } catch (e) {
        console.error(e);
    }
}
test();
