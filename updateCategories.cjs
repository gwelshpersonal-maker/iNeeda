const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./firebase-applet-config.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const docRef = db.collection('platform_settings').doc('globals');
  const doc = await docRef.get();
  if (doc.exists) {
    const data = doc.data();
    if (data.serviceCategories) {
      const updated = data.serviceCategories.map(cat => {
        if (cat.id === 'MOVING') {
          return {
            ...cat,
            name: 'Moving (With Travel)',
            description: 'Vehicle relocations, loading/unloading with transport, and A-to-B moves. If you just need heavy lifting or moving items within the same location, please select General Labor.'
          };
        }
        if (cat.id === 'GENERAL_LABOR') {
          return {
            ...cat,
            name: 'General Labor & Lifting',
            description: 'On-site heavy lifting, furniture rearranging, loading/unloading, and event setup. Perfect for physical tasks and moving items that do not require traveling to a second location.'
          };
        }
        return cat;
      });
      await docRef.update({ serviceCategories: updated });
      console.log('Successfully updated serviceCategories');
    }
  } else {
    console.log('No globals found');
  }
}

run().catch(console.error);
