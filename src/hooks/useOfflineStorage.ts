import { useEffect, useState } from 'react'

interface OfflineRecord {
  id?: number
  table: string
  action: 'insert' | 'update' | 'delete'
  data: any
  timestamp: string
  synced: number
  conflict?: number
}

const DB_NAME = 'HCMCHealthHub';
const STORE_NAME = 'offlineQueue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Count pending
    openDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const pending = (req.result as OfflineRecord[]).filter(r => r.synced === 0);
        setPendingSync(pending.length);
        db.close();
      };
    }).catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const queueRecord = async (table: string, action: 'insert' | 'update' | 'delete', data: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      table, action, data, timestamp: new Date().toISOString(), synced: 0,
    });
    tx.oncomplete = () => db.close();
    
    const countDb = await openDB();
    const countTx = countDb.transaction(STORE_NAME, 'readonly');
    const req = countTx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      setPendingSync((req.result as OfflineRecord[]).filter(r => r.synced === 0).length);
      countDb.close();
    };
  }

  const syncPendingRecords = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    
    return new Promise<void>((resolve) => {
      req.onsuccess = async () => {
        const pending = (req.result as OfflineRecord[]).filter(r => r.synced === 0);
        for (const record of pending) {
          try {
            console.log('Syncing record:', record);
            // Mark as synced
            const updateDb = await openDB();
            const updateTx = updateDb.transaction(STORE_NAME, 'readwrite');
            updateTx.objectStore(STORE_NAME).put({ ...record, synced: 1 });
            updateDb.close();
          } catch (error) {
            console.error('Sync failed:', error);
          }
        }
        setPendingSync(0);
        db.close();
        resolve();
      };
    });
  }

  const getConflicts = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    return new Promise<OfflineRecord[]>((resolve) => {
      req.onsuccess = () => {
        resolve((req.result as OfflineRecord[]).filter(r => r.conflict === 1));
        db.close();
      };
    });
  }

  const resolveConflict = async (recordId: number, resolution: 'local' | 'remote') => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(recordId);
    req.onsuccess = () => {
      if (req.result) {
        store.put({ ...req.result, conflict: 0, synced: resolution === 'remote' ? 1 : 0 });
      }
      db.close();
    };
  }

  return { isOnline, pendingSync, queueRecord, syncPendingRecords, getConflicts, resolveConflict }
}
