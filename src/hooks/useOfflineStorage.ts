import { useEffect, useState } from 'react'
import Dexie, { Table } from 'dexie'

interface OfflineRecord {
  id?: number
  table: string
  action: 'insert' | 'update' | 'delete'
  data: any
  timestamp: Date
  synced: number  // 0 = false, 1 = true
  conflict?: number  // 0 = false, 1 = true
}

class OfflineDB extends Dexie {
  offlineQueue!: Table<OfflineRecord>

  constructor() {
    super('HCMCHealthHub')
    this.version(1).stores({
      offlineQueue: '++id, table, action, timestamp, synced, conflict'
    })
  }
}

const db = new OfflineDB()

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Count pending records
    db.offlineQueue.where('synced').equals(0).count()
      .then(setPendingSync)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const queueRecord = async (
    table: string, 
    action: 'insert' | 'update' | 'delete', 
    data: any
  ) => {
    await db.offlineQueue.add({
      table,
      action,
      data,
      timestamp: new Date(),
      synced: 0
    })
    
    const count = await db.offlineQueue.where('synced').equals(0).count()
    setPendingSync(count)
  }

  const syncPendingRecords = async () => {
    const pending = await db.offlineQueue
      .where('synced').equals(0)
      .toArray()

    for (const record of pending) {
      try {
        // TODO: Implement actual sync with Supabase
        console.log('Syncing record:', record)
        
        // Mark as synced
        await db.offlineQueue.update(record.id!, { synced: 1 })
      } catch (error) {
        console.error('Sync failed for record:', record, error)
        // Mark conflict for manual resolution
        await db.offlineQueue.update(record.id!, { conflict: 1 })
      }
    }

    const count = await db.offlineQueue.where('synced').equals(0).count()
    setPendingSync(count)
  }

  const getConflicts = async () => {
    return await db.offlineQueue.where('conflict').equals(1).toArray()
  }

  const resolveConflict = async (recordId: number, resolution: 'local' | 'remote') => {
    await db.offlineQueue.update(recordId, { 
      conflict: 0, 
      synced: resolution === 'remote' ? 1 : 0
    })
  }

  return {
    isOnline,
    pendingSync,
    queueRecord,
    syncPendingRecords,
    getConflicts,
    resolveConflict
  }
}