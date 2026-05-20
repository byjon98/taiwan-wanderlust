import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useFirestoreSync<T>(docId: string, localStorageKey: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  // Initialize from local storage for instant offline loading
  const [state, setState] = useState<T>(() => {
    try {
      const local = localStorage.getItem(localStorageKey);
      return local ? JSON.parse(local) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const docRef = doc(db, 'trip', docId);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data().data as T;
        setState(cloudData);
        localStorage.setItem(localStorageKey, JSON.stringify(cloudData));
      } else {
        // Migration: If cloud is empty, seed it with our local data
        const local = localStorage.getItem(localStorageKey);
        const dataToSeed = local ? JSON.parse(local) : defaultValue;
        setDoc(docRef, { data: dataToSeed, updatedAt: Date.now() }, { merge: true });
      }
    }, (error) => {
      console.error(`Firestore sync error for ${docId}:`, error);
    });

    return () => unsubscribe();
  }, [docId, localStorageKey]);

  // Wrapped setter to update React state, Local Storage, and Firestore simultaneously
  const setSyncState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState((prev) => {
      const updated = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
      
      // 1. Update local storage instantly
      localStorage.setItem(localStorageKey, JSON.stringify(updated));
      
      // 2. Push to Firestore
      const docRef = doc(db, 'trip', docId);
      setDoc(docRef, { data: updated, updatedAt: Date.now() }, { merge: true })
        .catch(err => console.error(`Failed to push ${docId} to Firestore:`, err));
        
      return updated;
    });
  }, [docId, localStorageKey]);

  return [state, setSyncState];
}
