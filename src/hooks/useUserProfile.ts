import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setProfile(data as unknown as UserProfile);
      } else {
        // Auto-create profile if it doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ user_id: user.id } as any)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setProfile(null);
        } else {
          setProfile(newProfile as unknown as UserProfile);
        }
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
      // Remove fields that don't exist in the actual table
      const { user_id, created_at, updated_at, ...safeUpdates } = updates as any;

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(safeUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data as unknown as UserProfile);

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

  return {
    profile,
    loading,
    error,
    isAuthenticated,
    updateProfile,
    refreshProfile: fetchProfile,
  };
}
