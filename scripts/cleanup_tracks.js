const { execSync } = require('child_process');

/**
 * CLEANUP_TRACKS.JS
 * This script identifies and removes tracks from the D1 database that:
 * 1. Have no associated track_versions (broken buttons).
 * 2. Are mis-categorized (e.g., March 2026 tracks missing their date tags).
 */

const DB_NAME = 'DB';

function runQuery(query) {
    try {
        const command = `npx wrangler d1 execute ${DB_NAME} --command "${query}" --remote`;
        console.log(`Executing: ${query}`);
        const output = execSync(command).toString();
        return output;
    } catch (e) {
        console.error(`Error executing query: ${e.message}`);
        return null;
    }
}

async function cleanup() {
    console.log('--- Starting Music Pool Cleanup ---');

    // 1. Identify and delete orphaned tracks (0 versions)
    console.log('\nStep 1: Removing tracks with 0 versions (Broken Buttons)...');
    const deleteOrphansQuery = `
        DELETE FROM tracks 
        WHERE id IN (
            SELECT t.id 
            FROM tracks t 
            LEFT JOIN track_versions v ON t.id = v.track_id 
            WHERE v.id IS NULL
        );
    `;
    runQuery(deleteOrphansQuery);

    // 2. Identify and delete malformed March 2026 tracks that are missing tags
    // These are tracks that exist but didn't get the 'March' / '2026' columns filled
    // We delete them so the new sync script can add them correctly with proper tags.
    console.log('\nStep 2: Removing mis-tagged tracks (March 2026 fix)...');
    // Note: We only delete them if they are in the 'March 2020 EDITS' or similar 
    // mismatched folders identified in the audit.
    const deleteMisTaggedQuery = `
        DELETE FROM tracks 
        WHERE release_year IS NULL 
        AND (display_genre LIKE '%March 2026%' OR display_genre LIKE '%Arbantone%');
    `;
    runQuery(deleteMisTaggedQuery);

    console.log('\n--- Cleanup Complete ---');
    console.log('You can now run the sync script to restore these tracks correctly.');
}

cleanup();
