/**
 * Unified Cache Service
 * Native IndexedDB-based caching with Supabase sync for offline-first + cross-device.
 */

// ============ Types ============

export interface CachedProfile {
  user_id: string;
  data: Record<string, any>;
  updated_at: string;
  synced: number; // 0 = dirty, 1 = synced
}

export interface CachedSettings {
  user_id: string;
  data: Record<string, any>;
  updated_at: string;
  synced: number;
}

export interface CachedHealthData {
  id: string;
  user_id: string;
  type: string;
  data: any;
  cached_at: string;
  ttl_ms: number;
}

export interface CachedSession {
  key: string;
  value: any;
  cached_at: string;
}

// ============ Simple IndexedDB Wrapper ============

const DB_NAME = 'SaoMaiCache';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('healthData')) {
        db.createObjectStore('healthData', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'key' });
      }
    };
  });
}

async function dbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result as T | undefined); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result as T[]); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function dbClear(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ============ Profile Cache ============

export async function cacheProfile(userId: string, data: Record<string, any>) {
  await dbPut('profiles', {
    user_id: userId, data, updated_at: new Date().toISOString(), synced: 1,
  });
}

export async function getCachedProfile(userId: string): Promise<Record<string, any> | null> {
  const record = await dbGet<CachedProfile>('profiles', userId);
  return record?.data ?? null;
}

export async function markProfileDirty(userId: string, data: Record<string, any>) {
  await dbPut('profiles', {
    user_id: userId, data, updated_at: new Date().toISOString(), synced: 0,
  });
}

export async function getDirtyProfiles(): Promise<CachedProfile[]> {
  const all = await dbGetAll<CachedProfile>('profiles');
  return all.filter(p => p.synced === 0);
}

// ============ Settings Cache ============

export async function cacheSettings(userId: string, data: Record<string, any>) {
  await dbPut('settings', {
    user_id: userId, data, updated_at: new Date().toISOString(), synced: 1,
  });
}

export async function getCachedSettings(userId: string): Promise<Record<string, any> | null> {
  const record = await dbGet<CachedSettings>('settings', userId);
  return record?.data ?? null;
}

export async function markSettingsDirty(userId: string, data: Record<string, any>) {
  await dbPut('settings', {
    user_id: userId, data, updated_at: new Date().toISOString(), synced: 0,
  });
}

export async function getDirtySettings(): Promise<CachedSettings[]> {
  const all = await dbGetAll<CachedSettings>('settings');
  return all.filter(s => s.synced === 0);
}

// ============ Health Data Cache ============

const DEFAULT_TTL = 10 * 60 * 1000;

export async function cacheHealthData(
  userId: string, type: string, id: string, data: any, ttlMs: number = DEFAULT_TTL
) {
  await dbPut('healthData', {
    id, user_id: userId, type, data, cached_at: new Date().toISOString(), ttl_ms: ttlMs,
  });
}

export async function getCachedHealthData(id: string): Promise<any | null> {
  const record = await dbGet<CachedHealthData>('healthData', id);
  if (!record) return null;
  const age = Date.now() - new Date(record.cached_at).getTime();
  if (age > record.ttl_ms) {
    await dbDelete('healthData', id);
    return null;
  }
  return record.data;
}

export async function getCachedHealthDataByType(userId: string, type: string): Promise<any[]> {
  const all = await dbGetAll<CachedHealthData>('healthData');
  const now = Date.now();
  const valid: any[] = [];
  for (const r of all) {
    if (r.user_id !== userId || r.type !== type) continue;
    const age = now - new Date(r.cached_at).getTime();
    if (age > r.ttl_ms) {
      await dbDelete('healthData', r.id);
    } else {
      valid.push(r.data);
    }
  }
  return valid;
}

export async function clearHealthCache(userId: string) {
  const all = await dbGetAll<CachedHealthData>('healthData');
  for (const r of all) {
    if (r.user_id === userId) await dbDelete('healthData', r.id);
  }
}

// ============ Session Cache ============

export async function cacheSessionData(key: string, value: any) {
  await dbPut('sessions', { key, value, cached_at: new Date().toISOString() });
}

export async function getCachedSessionData(key: string): Promise<any | null> {
  const record = await dbGet<CachedSession>('sessions', key);
  return record?.value ?? null;
}

export async function clearSessionCache() {
  await dbClear('sessions');
}

// ============ Sync Engine ============

export async function syncAllDirty(supabase: any, userId: string) {
  const results = { profiles: 0, settings: 0, errors: 0 };

  const dirtyProfiles = await getDirtyProfiles();
  for (const p of dirtyProfiles) {
    try {
      const { user_id, created_at, updated_at, ...safeData } = p.data as any;
      const { error } = await supabase.from('user_profiles').update(safeData).eq('user_id', p.user_id);
      if (!error) { await cacheProfile(p.user_id, p.data); results.profiles++; }
      else results.errors++;
    } catch { results.errors++; }
  }

  const dirtySettings = await getDirtySettings();
  for (const s of dirtySettings) {
    try {
      const { error } = await supabase.from('user_profiles').update({ settings_json: s.data }).eq('user_id', s.user_id);
      if (!error) { await cacheSettings(s.user_id, s.data); results.settings++; }
      else results.errors++;
    } catch { results.errors++; }
  }

  return results;
}

// ============ Cleanup ============

export async function clearAllCacheForUser(userId: string) {
  await Promise.all([
    dbDelete('profiles', userId),
    dbDelete('settings', userId),
    clearHealthCache(userId),
  ]);
}

export async function clearAllCache() {
  await Promise.all([
    dbClear('profiles'),
    dbClear('settings'),
    dbClear('healthData'),
    dbClear('sessions'),
  ]);
}
