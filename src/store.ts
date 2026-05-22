import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Store, RouteItem } from './types';

// Generic sync utility for Zustand
function syncFirestore<T>(docId: string, stateKey: string, localStorageKey: string, defaultValue: T, set: any) {
  // 1. Initial Load from LocalStorage
  try {
    const local = localStorage.getItem(localStorageKey);
    if (local) {
      let parsed = JSON.parse(local);
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch {}
      }
      set({ [stateKey]: parsed });
    } else {
      set({ [stateKey]: defaultValue });
    }
  } catch {}

  // 2. Listen to Firestore
  onSnapshot(doc(db, 'trip', docId), (snapshot) => {
    if (snapshot.exists()) {
      const rawData = snapshot.data().data;
      let cloudData: T;
      if (typeof rawData === 'string') {
        try {
          let parsed = JSON.parse(rawData);
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
      set((state: any) => ({
        [stateKey]: cloudData,
        _loadedCollections: { ...(state._loadedCollections || {}), [docId]: true }
      }));
      localStorage.setItem(localStorageKey, JSON.stringify(cloudData));
    } else {
      set((state: any) => ({
        _loadedCollections: { ...(state._loadedCollections || {}), [docId]: true }
      }));
    }
  });
}

// Write helper
const writeFirestore = (docId: string, localStorageKey: string, newValue: any) => {
  localStorage.setItem(localStorageKey, JSON.stringify(newValue));
  setDoc(doc(db, 'trip', docId), { data: newValue, updatedAt: Date.now() }, { merge: true })
    .catch(err => console.error(err));
};

interface AppState {
  hasVerifiedPin: boolean;
  setHasVerifiedPin: (v: boolean) => void;

  _loadedCollections: Record<string, boolean>;
  isAppReady: () => boolean;

  currentUser: 'Jon' | 'June';
  setCurrentUser: (u: 'Jon' | 'June') => void;
  
  viewMode: 'landing' | 'itinerary';
  setViewMode: (v: 'landing' | 'itinerary') => void;
  
  activeRegionId: string;
  setActiveRegionId: (id: string) => void;
  
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  
  routeItems: RouteItem[];
  setRouteItems: (update: RouteItem[] | ((prev: RouteItem[]) => RouteItem[])) => void;
  
  customStores: Store[];
  setCustomStores: (update: Store[] | ((prev: Store[]) => Store[])) => void;
  
  storeRemarks: Record<string, { text: string, history: string[], future: string[] }>;
  setStoreRemarks: (update: any | ((prev: any) => any)) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  // Setup syncs
  syncFirestore('routeItems', 'routeItems', 'my_app_routeItems', [], set);
  syncFirestore('custom_stores', 'customStores', 'taiwan_trip_custom_stores_v1', [], set);
  syncFirestore('store_remarks', 'storeRemarks', 'taiwan_trip_remarks_v1', {}, set);

  return {
    hasVerifiedPin: false,
    setHasVerifiedPin: (v) => {
      set({ hasVerifiedPin: v });
    },

    _loadedCollections: {},
    isAppReady: () => {
      const s = get();
      // If we have data in localStorage, we consider it ready to prevent flicker.
      // Or if all collections have loaded from firestore once.
      const hasLocalRoute = !!localStorage.getItem('my_app_routeItems');
      const hasLocalStores = !!localStorage.getItem('taiwan_trip_custom_stores_v1');
      if (hasLocalRoute && hasLocalStores) return true;
      return s._loadedCollections['routeItems'] && s._loadedCollections['custom_stores'];
    },

    currentUser: (localStorage.getItem('taiwan_trip_whoami') as 'Jon' | 'June') || 'Jon',
    setCurrentUser: (u) => {
      localStorage.setItem('taiwan_trip_whoami', u);
      set({ currentUser: u });
    },
    
    viewMode: 'landing',
    setViewMode: (v) => set({ viewMode: v }),
    
    activeRegionId: 'all',
    setActiveRegionId: (id) => set({ activeRegionId: id }),
    
    searchQuery: '',
    setSearchQuery: (q) => set({ searchQuery: q }),

    routeItems: [],
    setRouteItems: (update) => {
      const next = typeof update === 'function' ? update(get().routeItems) : update;
      set({ routeItems: next });
      writeFirestore('routeItems', 'my_app_routeItems', next);
    },

    customStores: [],
    setCustomStores: (update) => {
      const next = typeof update === 'function' ? update(get().customStores) : update;
      set({ customStores: next });
      writeFirestore('custom_stores', 'taiwan_trip_custom_stores_v1', next);
    },

    storeRemarks: {},
    setStoreRemarks: (update) => {
      const next = typeof update === 'function' ? update(get().storeRemarks) : update;
      set({ storeRemarks: next });
      writeFirestore('store_remarks', 'taiwan_trip_remarks_v1', next);
    },
  };
});
