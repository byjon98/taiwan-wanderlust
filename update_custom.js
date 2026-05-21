import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAQn6dFZd56SsogKQ9m3Skr-FNFAxBGhA",
  projectId: "taiwan-wanderlust",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const coords = {
  "上好呷雞蛋糕": [25.1706, 121.4398],
  "窩浩斯甜品店": [25.1710, 121.4420],
  "鮑家餡餅": [25.1700, 121.4400],
  "小初店": [24.1511, 120.6508],
  "黄家胡椒饼": [24.1408, 120.6725],
  "夜間部爌肉飯": [24.1432, 120.6698],
  "米玥麻糬堂": [24.1630, 120.6402],
  "大股 熟成燒肉專門": [24.1557, 120.6558]
};

async function run() {
  const docRef = doc(db, 'trip', 'custom_stores');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    let rawData = snap.data().data;
    if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch {}
        if (typeof rawData === 'string') {
            try { rawData = JSON.parse(rawData); } catch {}
        }
    }
    
    let updated = false;
    for (let store of rawData) {
        if (coords[store.n]) {
            store.lat = coords[store.n][0];
            store.lng = coords[store.n][1];
            updated = true;
            console.log(`Updated ${store.n}`);
        }
    }
    
    if (updated) {
        await setDoc(docRef, { data: JSON.stringify(rawData), updatedAt: Date.now() }, { merge: true });
        console.log("Successfully pushed back to Firestore");
    } else {
        console.log("No stores needed updating");
    }
  } else {
    console.log("No data found");
  }
  process.exit(0);
}
run().catch(console.error);
