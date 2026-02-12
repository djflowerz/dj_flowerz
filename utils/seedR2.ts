
import { db } from '../firebase';

export const seedR2Tracks = async (onProgress: (msg: string) => void) => {
    try {
        console.log("Fetching tracks...");
        onProgress("Downloading track list...");
        const res = await fetch('/r2_tracks.json');
        if (!res.ok) throw new Error(`Failed to load track data: ${res.statusText}`);
        const tracks = await res.json();

        console.log(`Found ${tracks.length} tracks.`);
        onProgress(`Found ${tracks.length} tracks. Clearing existing data...`);

        // 1. Delete all existing tracks first (Limit to 500 per batch delete)
        const deleteBatchSize = 500;
        const collectionRef = db.collection('poolTracks');
        const snapshot = await collectionRef.limit(deleteBatchSize).get();

        if (!snapshot.empty) {
            let deletedCount = 0;
            onProgress("Deleting existing tracks...");

            // Recursive deletion function
            const deleteQueryBatch = async (query: any, resolve: any) => {
                const snapshot = await query.get();

                const batchSize = snapshot.size;
                if (batchSize === 0) {
                    resolve();
                    return;
                }

                const batch = db.batch();
                snapshot.docs.forEach((doc: any) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                deletedCount += batchSize;
                onProgress(`Deleted ${deletedCount} existing tracks...`);

                setTimeout(() => {
                    deleteQueryBatch(query, resolve);
                }, 0);
            };

            await new Promise((resolve, reject) => {
                deleteQueryBatch(collectionRef.limit(deleteBatchSize), resolve).catch(reject);
            });
            onProgress("All existing tracks deleted. Starting upload...");
        }

        const batchSize = 400; // Safe batch size
        let batch = db.batch();
        let count = 0;
        let totalBatches = Math.ceil(tracks.length / batchSize);
        let currentBatch = 0;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];

            // Clean undefined values which Firestore rejects
            const cleanTrack = JSON.parse(JSON.stringify(track));

            // Ensure ID and date exist
            if (!cleanTrack.id) cleanTrack.id = db.collection('poolTracks').doc().id;
            if (!cleanTrack.dateAdded) cleanTrack.dateAdded = new Date().toISOString();

            // Auto-detect version type from title/artist
            const fullText = ((cleanTrack.title || '') + " " + (cleanTrack.artist || '')).toUpperCase();
            let mainVersionLabel = 'Original';

            if (fullText.includes('INSTRUMENTAL')) mainVersionLabel = 'Instrumental';
            else if (fullText.includes('CLEAN') || fullText.includes('TV CLEAN')) mainVersionLabel = 'TV Clean';
            else if (fullText.includes('EXTENDED') || fullText.includes('EXTENDZ')) mainVersionLabel = 'Extendz';

            if (cleanTrack.versions && cleanTrack.versions.length > 0) {
                cleanTrack.versions[0].type = mainVersionLabel;
            } else if (cleanTrack.downloadUrl) {
                cleanTrack.versions = [{
                    id: 'v1',
                    type: mainVersionLabel,
                    downloadUrl: cleanTrack.downloadUrl
                }];
            }

            const docRef = db.collection('poolTracks').doc(cleanTrack.id);
            batch.set(docRef, cleanTrack);
            count++;

            if (count % batchSize === 0) {
                await batch.commit();
                currentBatch++;
                const percentage = Math.round((currentBatch / totalBatches) * 100);
                onProgress(`Uploading: ${percentage}% (${count}/${tracks.length} tracks)`);
                console.log(`Batch ${currentBatch}/${totalBatches} committed.`);
                batch = db.batch();
            }
        }

        if (count % batchSize !== 0) {
            await batch.commit();
            console.log("Final batch committed.");
        }

        onProgress(`Success! Uploaded ${count} tracks.`);
        console.log("Seeding complete.");
    } catch (error: any) {
        console.error("Seeding error:", error);
        onProgress(`Error: ${error.message}`);
        throw error;
    }
};
