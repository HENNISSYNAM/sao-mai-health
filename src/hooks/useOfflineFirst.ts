import { useEffect, useState, useCallback } from 'react'
import Dexie, { Table } from 'dexie'

// Enhanced offline-first with conflict resolution
interface OfflineRecord {
  id?: number
  table: string
  action: 'insert' | 'update' | 'delete'
  data: any
  timestamp: Date
  synced: number  // 0 = false, 1 = true
  conflict?: number  // 0 = false, 1 = true
  local_id?: string
  server_id?: string
  version?: number
}

interface ConflictResolution {
  id: number
  local_data: any
  server_data: any
  table: string
  action: string
  timestamp: Date
  resolution?: 'local' | 'server' | 'merge'
}

class OfflineHealthDB extends Dexie {
  offlineQueue!: Table<OfflineRecord>
  formAutoSave!: Table<{ id: string, form: string, data: any, timestamp: Date }>
  conflicts!: Table<ConflictResolution>

  constructor() {
    super('HCMCHealthHub')
    this.version(1).stores({
      offlineQueue: '++id, table, action, timestamp, synced, conflict, local_id, server_id',
      formAutoSave: '&id, form, timestamp',
      conflicts: '++id, table, action, timestamp, resolution'
    })
  }
}

const db = new OfflineHealthDB()

export function useOfflineFirst() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(0)
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming online
      syncPendingRecords()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial count of pending records
    updatePendingCount()
    loadConflicts()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updatePendingCount = async () => {
    const count = await db.offlineQueue.where('synced').equals(0).count()
    setPendingSync(count)
  }

  const loadConflicts = async () => {
    const conflictList = await db.conflicts.where('resolution').equals(undefined).toArray()
    setConflicts(conflictList)
  }

  // Queue record for offline sync
  const queueRecord = async (
    table: string, 
    action: 'insert' | 'update' | 'delete', 
    data: any,
    localId?: string
  ) => {
    await db.offlineQueue.add({
      table,
      action,
      data,
      timestamp: new Date(),
      synced: 0,
      local_id: localId || crypto.randomUUID(),
      version: 1
    })
    
    await updatePendingCount()
  }

  // Auto-save form data
  const autoSaveForm = async (formId: string, formData: any) => {
    await db.formAutoSave.put({
      id: formId,
      form: formId,
      data: formData,
      timestamp: new Date()
    })
  }

  // Load auto-saved form data
  const loadAutoSavedForm = async (formId: string) => {
    return await db.formAutoSave.get(formId)
  }

  // Clear auto-saved form data
  const clearAutoSavedForm = async (formId: string) => {
    await db.formAutoSave.delete(formId)
  }

  // Conflict resolution
  const detectConflict = (localData: any, serverData: any): boolean => {
    // Simple conflict detection based on timestamp or version
    if (!serverData.updated_at || !localData.updated_at) return false
    return new Date(localData.updated_at) < new Date(serverData.updated_at)
  }

  const resolveConflict = async (conflictId: number, resolution: 'local' | 'server' | 'merge', mergedData?: any) => {
    const conflict = await db.conflicts.get(conflictId)
    if (!conflict) return

    let finalData = conflict.local_data
    if (resolution === 'server') {
      finalData = conflict.server_data
    } else if (resolution === 'merge' && mergedData) {
      finalData = mergedData
    }

    // Update the conflict record
    await db.conflicts.update(conflictId, { resolution })

    // Apply the resolution
    await queueRecord(conflict.table, conflict.action as any, finalData)

    await loadConflicts()
  }

  // Sync pending records
  const syncPendingRecords = async () => {
    if (!isOnline || syncStatus === 'syncing') return

    setSyncStatus('syncing')
    
    try {
      const pending = await db.offlineQueue
        .where('synced').equals(0)
        .and(item => !item.conflict)
        .toArray()

      for (const record of pending) {
        try {
          // Here you would call your actual API
          console.log('Syncing record:', record)
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Mark as synced
          await db.offlineQueue.update(record.id!, { synced: 1 })
          
        } catch (error) {
          console.error('Sync failed for record:', record, error)
          
          // Check for conflicts
          // In a real implementation, you'd check the server response
          const hasConflict = Math.random() > 0.9 // Simulate 10% conflict rate
          
          if (hasConflict) {
            await db.offlineQueue.update(record.id!, { conflict: 1 })
            
            // Add to conflicts table
            await db.conflicts.add({
              id: 0, // Auto-increment
              local_data: record.data,
              server_data: { ...record.data, updated_at: new Date() }, // Simulate server data
              table: record.table,
              action: record.action,
              timestamp: new Date()
            })
          }
        }
      }

      setSyncStatus('idle')
      await updatePendingCount()
      await loadConflicts()
      
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus('error')
    }
  }

  // Generate conflict-free merge
  const generateMerge = (localData: any, serverData: any): any => {
    // Simple merge strategy - take newer values per field
    const merged = { ...serverData }
    
    Object.keys(localData).forEach(key => {
      if (key.endsWith('_at')) return // Skip timestamp fields
      
      // Prefer local data for user-modified fields
      if (localData[key] !== undefined && localData[key] !== null) {
        merged[key] = localData[key]
      }
    })
    
    // Always use latest timestamp
    merged.updated_at = new Date().toISOString()
    
    return merged
  }

  // Optimistic update with rollback
  const optimisticUpdate = useCallback(async (
    table: string,
    action: 'insert' | 'update' | 'delete',
    data: any,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    const localId = crypto.randomUUID()
    
    try {
      // Apply immediately for optimistic UI
      if (onSuccess) onSuccess()
      
      // Queue for sync
      await queueRecord(table, action, data, localId)
      
      // If online, try to sync immediately
      if (isOnline) {
        setTimeout(() => syncPendingRecords(), 100)
      }
      
    } catch (error) {
      console.error('Optimistic update failed:', error)
      if (onError) onError(error)
    }
  }, [isOnline])

  return {
    isOnline,
    pendingSync,
    conflicts,
    syncStatus,
    queueRecord,
    syncPendingRecords,
    autoSaveForm,
    loadAutoSavedForm,
    clearAutoSavedForm,
    resolveConflict,
    generateMerge,
    optimisticUpdate,
    hasConflicts: conflicts.length > 0
  }
}

// Specialized hooks for form auto-save
export function useFormAutoSave(formId: string) {
  const { autoSaveForm, loadAutoSavedForm, clearAutoSavedForm } = useOfflineFirst()
  const [autoSavedData, setAutoSavedData] = useState<any>(null)

  useEffect(() => {
    // Load auto-saved data on mount
    loadAutoSavedForm(formId).then(saved => {
      if (saved) {
        setAutoSavedData(saved.data)
      }
    })
  }, [formId, loadAutoSavedForm])

  const saveData = useCallback(async (data: any) => {
    await autoSaveForm(formId, data)
    setAutoSavedData(data)
  }, [formId, autoSaveForm])

  const clearData = useCallback(async () => {
    await clearAutoSavedForm(formId)
    setAutoSavedData(null)
  }, [formId, clearAutoSavedForm])

  return {
    autoSavedData,
    saveData,
    clearData,
    hasAutoSavedData: autoSavedData !== null
  }
}