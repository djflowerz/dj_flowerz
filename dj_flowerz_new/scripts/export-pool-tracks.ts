import { adminDb as db } from '../api/admin-db-deprecated';
import fs from 'fs';
import path from 'path';

async function exportPoolTracks() {
    console.log('🚀 Starting Music Pool Export (Admin Mode)...');
    const collectionRef = db.collection('poolTracks');
    const allTracks: any[] = [];
    let lastDoc = null;
    const batchSize = 1000;
    let totalFetched = 0;

    try {
        while (true) {
            try {
                let query = collectionRef.orderBy('__name__').limit(batchSize);
                if (lastDoc) {
                    query = query.startAfter(lastDoc);
                }

                const snapshot = await query.get();
                if (snapshot.empty) break;

                snapshot.docs.forEach(doc => {
                    allTracks.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                totalFetched += snapshot.docs.length;
                lastDoc = snapshot.docs[snapshot.docs.length - 1];

                console.log(`⏳ Fetched ${totalFetched} tracks...`);

                // Save intermediate progress every 5000 tracks
                if (totalFetched % 5000 === 0) {
                    const outputPath = path.resolve(process.cwd(), 'music_pool_export_partial.json');
                    fs.writeFileSync(outputPath, JSON.stringify(allTracks, null, 2));
                    console.log(`💾 Saved partial progress (${totalFetched} tracks)`);
                }
            } catch (err: any) {
                if (err.message && err.message.includes('Quota exceeded')) {
                    console.warn('⚠️ Quota exceeded! Saving what we have...');
                    break;
                }
                throw err;
            }
        }

        const outputPath = path.resolve(process.cwd(), 'music_pool_export.json');
        console.log(`💾 Writing ${allTracks.length} tracks to ${outputPath}...`);

        fs.writeFileSync(outputPath, JSON.stringify(allTracks, null, 2));

        console.log('✅ Export Finished!');
        if (allTracks.length < 40000) {
            console.log('⚠️ Note: Fetching was incomplete (likely due to quota).');
        }
        console.log(`Results saved to: ${outputPath}`);
    } catch (error) {
        console.error('❌ Export failed:', error);
    }
}

exportPoolTracks().then(() => process.exit(0));
