
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';

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

async function optimizePoolTracks() {
    const tracksPath = path.join(process.cwd(), 'public/data/pool_tracks.json');
    if (!fs.existsSync(tracksPath)) {
        console.error("pool_tracks.json not found");
        return;
    }

    // Read and parse
    console.log("Reading pool_tracks.json...");
    const tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));
    console.log(`Minifying ${tracks.length} tracks...`);

    // We can also trim down unnecessary data if there are huge unneeded fields.
    // For now, just stringify without spaces.
    const minifiedData = JSON.stringify(tracks);
    console.log(`Minified size: ${(minifiedData.length / 1024 / 1024).toFixed(2)} MB`);

    fs.writeFileSync(tracksPath, minifiedData);
    console.log("✅ Minified pool_tracks.json saved locally.");

    console.log("Uploading to R2...");
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'data/pool_tracks.json',
        Body: Buffer.from(minifiedData),
        ContentType: 'application/json',
    });
    await s3.send(command);
    console.log("✅ Uploaded optimized pool_tracks.json to R2.");
}

optimizePoolTracks().catch(err => console.error(err));
