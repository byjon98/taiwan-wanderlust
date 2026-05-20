import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAQn6dFZd56SsogKQ9m3Skr-FNFAxBGhA",
  authDomain: "taiwan-wanderlust.firebaseapp.com",
  projectId: "taiwan-wanderlust",
  storageBucket: "taiwan-wanderlust.firebasestorage.app",
  messagingSenderId: "773267969446",
  appId: "1:773267969446:web:d48382ac24dd4d43752b67"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const docRef = doc(db, 'trip', 'test_doc');
    await setDoc(docRef, { test: 'hello' }, { merge: true });
    console.log("Write success!");
    const snap = await getDoc(docRef);
    console.log("Read success! Data:", snap.data());
    process.exit(0);
  } catch (e) {
    console.error("Firebase error:", e.code, e.message);
    process.exit(1);
  }
}

test();
