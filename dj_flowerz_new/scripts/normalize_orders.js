
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to make sure this exists or use env

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function normalizeOrders() {
    console.log('Fetching orders...');
    const snapshot = await db.collection('orders').get();
    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const updates = {};
        let changed = false;

        // Normalize createdAt
        if (!data.createdAt && data.created_at) {
            updates.createdAt = data.created_at;
            changed = true;
        }

        // Normalize total
        if (data.total === undefined && data.total_amount !== undefined) {
            updates.total = data.total_amount;
            changed = true;
        }

        // Normalize customerName
        if (!data.customerName && data.email) {
            updates.customerName = data.email.split('@')[0];
            changed = true;
        }

        // Normalize items
        if (data.items && Array.isArray(data.items)) {
            const newItems = data.items.map(item => ({
                productId: item.product_id || item.productId || 'unknown',
                productName: item.title || item.productName || 'Order Item',
                quantity: item.quantity || 1,
                price: item.amount || item.price || 0,
                type: item.type || 'digital'
            }));

            // Compare if changed (simplified check)
            if (JSON.stringify(newItems) !== JSON.stringify(data.items)) {
                updates.items = newItems;
                changed = true;
            }
        }

        if (changed) {
            batch.update(doc.ref, updates);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Updated ${count} orders.`);
    } else {
        console.log('No orders needed updating.');
    }
}

normalizeOrders().catch(console.error);
