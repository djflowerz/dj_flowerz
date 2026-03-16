import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function bulkSync() {
    const dataPath = path.resolve(process.cwd(), 'pool_tracks.json');
    if (!fs.existsSync(dataPath)) {
        console.error('pool_tracks.json not found!');
        process.exit(1);
    }

    const tracks = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`🚀 Loaded ${tracks.length} tracks from pool_tracks.json`);

    const batchSize = 100;
    const totalBatches = Math.ceil(tracks.length / batchSize);

    for (let i = 0; i < tracks.length; i += batchSize) {
        const batchIndex = Math.floor(i / batchSize) + 1;
        const batch = tracks.slice(i, i + batchSize);
        
        console.log(`📦 Processing batch ${batchIndex}/${totalBatches} (${batch.length} tracks)...`);

        let sql = 'INSERT OR REPLACE INTO tracks (id, title, artist, genre, sub_genre, release_date, audio_url, download_url, tags, created_at, is_active, is_featured) VALUES \n';
        
        const values = batch.map(t => {
            const id = (t.id || t.key || '').replace(/'/g, "''");
            const title = (t.title || t.baseTitle || 'Unknown').replace(/'/g, "''");
            const artist = (t.artist || 'Unknown').replace(/'/g, "''");
            const genre = (t.genre || 'Other').replace(/'/g, "''");
            const sub_genre = (t.subGenre || 'ROOT').replace(/'/g, "''");
            const release_date = (t.dateAdded || t.uploaded || new Date().toISOString()).replace(/'/g, "''");
            const audio_url = (t.previewUrl || '').replace(/'/g, "''");
            const download_url = audio_url; 
            const tags = (Array.isArray(t.category) ? t.category.join(',') : '').replace(/'/g, "''");
            const created_at = (t.uploaded || new Date().toISOString()).replace(/'/g, "''");
            
            return `('${id}', '${title}', '${artist}', '${genre}', '${sub_genre}', '${release_date}', '${audio_url}', '${download_url}', '${tags}', '${created_at}', 1, 0)`;
        }).join(',\n');

        sql += values + ';';
        
        const sqlFile = path.resolve(process.cwd(), `temp_sync.sql`);
        fs.writeFileSync(sqlFile, sql);
        
        let retries = 3;
        while (retries > 0) {
            try {
                execSync(`yes | npx wrangler d1 execute djflowerz-db --file="${sqlFile}" --remote`, { 
                    stdio: 'inherit' 
                });
                console.log(`✅ Batch ${batchIndex} successfully synced.`);
                break;
            } catch (err: any) {
                retries--;
                console.error(`⚠️  Failed at batch ${batchIndex} (${retries} retries left):`, err.message);
                if (retries === 0) {
                    process.exit(1);
                }
                console.log('⏳ Waiting 5s before retry...');
                execSync('sleep 5');
            }
        }
        
        // Add a small 1s delay between successful batches to be nice to the API
        execSync('sleep 1');
    }

    console.log('✨ Bulk sync completed!');
}

bulkSync().catch(err => {
    console.error('💥 Fatal error during sync:', err);
    process.exit(1);
});
