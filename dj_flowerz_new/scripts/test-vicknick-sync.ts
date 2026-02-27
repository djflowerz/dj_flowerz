
import { syncTracksFromSource } from '../utils/autoSyncTracks';

async function testSync() {
    console.log('Running test sync for vicknickR2...');
    const result = await syncTracksFromSource('vicknickR2');
    console.log('Result:', result);
}

testSync().catch(console.error);
