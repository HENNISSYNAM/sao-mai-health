import { useEffect, useState, useCallback } from 'react'

// Enhanced offline-first with conflict resolution (native IndexedDB)
interface OfflineRecord {
  id?: number
  table: string
  action: 'insert' | 'update' | 'delete'
  data: any
  timestamp: string
  synced: number
  conflict?: number
  local_id?: string
  server_id?: string
  version?: number
}

interface ConflictResolution {
  id?: number
  local_data: any
  server_data: any
  table: string
  action: string
  timestamp: string
  resolution?: 'local' | 'server' | 'merge'
}

const DB_NAME = 'HCMCHealthHubV2';
const QUEUE_STORE = 'offlineQueue';
const FORM_STORE = 'formAutoSave';
const CONFLICT_STORE = 'conflicts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE))
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains(FORM_STORE))
        db.createObjectStore(FORM_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CONFLICT_STORE))
        db.createObjectStore(CONFLICT_STORE, { keyPath: 'id', autoIncrement: true });
    };
  });
}

async function getAllFrom<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function putTo(store: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getFrom<T>(store: string, key: any): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function deleteFrom(store: string, key: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export function useOfflineFirst() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(0)
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')

  const updatePendingCount = useCallback(async () => {
    try {
      const all = await getAllFrom<OfflineRecord>(QUEUE_STORE);
      setPendingSync(all.filter(r => r.synced === 0).length);
    } catch { /* ignore */ }
  }, []);

  const loadConflicts = useCallback(async () => {
    try {
      const all = await getAllFrom<ConflictResolution>(CONFLICT_STORE);
      setConflicts(all.filter(c => !c.resolution));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncPendingRecords(); }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    updatePendingCount();
    loadConflicts();
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const queueRecord = async (table: string, action: 'insert' | 'update' | 'delete', data: any, localId?: string) => {
    await putTo(QUEUE_STORE, {
      table, action, data, timestamp: new Date().toISOString(),
      synced: 0, local_id: localId || crypto.randomUUID(), version: 1,
    });
    await updatePendingCount();
  }

  const autoSaveForm = async (formId: string, formData: any) => {
    await putTo(FORM_STORE, { id: formId, form: formId, data: formData, timestamp: new Date().toISOString() });
  }

  const loadAutoSavedForm = async (formId: string) => {
    return await getFrom<any>(FORM_STORE, formId);
  }

  const clearAutoSavedForm = async (formId: string) => {
    await deleteFrom(FORM_STORE, formId);
  }

  const resolveConflict = async (conflictId: number, resolution: 'local' | 'server' | 'merge', mergedData?: any) => {
    const conflict = await getFrom<ConflictResolution>(CONFLICT_STORE, conflictId);
    if (!conflict) return;
    let finalData = conflict.local_data;
    if (resolution === 'server') finalData = conflict.server_data;
    else if (resolution === 'merge' && mergedData) finalData = mergedData;
    await putTo(CONFLICT_STORE, { ...conflict, resolution });
    await queueRecord(conflict.table, conflict.action as any, finalData);
    await loadConflicts();
  }

  const syncPendingRecords = async () => {
    if (!isOnline || syncStatus === 'syncing') return
    setSyncStatus('syncing')
    try {
      const pending = await getAllFrom<OfflineRecord>(QUEUE_STORE);
      const toSync = pending.filter(r => r.synced === 0 && !r.conflict);
      for (const record of toSync) {
        try {
          console.log('Syncing record:', record);
          await putTo(QUEUE_STORE, { ...record, synced: 1 });
        } catch (error) {
          console.error('Sync failed:', error);
        }
      }
      setSyncStatus('idle');
      await updatePendingCount();
    } catch {
      setSyncStatus('error');
    }
  }

  const generateMerge = (localData: any, serverData: any): any => {
    const merged = { ...serverData };
    Object.keys(localData).forEach(key => {
      if (key.endsWith('_at')) return;
      if (localData[key] !== undefined && localData[key] !== null) merged[key] = localData[key];
    });
    merged.updated_at = new Date().toISOString();
    return merged;
  }

  const optimisticUpdate = useCallback(async (
    table: string, action: 'insert' | 'update' | 'delete', data: any,
    onSuccess?: () => void, onError?: (error: any) => void
  ) => {
    try {
      if (onSuccess) onSuccess();
      await queueRecord(table, action, data, crypto.randomUUID());
      if (isOnline) setTimeout(() => syncPendingRecords(), 100);
    } catch (error) {
      if (onError) onError(error);
    }
  }, [isOnline])

  return {
    isOnline, pendingSync, conflicts, syncStatus,
    queueRecord, syncPendingRecords, autoSaveForm, loadAutoSavedForm,
    clearAutoSavedForm, resolveConflict, generateMerge, optimisticUpdate,
    hasConflicts: conflicts.length > 0,
  }
}

export function useFormAutoSave(formId: string) {
  const { autoSaveForm, loadAutoSavedForm, clearAutoSavedForm } = useOfflineFirst()
  const [autoSavedData, setAutoSavedData] = useState<any>(null)

  useEffect(() => {
    loadAutoSavedForm(formId).then(saved => {
      if (saved) setAutoSavedData(saved.data);
    });
  }, [formId])

  const saveData = useCallback(async (data: any) => {
    await autoSaveForm(formId, data);
    setAutoSavedData(data);
  }, [formId])

  const clearData = useCallback(async () => {
    await clearAutoSavedForm(formId);
    setAutoSavedData(null);
  }, [formId])

  return { autoSavedData, saveData, clearData, hasAutoSavedData: autoSavedData !== null }
}
