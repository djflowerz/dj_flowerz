import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Track {
    id: string;
    artist: string;
    title: string;
    previewUrl?: string;
    versions?: Array<{
        id: string;
        type: string;
        downloadUrl: string;
    }>;
}

async function scanTracks() {
    console.log('🔍 Scanning Music Pool tracks for playback issues...\n');

    try {
        // Fetch all tracks
        const { data: tracks, error } = await supabase
            .from('pool_tracks')
            .select('*')
            .order('date_added', { ascending: false });

        if (error) {
            console.error('❌ Error fetching tracks:', error.message);
            return;
        }

        if (!tracks || tracks.length === 0) {
            console.log('ℹ️  No tracks found in the database.');
            return;
        }

        console.log(`📊 Total tracks: ${tracks.length}\n`);

        const problematicTracks: Array<{
            id: string;
            artist: string;
            title: string;
            issue: string;
        }> = [];

        // Check each track
        for (const track of tracks) {
            const issues: string[] = [];

            // Check if track has any playable URL
            const hasPreviewUrl = track.preview_url && track.preview_url.trim() !== '';
            const versions = track.versions || [];
            const hasValidVersion = versions.some((v: any) => v.downloadUrl && v.downloadUrl.trim() !== '');

            if (!hasPreviewUrl && !hasValidVersion) {
                issues.push('No preview URL or download URL');
            } else if (!hasPreviewUrl && versions.length === 0) {
                issues.push('No preview URL and no versions');
            } else if (versions.length === 0) {
                issues.push('No versions available');
            }

            // Check for empty/null URLs in versions
            if (versions.length > 0) {
                const invalidVersions = versions.filter((v: any) => !v.downloadUrl || v.downloadUrl.trim() === '');
                if (invalidVersions.length > 0) {
                    issues.push(`${invalidVersions.length} version(s) with missing download URL`);
                }
            }

            if (issues.length > 0) {
                problematicTracks.push({
                    id: track.id,
                    artist: track.artist || 'Unknown Artist',
                    title: track.title || 'Unknown Title',
                    issue: issues.join(', ')
                });
            }
        }

        // Report results
        console.log('═══════════════════════════════════════════════════════════\n');

        if (problematicTracks.length === 0) {
            console.log('✅ All tracks have valid playback URLs!\n');
        } else {
            console.log(`⚠️  Found ${problematicTracks.length} tracks with playback issues:\n`);
            console.log('═══════════════════════════════════════════════════════════\n');

            problematicTracks.forEach((track, index) => {
                console.log(`${index + 1}. ${track.artist} - ${track.title}`);
                console.log(`   ID: ${track.id}`);
                console.log(`   Issue: ${track.issue}`);
                console.log('');
            });

            console.log('═══════════════════════════════════════════════════════════\n');
            console.log('📋 Summary:');
            console.log(`   Total tracks scanned: ${tracks.length}`);
            console.log(`   Problematic tracks: ${problematicTracks.length}`);
            console.log(`   Success rate: ${((tracks.length - problematicTracks.length) / tracks.length * 100).toFixed(2)}%`);
            console.log('\n═══════════════════════════════════════════════════════════\n');

            // Save to file
            const fs = require('fs');
            const reportPath = './problematic-tracks-report.json';
            fs.writeFileSync(reportPath, JSON.stringify(problematicTracks, null, 2));
            console.log(`💾 Detailed report saved to: ${reportPath}\n`);
        }

    } catch (err: any) {
        console.error('❌ Unexpected error:', err.message);
    }
}

scanTracks();
