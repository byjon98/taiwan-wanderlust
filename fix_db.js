import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteField } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAQn6dFZd56SsogKQ9m3Skr-FNFAxBGhA",
  projectId: "taiwan-wanderlust",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, 'trip', 'live_locations');
  // Remove "Partner" field which was used previously
  await setDoc(docRef, {
    Partner: deleteField()
  }, { merge: true });
  console.log("Deleted Partner field");
  process.exit(0);
}
run().catch(console.error);
