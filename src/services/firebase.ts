import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved, off, goOffline, goOnline } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDWT5vyHdDolexv1vHaR977edGkcf0K8sc",
  authDomain: "pw-construction-estimate-b9748.firebaseapp.com",
  databaseURL: "https://pw-construction-estimate-b9748-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pw-construction-estimate-b9748",
  storageBucket: "pw-construction-estimate-b9748.firebasestorage.app",
  messagingSenderId: "504834767266",
  appId: "1:504834767266:web:edd94067cc8f4188df1afb"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Tracks actual network connection to Firebase servers
export const onConnectionChange = (callback: (connected: boolean) => void) => {
  const connectedRef = ref(db, ".info/connected");
  return onValue(connectedRef, (snap) => {
    callback(snap.val() === true);
  });
};

// Data persistence helpers with silenced error handling to prevent console spam
export const syncData = (path: string, callback: (data: any) => void, onError?: (err: Error) => void) => {
  const dataRef = ref(db, path);
  try {
    return onValue(dataRef, 
      (snapshot) => {
        callback(snapshot.val());
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  } catch (e) {
    if (onError) onError(e as Error);
    return () => {};
  }
};

// Efficiently sync a collection (list) using child events to minimize bandwidth
// This ensures we only download changes, not the whole list every time
export const syncCollection = <T extends { id: string }>(
  path: string, 
  onDataChange: (items: T[]) => void,
  onError?: (err: Error) => void
) => {
  const itemsMap = new Map<string, T>();
  const dbRef = ref(db, path);
  
  // Initial load helper to avoid flickering if possible, but child_added handles it too
  // We use a debounce-like pattern or just update on every event. 
  // For React state, frequent updates might be noisy, but it ensures accuracy.
  
  const updateState = () => {
    onDataChange(Array.from(itemsMap.values()));
  };

  const onAdd = onChildAdded(dbRef, (snap) => {
    const val = snap.val();
    if (val) {
      // Handle both array-like (0,1,2 keys) and map-like (uuid keys)
      // We assume the object inside has an 'id' property as per our types
      const item = { ...val, id: val.id || snap.key };
      itemsMap.set(item.id, item);
      updateState();
    }
  }, onError);

  const onChange = onChildChanged(dbRef, (snap) => {
    const val = snap.val();
    if (val) {
      const item = { ...val, id: val.id || snap.key };
      itemsMap.set(item.id, item);
      updateState();
    }
  }, onError);

  const onRemove = onChildRemoved(dbRef, (snap) => {
    const val = snap.val();
    // Try to find by ID inside value, or use key
    const id = val?.id || snap.key;
    if (itemsMap.has(id)) {
      itemsMap.delete(id);
      updateState();
    }
  }, onError);

  return () => {
    off(dbRef, 'child_added', onAdd);
    off(dbRef, 'child_changed', onChange);
    off(dbRef, 'child_removed', onRemove);
  };
};

export const saveData = async (path: string, data: any) => {
  try {
    await set(ref(db, path), data);
  } catch (error) {
    throw error;
  }
};

export const updateData = async (path: string, data: any) => {
  try {
    await update(ref(db, path), data);
  } catch (error) {
    throw error;
  }
};

export const removeData = async (path: string) => {
  try {
    await remove(ref(db, path));
  } catch (error) {
    throw error;
  }
};

export const setDatabaseConnection = (online: boolean) => {
  if (online) goOnline(db);
  else goOffline(db);
};