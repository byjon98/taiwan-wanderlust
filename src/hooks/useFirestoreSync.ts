import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useFirestoreSync<T>(docId: string, localStorageKey: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  // Initialize from local storage for instant offline loading
  const [state, setState] = useState<T>(() => {
    try {
      const local = localStorage.getItem(localStorageKey);
      if (local) {
        let parsed = JSON.parse(local);
        // Handle double-stringified corruption gracefully
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch {}
        }
        return parsed;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const docRef = doc(db, 'trip', docId);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.data().data;
        // Handle both stringified JSON (new format) and raw objects (old format)
        let cloudData: T;
        if (typeof rawData === 'string') {
          try {
            let parsed = JSON.parse(rawData);
            // Protect against double-stringify corruption
            if (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); } catch {}
            }
            cloudData = parsed;
          } catch {
            cloudData = rawData as any;
          }
        } else {
          cloudData = rawData as T;
        }
        
        setState(cloudData);
        localStorage.setItem(localStorageKey, JSON.stringify(cloudData));
      } else {
        // Migration: If cloud is empty, seed it with our local data
        const local = localStorage.getItem(localStorageKey);
        let dataToSeed = defaultValue;
        if (local) {
          try {
            let parsed = JSON.parse(local);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            dataToSeed = parsed;
          } catch {}
        }
        
        // Stringify to avoid Firestore nested array limitations
        setDoc(docRef, { data: JSON.stringify(dataToSeed), updatedAt: Date.now() }, { merge: true });
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
      
      // 2. Push to Firestore (Stringify to prevent nested array crash)
      const docRef = doc(db, 'trip', docId);
      setDoc(docRef, { data: JSON.stringify(updated), updatedAt: Date.now() }, { merge: true })
        .catch(err => console.error(`Failed to push ${docId} to Firestore:`, err));
        
      return updated;
    });
  }, [docId, localStorageKey]);

  return [state, setSyncState];
}
