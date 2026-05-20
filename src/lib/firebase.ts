import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, disableNetwork, enableNetwork } from 'firebase/firestore';

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

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, offline persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support offline persistence.');
  }
});

export { db, disableNetwork, enableNetwork };
