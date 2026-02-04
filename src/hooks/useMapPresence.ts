import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ============= TYPES =============
export interface UserPresence {
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  ageGroup?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'unknown';
  healthStatus?: string;
  isSharing: boolean;
  lastActiveAt: string;
}

export interface PresenceCluster {
  centroidLat: number;
  centroidLng: number;
  userCount: number;
  avgRiskLevel: number;
  ageGroups: Record<string, number>;
  radiusKm: number;
}

// ============= HOOK =============
export const useMapPresence = () => {
  const { user } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<UserPresence[]>([]);
  const [clusters, setClusters] = useState<PresenceCluster[]>([]);
  const [myPresence, setMyPresence] = useState<UserPresence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch nearby users based on location
  const fetchNearbyUsers = useCallback(async (lat: number, lng: number, radiusKm = 50) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_nearby_users', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm
      });

      if (error) throw error;

      const users: UserPresence[] = (data || []).map((u: any) => ({
        userId: u.user_id,
        lat: u.lat,
        lng: u.lng,
        ageGroup: u.age_group,
        riskLevel: u.risk_level || 'unknown',
        isSharing: true,
        lastActiveAt: new Date().toISOString(),
      }));

      setNearbyUsers(users);
      
      // Generate clusters from users
      const generatedClusters = generateClusters(users);
      setClusters(generatedClusters);

      return users;
    } catch (err) {
      console.error('[MAP-PRESENCE] Fetch error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simple clustering algorithm
  const generateClusters = (users: UserPresence[]): PresenceCluster[] => {
    if (users.length < 3) return [];

    const clusters: PresenceCluster[] = [];
    const used = new Set<string>();
    const clusterRadiusKm = 5; // 5km radius for clusters

    for (const user of users) {
      if (used.has(user.userId)) continue;

      const nearby = users.filter(u => {
        if (used.has(u.userId)) return false;
        const dist = haversineDistance(user.lat, user.lng, u.lat, u.lng);
        return dist <= clusterRadiusKm;
      });

      if (nearby.length >= 3) {
        // Create cluster
        const ageGroups: Record<string, number> = {};
        let totalRisk = 0;
        let riskCount = 0;

        nearby.forEach(u => {
          used.add(u.userId);
          if (u.ageGroup) {
            ageGroups[u.ageGroup] = (ageGroups[u.ageGroup] || 0) + 1;
          }
          if (u.riskLevel && u.riskLevel !== 'unknown') {
            const riskValue = u.riskLevel === 'high' ? 80 : u.riskLevel === 'medium' ? 50 : 20;
            totalRisk += riskValue;
            riskCount++;
          }
        });

        const avgLat = nearby.reduce((sum, u) => sum + u.lat, 0) / nearby.length;
        const avgLng = nearby.reduce((sum, u) => sum + u.lng, 0) / nearby.length;

        clusters.push({
          centroidLat: avgLat,
          centroidLng: avgLng,
          userCount: nearby.length,
          avgRiskLevel: riskCount > 0 ? totalRisk / riskCount : 0,
          ageGroups,
          radiusKm: clusterRadiusKm,
        });
      }
    }

    return clusters;
  };

  // Haversine distance formula
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Update my presence
  const updateMyPresence = useCallback(async (lat: number, lng: number, options?: {
    ageGroup?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    isSharing?: boolean;
  }) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_map_presence')
        .upsert({
          user_id: user.id,
          lat,
          lng,
          age_group: options?.ageGroup,
          risk_level: options?.riskLevel,
          is_sharing: options?.isSharing ?? true,
          last_active_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setMyPresence({
        userId: user.id,
        lat,
        lng,
        ageGroup: options?.ageGroup,
        riskLevel: options?.riskLevel || 'unknown',
        isSharing: options?.isSharing ?? true,
        lastActiveAt: new Date().toISOString(),
      });

      // Broadcast presence update
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'presence_update',
          payload: { userId: user.id, lat, lng, timestamp: Date.now() }
        });
      }
    } catch (err) {
      console.error('[MAP-PRESENCE] Update error:', err);
    }
  }, [user?.id]);

  // Get total active users count
  const fetchTotalActiveUsers = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('user_map_presence')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('is_sharing', true);

      if (error) throw error;
      setTotalActiveUsers(count || 0);
      return count || 0;
    } catch (err) {
      console.error('[MAP-PRESENCE] Count error:', err);
      return 0;
    }
  }, []);

  // Toggle sharing mode
  const toggleSharing = useCallback(async (isSharing: boolean) => {
    if (!user?.id || !myPresence) return;

    try {
      const { error } = await supabase
        .from('user_map_presence')
        .update({ is_sharing: isSharing })
        .eq('user_id', user.id);

      if (error) throw error;

      setMyPresence(prev => prev ? { ...prev, isSharing } : null);

      // Also update user_profiles sharing_mode
      await supabase
        .from('user_profiles')
        .update({ sharing_mode: isSharing ? 'community' : 'anonymous' })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('[MAP-PRESENCE] Toggle error:', err);
    }
  }, [user?.id, myPresence]);

  // Subscribe to realtime presence updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel('map-presence-global')
      .on('broadcast', { event: 'presence_update' }, (payload) => {
        // Someone updated their presence - refresh if they're nearby
        console.log('[MAP-PRESENCE] Broadcast received:', payload);
      })
      .subscribe();

    channelRef.current = channel;

    // Fetch initial count
    fetchTotalActiveUsers();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, fetchTotalActiveUsers]);

  // Remove presence when user leaves
  useEffect(() => {
    const handleUnload = () => {
      if (user?.id) {
        // Note: This is best-effort, may not always execute
        navigator.sendBeacon && navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_map_presence?user_id=eq.${user.id}`,
          JSON.stringify({ last_active_at: new Date().toISOString() })
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.id]);

  return {
    nearbyUsers,
    clusters,
    myPresence,
    isLoading,
    totalActiveUsers,

    // Actions
    fetchNearbyUsers,
    updateMyPresence,
    toggleSharing,
    fetchTotalActiveUsers,
  };
};
