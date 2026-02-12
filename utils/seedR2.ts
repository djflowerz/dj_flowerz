
import { db } from '../firebase';

// Firestore free tier limits: 50,000 writes/day
const DAILY_WRITE_LIMIT = 45000; // Leave buffer for other operations
const BATCH_SIZE = 400; // Increased to 400 for faster throughput (max 500)
const DELAY_BETWEEN_BATCHES = 200; // 200ms delay - fast but safe

interface SeedProgress {
    totalTracks: number;
    processedTracks: number;
    uploadedTracks: number;
    skippedTracks: number;
    currentBatch: number;
    totalBatches: number;
    quotaUsed: number;
    quotaRemaining: number;
    isComplete: boolean;
    lastProcessedIndex: number;
}

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Check if track already exists (to avoid duplicates)
const trackExists = async (downloadUrl: string): Promise<boolean> => {
    try {
        const snapshot = await db.collection('poolTracks')
            .where('versions', 'array-contains', { downloadUrl })
            .limit(1)
            .get();
        return !snapshot.empty;
    } catch {
        return false;
    }
};

export const seedR2Tracks = async (
    onProgress: (msg: string, progress?: SeedProgress) => void,
    startFromIndex: number = 0,
    maxWrites: number = DAILY_WRITE_LIMIT
) => {
    try {
        console.log("🚀 Starting R2 track seeding...");
        onProgress("📥 Downloading track list...");

        const res = await fetch('/r2_tracks.json');
        if (!res.ok) throw new Error(`Failed to load track data: ${res.statusText}`);
        const allTracks = await res.json();

        const totalTracks = allTracks.length;
        const tracksToProcess = allTracks.slice(startFromIndex);
        const maxTracksThisRun = Math.min(tracksToProcess.length, maxWrites);

        console.log(`📊 Total tracks in file: ${totalTracks}`);
        console.log(`📍 Starting from index: ${startFromIndex}`);
        console.log(`🎯 Max tracks this run: ${maxTracksThisRun}`);

        const progress: SeedProgress = {
            totalTracks,
            processedTracks: 0,
            uploadedTracks: 0,
            skippedTracks: 0,
            currentBatch: 0,
            totalBatches: Math.ceil(maxTracksThisRun / BATCH_SIZE),
            quotaUsed: 0,
            quotaRemaining: maxWrites,
            isComplete: false,
            lastProcessedIndex: startFromIndex
        };

        onProgress(`📦 Processing ${maxTracksThisRun} tracks in ${progress.totalBatches} batches...`, progress);

        let batch = db.batch();
        let batchCount = 0;

        for (let i = 0; i < maxTracksThisRun && progress.quotaRemaining > 0; i++) {
            const track = tracksToProcess[i];
            progress.processedTracks++;
            progress.lastProcessedIndex = startFromIndex + i;

            // Clean undefined values
            const cleanTrack = JSON.parse(JSON.stringify(track));

            // Ensure required fields
            if (!cleanTrack.id) cleanTrack.id = db.collection('poolTracks').doc().id;
            if (!cleanTrack.dateAdded) cleanTrack.dateAdded = new Date().toISOString();

            // Check for duplicates (only for first batch to save quota)
            if (i < BATCH_SIZE && cleanTrack.versions?.[0]?.downloadUrl) {
                const exists = await trackExists(cleanTrack.versions[0].downloadUrl);
                if (exists) {
                    progress.skippedTracks++;
                    continue;
                }
            }

            // Auto-detect version type
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
            batchCount++;

            // Commit batch when full
            if (batchCount >= BATCH_SIZE) {
                try {
                    await batch.commit();
                    progress.uploadedTracks += batchCount;
                    progress.quotaUsed += batchCount;
                    progress.quotaRemaining -= batchCount;
                    progress.currentBatch++;

                    const percentage = Math.round((progress.uploadedTracks / maxTracksThisRun) * 100);
                    onProgress(
                        `⬆️ Uploaded: ${percentage}% (${progress.uploadedTracks}/${maxTracksThisRun}) | Quota: ${progress.quotaRemaining} remaining`,
                        progress
                    );

                    console.log(`✅ Batch ${progress.currentBatch}/${progress.totalBatches} committed (${batchCount} tracks)`);

                    // Reset batch
                    batch = db.batch();
                    batchCount = 0;

                    // Delay to avoid rate limiting
                    await delay(DELAY_BETWEEN_BATCHES);
                } catch (error: any) {
                    console.error("❌ Batch commit error:", error);
                    if (error.code === 'resource-exhausted') {
                        onProgress(`⚠️ Quota exceeded. Uploaded ${progress.uploadedTracks} tracks. Resume from index ${progress.lastProcessedIndex + 1}`, progress);
                        throw new Error(`Quota exceeded. Resume from index: ${progress.lastProcessedIndex + 1}`);
                    }
                    throw error;
                }
            }
        }

        // Commit remaining tracks
        if (batchCount > 0 && progress.quotaRemaining > 0) {
            try {
                await batch.commit();
                progress.uploadedTracks += batchCount;
                progress.quotaUsed += batchCount;
                progress.currentBatch++;
                console.log(`✅ Final batch committed (${batchCount} tracks)`);
            } catch (error: any) {
                console.error("❌ Final batch error:", error);
                throw error;
            }
        }

        progress.isComplete = (progress.lastProcessedIndex + 1) >= totalTracks;

        if (progress.isComplete) {
            onProgress(`🎉 Complete! Uploaded ${progress.uploadedTracks} tracks (${progress.skippedTracks} skipped)`, progress);
        } else {
            onProgress(
                `✅ Session complete! Uploaded ${progress.uploadedTracks} tracks. Resume tomorrow from index ${progress.lastProcessedIndex + 1}`,
                progress
            );
        }

        console.log("📊 Seeding summary:", {
            uploaded: progress.uploadedTracks,
            skipped: progress.skippedTracks,
            quotaUsed: progress.quotaUsed,
            lastIndex: progress.lastProcessedIndex,
            isComplete: progress.isComplete
        });

        return progress;
    } catch (error: any) {
        console.error("💥 Seeding error:", error);
        onProgress(`❌ Error: ${error.message}`);
        throw error;
    }
};

// Helper function to resume seeding from a specific index
export const resumeSeedR2Tracks = async (
    onProgress: (msg: string, progress?: SeedProgress) => void,
    lastIndex: number
) => {
    return seedR2Tracks(onProgress, lastIndex + 1, DAILY_WRITE_LIMIT);
};
