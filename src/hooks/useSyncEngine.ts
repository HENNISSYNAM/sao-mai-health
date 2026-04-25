/**
 * Sync Engine Hook
 * Automatically syncs dirty cache data when coming online.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { syncAllDirty, getDirtyProfiles, getDirtySettings } from '@/services/cacheService';

export function useSyncEngine() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const updatePendingCount = useCallback(async () => {
    const [profiles, settings] = await Promise.all([
      getDirtyProfiles(),
      getDirtySettings(),
    ]);
    setPendingSync(profiles.length + settings.length);
  }, []);

  const sync = useCallback(async () => {
    if (!user?.id || syncing || !navigator.onLine) return;

    setSyncing(true);
    try {
      const results = await syncAllDirty(supabase, user.id);
      console.log('✅ Sync completed:', results);
      setLastSyncAt(new Date().toISOString());
      await updatePendingCount();
    } catch (err) {
      console.error('❌ Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [user?.id, syncing, updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming online
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync, updatePendingCount]);

  // Periodic sync every 5 minutes
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      if (navigator.onLine) sync();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, sync]);

  return {
    isOnline,
    pendingSync,
    syncing,
    lastSyncAt,
    syncNow: sync,
  };
}
