
import { supabase } from './supabase';

// Supabase limits: Depends on plan, but usually much higher than Firestore free tier
const BATCH_SIZE = 500; // Supabase handles 500-1000 well in a single request
const DELAY_BETWEEN_BATCHES = 200;

interface SeedProgress {
    totalTracks: number;
    processedTracks: number;
    uploadedTracks: number;
    skippedTracks: number;
    currentBatch: number;
    totalBatches: number;
    isComplete: boolean;
    rangeComplete: boolean;
    lastProcessedIndex: number;
    currentTrackTitle?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const seedR2Tracks = async (
    onProgress: (msg: string, progress?: SeedProgress) => void,
    startFromIndex: number = 0,
    maxTracks: number = 1000000
) => {
    try {
        console.log("🚀 Starting R2 track seeding to Supabase...");
        onProgress("📥 Downloading track list...");

        const res = await fetch('/r2_tracks.json');
        if (!res.ok) throw new Error(`Failed to load track data: ${res.statusText}`);
        const allTracks = await res.json();

        const totalTracks = allTracks.length;
        const tracksToProcess = allTracks.slice(startFromIndex, startFromIndex + maxTracks);

        const progress: SeedProgress = {
            totalTracks,
            processedTracks: 0,
            uploadedTracks: 0,
            skippedTracks: 0,
            currentBatch: 0,
            totalBatches: Math.ceil(tracksToProcess.length / BATCH_SIZE),
            isComplete: false,
            rangeComplete: false,
            lastProcessedIndex: startFromIndex,
            currentTrackTitle: ''
        };

        onProgress(`📦 Prepared ${tracksToProcess.length} tracks. Starting upload...`, progress);

        for (let i = 0; i < tracksToProcess.length; i += BATCH_SIZE) {
            const batch = tracksToProcess.slice(i, i + BATCH_SIZE);
            const formattedBatch = batch.map((track: any) => {
                // Ensure field names match snake_case Supabase schema
                const download_url = track.downloadUrl || (track.versions && track.versions[0]?.downloadUrl);

                // Auto-detect version type if not present
                const fullText = ((track.title || '') + " " + (track.artist || '')).toUpperCase();
                let mainVersionLabel = 'Original';
                if (fullText.includes('INSTRUMENTAL')) mainVersionLabel = 'Instrumental';
                else if (fullText.includes('CLEAN') || fullText.includes('TV CLEAN')) mainVersionLabel = 'TV Clean';
                else if (fullText.includes('EXTENDED') || fullText.includes('EXTENDZ')) mainVersionLabel = 'Extendz';

                const versions = track.versions || [{
                    id: 'v1',
                    type: mainVersionLabel,
                    download_url: download_url
                }];

                return {
                    title: track.title,
                    artist: track.artist,
                    genre: track.genre || 'Uncategorized',
                    category: track.category || [],
                    bpm: track.bpm || 0,
                    year: track.year || new Date().getFullYear(),
                    preview_url: track.previewUrl || download_url,
                    download_url: download_url,
                    versions: versions,
                    date_added: track.dateAdded || new Date().toISOString()
                };
            }).filter(t => t.download_url); // Only insert if we have a download URL

            const { error } = await supabase
                .from('pool_tracks')
                .upsert(formattedBatch, { onConflict: 'download_url' });

            if (error) {
                console.error("❌ Supabase upload error:", error);
                throw error;
            }

            progress.processedTracks += batch.length;
            progress.uploadedTracks += formattedBatch.length;
            progress.currentBatch++;
            progress.lastProcessedIndex = startFromIndex + progress.processedTracks - 1;

            if (batch.length > 0) {
                progress.currentTrackTitle = `${batch[batch.length - 1].artist} - ${batch[batch.length - 1].title}`;
            }

            const percentage = Math.round((progress.processedTracks / tracksToProcess.length) * 100);
            onProgress(
                `⬆️ Uploaded: ${percentage}% (${progress.processedTracks}/${tracksToProcess.length})`,
                progress
            );

            // Small delay to prevent hitting rate limits too hard
            await delay(DELAY_BETWEEN_BATCHES);
        }

        progress.rangeComplete = true;
        progress.isComplete = (progress.lastProcessedIndex + 1) >= totalTracks;

        if (progress.isComplete) {
            onProgress(`🎉 Database Fully Seeded! Total: ${progress.uploadedTracks} tracks uploaded.`, progress);
        } else {
            onProgress(`✅ Part Seeded! Uploaded ${progress.uploadedTracks} tracks.`, progress);
        }

        return progress;
    } catch (error: any) {
        console.error("💥 Seeding error:", error);
        onProgress(`❌ Error: ${error.message}`);
        throw error;
    }
};

export const resumeSeedR2Tracks = async (
    onProgress: (msg: string, progress?: SeedProgress) => void,
    lastIndex: number
) => {
    return seedR2Tracks(onProgress, lastIndex + 1, 1000000);
};
