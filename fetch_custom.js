import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAQn6dFZd56SsogKQ9m3Skr-FNFAxBGhA",
  projectId: "taiwan-wanderlust",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, 'sync_data', 'taiwan_trip_custom_stores_v1');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log(snap.data().data);
  } else {
    console.log("No data");
  }
  process.exit(0);
}
run().catch(console.error);
