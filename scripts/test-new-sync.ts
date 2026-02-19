
import { syncTracksFromSource } from '../utils/autoSyncTracks';

async function testSync() {
    console.log('Running test sync for remixMashups...');
    const result = await syncTracksFromSource('remixMashups');
    console.log('Result:', result);
}

testSync().catch(console.error);
