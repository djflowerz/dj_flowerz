
import { syncAllSources } from '../utils/autoSyncTracks';

console.log("Starting manual sync script...");

// Execute the sync function
syncAllSources()
    .then((results) => {
        console.log("Sync script finished successfully.");
        // Optional: Log summary or specific details if needed
        // console.log(results);
        process.exit(0);
    })
    .catch((err) => {
        console.error("Sync script failed:", err);
        process.exit(1);
    });
