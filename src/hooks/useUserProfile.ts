import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  age_group: string | null;
  language: string;
  region: Record<string, any>;
  living_environment: Record<string, any>;
  health_sensitivity: Record<string, any>;
  primary_interests: string[];
  alert_threshold: string;
  gps_consent: boolean;
  last_gps_coords: Record<string, any> | null;
  onboarding_completed: boolean;
  inference_log: any[];
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use raw query to avoid type conflicts with existing user_profiles table
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }
      
      // Cast to our UserProfile type since the new table has different structure
      if (data && 'full_name' in data) {
        setProfile(data as unknown as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return { error: new Error('Not authenticated') };

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates as any)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data && 'full_name' in data) {
        setProfile(data as unknown as UserProfile);
      }
      
      toast({
        title: 'Cập nhật thành công',
        description: 'Hồ sơ của bạn đã được cập nhật.',
      });
      
      return { data, error: null };
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
      });
      return { data: null, error: err as Error };
    }
  };

  const completeOnboarding = async (profileData: Partial<UserProfile>) => {
    return updateProfile({
      ...profileData,
      onboarding_completed: true,
    });
  };

  return {
    profile,
    loading,
    error,
    isAuthenticated,
    updateProfile,
    completeOnboarding,
    refreshProfile: fetchProfile,
    needsOnboarding: isAuthenticated && profile && !profile.onboarding_completed,
  };
}
