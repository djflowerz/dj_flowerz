/**
 * Bulk Delete Script for Products and Mixtapes
 * 
 * This script helps delete all products except "Serato DJ PRO Suite"
 * and all mixtapes from Firestore.
 * 
 * INSTRUCTIONS:
 * 1. Open the admin dashboard at http://localhost:3001/#/admin
 * 2. Open browser console (F12 or Cmd+Option+I)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

async function bulkDeleteProductsAndMixtapes() {
    console.log('Starting bulk delete...');

    try {
        // Import db from firebase
        const { db } = await import('/firebase.ts');

        if (!db) {
            console.error('Firestore not found.');
            return;
        }

        // 1. Delete all products except "Serato DJ PRO Suite"
        console.log('Fetching products...');
        const productsSnapshot = await db.collection('products').get();
        let productsDeleted = 0;
        let productsKept = 0;

        for (const doc of productsSnapshot.docs) {
            const product = doc.data();

            // Keep only "Serato DJ PRO Suite"
            if (product.name && product.name.includes('Serato DJ PRO Suite')) {
                console.log(`✓ Keeping: ${product.name}`);
                productsKept++;
                continue;
            }

            // Delete everything else
            console.log(`✗ Deleting product: ${product.name || doc.id}`);
            await doc.ref.delete();
            productsDeleted++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\nProducts deleted: ${productsDeleted}`);
        console.log(`Products kept: ${productsKept}`);

        // 2. Delete ALL mixtapes
        console.log('\nFetching mixtapes...');
        const mixtapesSnapshot = await db.collection('mixtapes').get();
        let mixtapesDeleted = 0;

        for (const doc of mixtapesSnapshot.docs) {
            const mixtape = doc.data();
            console.log(`✗ Deleting mixtape: ${mixtape.title || doc.id}`);
            await doc.ref.delete();
            mixtapesDeleted++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\nMixtapes deleted: ${mixtapesDeleted}`);

        // Summary
        console.log('\n╔════════════════════════════╗');
        console.log('║   DELETION SUMMARY         ║');
        console.log('╠════════════════════════════╣');
        console.log(`║ Products deleted: ${productsDeleted.toString().padEnd(8)} ║`);
        console.log(`║ Products kept: ${productsKept.toString().padEnd(11)} ║`);
        console.log(`║ Mixtapes deleted: ${mixtapesDeleted.toString().padEnd(8)} ║`);
        console.log('╚════════════════════════════╝\n');

        alert(`✓ Deletion complete!\n\nProducts deleted: ${productsDeleted}\nProducts kept: ${productsKept} (Serato DJ PRO Suite)\nMixtapes deleted: ${mixtapesDeleted}\n\nPage will refresh in 2 seconds...`);

        // Refresh the page
        setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
        console.error('❌ Error during bulk delete:', error);
        alert('Error during deletion: ' + error.message);
    }
}

// Run the function
bulkDeleteProductsAndMixtapes();
