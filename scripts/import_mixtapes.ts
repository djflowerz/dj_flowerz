import fs from 'fs';
import path from 'path';

async function generateMixtapesSql() {
    const mixtapesPath = path.join(process.cwd(), 'public/data/mixtapes.json');
    const sqlFile = path.join(process.cwd(), 'mixtapes-seed.sql');

    if (!fs.existsSync(mixtapesPath)) {
        console.error("Mixtapes JSON not found");
        return;
    }

    const mixtapes = JSON.parse(fs.readFileSync(mixtapesPath, 'utf8'));
    let sqlOutput = `-- Inserting ${mixtapes.length} mixtapes\n`;

    mixtapes.forEach((m: any) => {
        const id = m.id || m.title?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
        const title = m.title?.replace(/'/g, "''");
        const artist = m.artist?.replace(/'/g, "''") || 'DJ Flowerz';
        const genre = (m.genre || 'General').replace(/'/g, "''");
        const desc = (m.description?.replace(/'/g, "''").replace(/\n/g, " ") || '').substring(0, 1000);
        const cover = m.cover_url?.startsWith('data:') ? '' : (m.cover_url || '');
        const audio = m.audio_url?.startsWith('data:') ? '' : (m.audio_url || '');
        const download = m.download_url?.startsWith('data:') ? '' : (m.download_url || '');
        const tier = m.required_tier || 'free';
        const isFeatured = m.is_featured ? 1 : 0;
        const releaseDate = m.release_date || '';
        const duration = m.duration || '';
        const tags = Array.isArray(m.tags) ? m.tags.join(',') : (m.tags || '');

        sqlOutput += `INSERT OR REPLACE INTO mixtapes (id, title, artist, genre, description, cover_url, audio_url, download_url, required_tier, is_featured, release_date, duration, tags, cover_image, status) VALUES ('${id}', '${title}', '${artist}', '${genre}', '${desc}', '${cover}', '${audio}', '${download}', '${tier}', ${isFeatured}, '${releaseDate}', '${duration}', '${tags}', '${cover}', 'published');\n`;
    });

    fs.writeFileSync(sqlFile, sqlOutput);
    console.log(`✅ SQL Seed file generated: ${sqlFile}`);
}

generateMixtapesSql().catch(console.error);
