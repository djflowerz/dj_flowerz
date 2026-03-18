import { execSync } from 'child_process';

const columns = [
    { name: 'slug', type: 'TEXT' },
    { name: 'artist', type: 'TEXT DEFAULT "DJ Flowerz"' },
    { name: 'genre', type: 'TEXT' },
    { name: 'status', type: 'TEXT DEFAULT "draft"' },
    { name: 'allow_full_stream', type: 'INTEGER DEFAULT 1' },
    { name: 'allow_download', type: 'INTEGER DEFAULT 1' },
    { name: 'download_type', type: 'TEXT DEFAULT "free"' },
    { name: 'stream_quality', type: 'TEXT DEFAULT "high"' },
    { name: 'tracklist', type: 'TEXT' },
    { name: 'track_count', type: 'INTEGER DEFAULT 0' },
    { name: 'featured', type: 'INTEGER DEFAULT 0' },
    { name: 'is_free', type: 'INTEGER DEFAULT 1' },
    { name: 'download_enabled', type: 'INTEGER DEFAULT 1' },
    { name: 'enable_comments', type: 'INTEGER DEFAULT 1' },
    { name: 'require_login_to_comment', type: 'INTEGER DEFAULT 0' },
    { name: 'moderate_comments', type: 'INTEGER DEFAULT 0' },
    { name: 'video_download_url', type: 'TEXT' },
    { name: 'download_limit', type: 'INTEGER' },
    { name: 'download_expiry_days', type: 'INTEGER' },
    { name: 'youtube_url', type: 'TEXT' },
    { name: 'soundcloud_url', type: 'TEXT' },
    { name: 'meta_title', type: 'TEXT' },
    { name: 'meta_description', type: 'TEXT' },
    { name: 'og_image', type: 'TEXT' },
    { name: 'is_exclusive', type: 'INTEGER DEFAULT 0' }
];

async function migrate() {
    console.log('Starting migration for mixtapes table in D1...');

    for (const col of columns) {
        const query = `ALTER TABLE mixtapes ADD COLUMN ${col.name} ${col.type};`;
        console.log(`Adding column: ${col.name}...`);
        
        try {
            // Using --remote to execute on the production database
            const cmd = `wrangler d1 execute djflowerz-db --command="${query}" --remote -y`;
            execSync(cmd, { stdio: 'inherit' });
            console.log(`✅ Successfully added ${col.name}`);
        } catch (error: any) {
            if (error.message.includes('duplicate column name') || error.message.includes('already exists')) {
                console.log(`⚠️  Column ${col.name} already exists, skipping.`);
            } else {
                console.error(`❌ Error adding column ${col.name}:`, error.message);
            }
        }
    }

    console.log('Migration finished.');
}

migrate().catch(console.error);
