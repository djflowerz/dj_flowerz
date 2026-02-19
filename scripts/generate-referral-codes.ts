/**
 * Generate Referral Codes for Existing Users
 * This script creates unique referral codes for all users who don't have one
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// import { supabase } from '../utils/supabase';

// Generate a unique referral code based on user's name and ID
function generateReferralCode(name: string, userId: string): string {
    // Clean the name: remove spaces, special chars, convert to uppercase
    const cleanName = name
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .substring(0, 8);

    // Take last 4 chars of user ID
    const idSuffix = userId.replace(/-/g, '').substring(0, 4).toUpperCase();

    return `${cleanName}${idSuffix}`;
}

async function generateReferralCodes() {
    const { supabase } = await import('../utils/supabase');
    console.log('🔄 Fetching users without referral codes...\n');

    // Get all users without referral codes
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, name, email, referral_code')
        .or('referral_code.is.null,referral_code.eq.');

    if (error) {
        console.error('❌ Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('✅ All users already have referral codes!');
        return;
    }

    console.log(`📊 Found ${users.length} users without referral codes\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
        try {
            // Generate referral code
            const referralCode = generateReferralCode(user.name || user.email, user.id);

            // Check if code already exists (collision check)
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', referralCode)
                .single();

            let finalCode = referralCode;

            // If collision, add random suffix
            if (existing) {
                const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
                finalCode = `${referralCode.substring(0, 10)}${randomSuffix}`;
            }

            // Update user with referral code
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    referral_code: finalCode,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                console.error(`❌ Failed to update ${user.email}:`, updateError.message);
                errorCount++;
            } else {
                console.log(`✅ ${user.email} → ${finalCode}`);
                successCount++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
            console.error(`❌ Error processing ${user.email}:`, err);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));
}

// Run the script
generateReferralCodes()
    .then(() => {
        console.log('\n✅ Script completed!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Script failed:', err);
        process.exit(1);
    });
