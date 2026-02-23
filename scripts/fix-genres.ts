
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
});

async function run() {
    const tracksPath = path.join(process.cwd(), 'public/data/pool_tracks.json');
    const tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));

    // Extract unique genres
    const genreSets = new Set<string>();
    for (const t of tracks) {
        if (t.genre) {
            genreSets.add(t.genre);
        }
        if (t.category && Array.isArray(t.category)) {
            t.category.forEach((c: string) => genreSets.add(c));
        }
    }

    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const uniqueGenres = Array.from(genreSets).filter(name => !months.includes(name.toLowerCase())).sort();

    const newGenres = uniqueGenres.map(name => ({
        id: crypto.randomUUID(),
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        trackCount: tracks.filter((t: any) => t.genre === name || (t.category && t.category.includes(name))).length,
        is_active: true,
        created_at: new Date().toISOString()
    }));

    const outputString = JSON.stringify(newGenres, null, 2);
    const outputPath = path.join(process.cwd(), 'public/data/genres.json');
    fs.writeFileSync(outputPath, outputString);
    console.log(`Saved ${newGenres.length} active genres locally.`);

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'data/genres.json',
        Body: Buffer.from(outputString),
        ContentType: 'application/json',
    });
    await s3.send(command);
    console.log("✅ Uploaded fixed genres to R2.");
}

run().catch(console.error);
