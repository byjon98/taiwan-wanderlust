import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAQn6dFZd56SsogKQ9m3Skr-FNFAxBGhA",
  authDomain: "taiwan-wanderlust.firebaseapp.com",
  projectId: "taiwan-wanderlust"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const customStores = await getDoc(doc(db, 'trip', 'custom_stores'));
  console.log('custom_stores data:', customStores.data());
}

check().catch(console.error);
