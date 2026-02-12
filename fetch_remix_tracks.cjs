#!/usr/bin/env node
/**
 * Fetch tracks from the Remix & Mashups Hub API
 * and save them to remix_tracks_data.json
 */

const https = require('https');
const fs = require('fs');

const API_URL = 'https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks';
const OUTPUT_FILE = 'remix_tracks_data.json';
const CDN_BASE = 'https://cdn.vicknickvideopool.com';
const FETCH_ALL = true; // Set to true to fetch all tracks, false to use LIMIT
const LIMIT = 200; // Number of tracks to fetch (only used if FETCH_ALL is false)

console.log('🔄 Fetching ALL tracks from Remix & Mashups Hub...');
console.log(`📡 API: ${API_URL}`);

https.get(API_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const tracks = JSON.parse(data);
            console.log(`✅ Received ${tracks.length} tracks from API`);

            // Take all tracks or limit based on FETCH_ALL flag
            const limitedTracks = FETCH_ALL ? tracks : tracks.slice(0, LIMIT);
            console.log(`📊 Processing ${limitedTracks.length} tracks...`);

            // Format tracks for our system
            const formattedTracks = limitedTracks.map(track => {
                // Construct URLs
                const encodedPath = track.key.split('/').map(encodeURIComponent).join('/');
                const previewLink = `${CDN_BASE}/${encodedPath}`;
                const downloadLink = previewLink; // Same as preview for consistency

                return {
                    title: track.baseTitle || 'Unknown Title',
                    artist: track.month || 'Remix & Mashups',
                    previewLink: previewLink,
                    downloadLink: downloadLink
                };
            });

            // Save to file
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(formattedTracks, null, 2));

            console.log(`\n✅ Successfully saved ${formattedTracks.length} tracks to ${OUTPUT_FILE}`);
            console.log(`\n📋 Sample tracks:`);
            console.log(`   First: ${formattedTracks[0].title}`);
            if (formattedTracks.length > 1) {
                console.log(`   Last: ${formattedTracks[formattedTracks.length - 1].title}`);
            }
            console.log(`\n🎯 Next step: Run 'python3 add_remix_mashups.py'`);

        } catch (error) {
            console.error('❌ Error parsing JSON:', error.message);
            process.exit(1);
        }
    });

}).on('error', (error) => {
    console.error('❌ Error fetching data:', error.message);
    process.exit(1);
});
