/**
 * Cached Profile Hook
 * Loads profile from IndexedDB instantly, then syncs with Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import {
  cacheProfile,
  getCachedProfile,
  markProfileDirty,
} from '@/services/cacheService';

export interface UserProfile {
  user_id: string;
  role: string;
  phone_hash: string | null;
  reputation: number | null;
  gender: string | null;
  blood_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  medical_conditions: string[] | null;
  allergies: string[] | null;
  medications: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  last_biometric_scan: string | null;
  biometric_verified: boolean | null;
  sharing_mode: string | null;
  allowed_viewers: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useCachedProfile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'cache' | 'server' | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Step 1: Load from cache instantly
    try {
      const cached = await getCachedProfile(user.id);
      if (cached) {
        setProfile(cached as unknown as UserProfile);
        setSource('cache');
        setLoading(false);
      }
    } catch (e) {
      console.warn('Cache read failed:', e);
    }

    // Step 2: Fetch from server in background
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profileData = data as unknown as UserProfile;
        setProfile(profileData);
        setSource('server');
        await cacheProfile(user.id, data as any);
      } else {
        // Auto-create profile
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ user_id: user.id } as any)
          .select()
          .single();

        if (!insertError && newProfile) {
          const profileData = newProfile as unknown as UserProfile;
          setProfile(profileData);
          setSource('server');
          await cacheProfile(user.id, newProfile as any);
        }
      }
    } catch (err) {
      console.error('Server profile fetch failed:', err);
      // Cache-first: if we already have cached data, that's fine
      if (!profile) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return { error: new Error('Not authenticated') };

    const { user_id, created_at, updated_at, ...safeUpdates } = updates as any;

    // Optimistic: update local state + cache immediately
    const optimisticProfile = { ...profile, ...safeUpdates } as UserProfile;
    setProfile(optimisticProfile);

    try {
      // Try server update
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(safeUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedProfile = data as unknown as UserProfile;
      setProfile(updatedProfile);
      await cacheProfile(user.id, data as any);

      toast({
        title: 'Cập nhật thành công',
        description: 'Hồ sơ của bạn đã được cập nhật.',
      });

      return { data, error: null };
    } catch (err) {
      // Offline fallback: mark dirty for later sync
      console.warn('Server update failed, caching locally:', err);
      await markProfileDirty(user.id, optimisticProfile as any);

      toast({
        title: 'Đã lưu cục bộ',
        description: 'Sẽ đồng bộ khi có kết nối.',
      });

      return { data: null, error: err as Error };
    }
  };

  return {
    profile,
    loading,
    source,
    isAuthenticated,
    updateProfile,
    refreshProfile: fetchProfile,
  };
}
