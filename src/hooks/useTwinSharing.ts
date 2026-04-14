import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserHealthProfile } from '@/types/health';

export interface SharedTwin {
  id: string;
  name: string;
  phone: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    lastUpdated: string;
  };
  healthSummary: {
    bioShieldScore: number;
    bloodType?: string;
    chronicConditions: string[];
    allergies: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  connectedAt: string;
  connectionType: 'qr';
}

interface TwinSharingState {
  isSharing: boolean;
  sharingCode: string | null;
  connectedTwins: SharedTwin[];
  myLocation: { lat: number; lng: number } | null;
}

const SHARING_CHANNEL_PREFIX = 'twin-sharing:';
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds

export const useTwinSharing = (profile: UserHealthProfile | null) => {
  const [state, setState] = useState<TwinSharingState>({
    isSharing: false,
    sharingCode: null,
    connectedTwins: [],
    myLocation: null
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const locationWatchRef = useRef<number | null>(null);

  // Generate unique sharing code
  const generateSharingCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }, []);

  // Get current location
  const getCurrentLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Start watching location
  const startLocationWatch = useCallback(() => {
    if (!navigator.geolocation) return;

    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setState(prev => ({ ...prev, myLocation: newLocation }));

        // Broadcast location update if sharing
        if (channelRef.current && state.isSharing && profile) {
          channelRef.current.track({
            id: profile.id,
            location: newLocation,
            lastUpdated: new Date().toISOString()
          });
        }
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }, [state.isSharing, profile]);

  // Stop watching location
  const stopLocationWatch = useCallback(() => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  }, []);

  // Start sharing session
  const startSharing = useCallback(async () => {
    if (!profile) {
      toast.error('Vui lòng đăng nhập trước');
      return null;
    }

    try {
      const code = generateSharingCode();
      const location = await getCurrentLocation();
      
      // Create realtime channel
      const channel = supabase.channel(`${SHARING_CHANNEL_PREFIX}${code}`, {
        config: {
          presence: {
            key: profile.id
          }
        }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const twins: SharedTwin[] = [];

          Object.entries(presenceState).forEach(([id, presences]) => {
            if (id !== profile.id && presences.length > 0) {
              const presence = presences[0] as any;
              twins.push({
                id,
                name: presence.name || 'Unknown',
                phone: presence.phone || '',
                location: {
                  lat: presence.location?.lat || 0,
                  lng: presence.location?.lng || 0,
                  address: presence.location?.address,
                  lastUpdated: presence.location?.lastUpdated || new Date().toISOString()
                },
                healthSummary: {
                  bioShieldScore: presence.healthSummary?.bioShieldScore || 0,
                  bloodType: presence.healthSummary?.bloodType,
                  chronicConditions: presence.healthSummary?.chronicConditions || [],
                  allergies: presence.healthSummary?.allergies || [],
                  riskLevel: presence.healthSummary?.riskLevel || 'low'
                },
                connectedAt: presence.connectedAt || new Date().toISOString(),
                connectionType: presence.connectionType || 'qr'
              });
            }
          });

          setState(prev => ({ ...prev, connectedTwins: twins }));
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== profile.id) {
            toast.success(`${(newPresences[0] as any).name || 'Người dùng'} đã kết nối!`);
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (key !== profile.id) {
            toast.info(`${(leftPresences[0] as any).name || 'Người dùng'} đã ngắt kết nối`);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track my presence
            await channel.track({
              name: `User ${profile.phone.slice(-4)}`,
              phone: profile.phone,
              location: {
                lat: location.lat,
                lng: location.lng,
                lastUpdated: new Date().toISOString()
              },
              healthSummary: {
                bioShieldScore: profile.bioShieldScore,
                bloodType: profile.bloodType,
                chronicConditions: profile.chronicConditions,
                allergies: profile.allergies,
                riskLevel: profile.bioShieldScore >= 80 ? 'low' : profile.bioShieldScore >= 50 ? 'medium' : 'high'
              },
              connectedAt: new Date().toISOString(),
              connectionType: 'qr'
            });
          }
        });

      channelRef.current = channel;
      startLocationWatch();

      setState(prev => ({
        ...prev,
        isSharing: true,
        sharingCode: code,
        myLocation: location
      }));

      toast.success('Đã tạo phiên chia sẻ Twin!');
      return code;
    } catch (error) {
      console.error('Error starting sharing:', error);
      toast.error('Không thể tạo phiên chia sẻ');
      return null;
    }
  }, [profile, generateSharingCode, getCurrentLocation, startLocationWatch]);

  // Join existing sharing session
  const joinSession = useCallback(async (code: string) => {
    if (!profile) {
      toast.error('Vui lòng đăng nhập trước');
      return false;
    }

    try {
      const location = await getCurrentLocation();
      
      const channel = supabase.channel(`${SHARING_CHANNEL_PREFIX}${code.toUpperCase()}`, {
        config: {
          presence: {
            key: profile.id
          }
        }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const twins: SharedTwin[] = [];

          Object.entries(presenceState).forEach(([id, presences]) => {
            if (id !== profile.id && presences.length > 0) {
              const presence = presences[0] as any;
              twins.push({
                id,
                name: presence.name || 'Unknown',
                phone: presence.phone || '',
                location: {
                  lat: presence.location?.lat || 0,
                  lng: presence.location?.lng || 0,
                  address: presence.location?.address,
                  lastUpdated: presence.location?.lastUpdated || new Date().toISOString()
                },
                healthSummary: {
                  bioShieldScore: presence.healthSummary?.bioShieldScore || 0,
                  bloodType: presence.healthSummary?.bloodType,
                  chronicConditions: presence.healthSummary?.chronicConditions || [],
                  allergies: presence.healthSummary?.allergies || [],
                  riskLevel: presence.healthSummary?.riskLevel || 'low'
                },
                connectedAt: presence.connectedAt || new Date().toISOString(),
                connectionType: presence.connectionType || 'qr'
              });
            }
          });

          setState(prev => ({ ...prev, connectedTwins: twins }));
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== profile.id) {
            toast.success(`${(newPresences[0] as any).name || 'Người dùng'} đã kết nối!`);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              name: `User ${profile.phone.slice(-4)}`,
              phone: profile.phone,
              location: {
                lat: location.lat,
                lng: location.lng,
                lastUpdated: new Date().toISOString()
              },
              healthSummary: {
                bioShieldScore: profile.bioShieldScore,
                bloodType: profile.bloodType,
                chronicConditions: profile.chronicConditions,
                allergies: profile.allergies,
                riskLevel: profile.bioShieldScore >= 80 ? 'low' : profile.bioShieldScore >= 50 ? 'medium' : 'high'
              },
              connectedAt: new Date().toISOString(),
              connectionType: 'qr'
            });
          }
        });

      channelRef.current = channel;
      startLocationWatch();

      setState(prev => ({
        ...prev,
        isSharing: true,
        sharingCode: code.toUpperCase(),
        myLocation: location
      }));

      toast.success('Đã kết nối thành công!');
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Không thể kết nối. Mã có thể không hợp lệ.');
      return false;
    }
  }, [profile, getCurrentLocation, startLocationWatch]);

  // Stop sharing session
  const stopSharing = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    stopLocationWatch();

    setState(prev => ({
      ...prev,
      isSharing: false,
      sharingCode: null,
      connectedTwins: []
    }));

    toast.info('Đã ngắt kết nối chia sẻ');
  }, [stopLocationWatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      stopLocationWatch();
    };
  }, [stopLocationWatch]);

  // Update location periodically while sharing
  useEffect(() => {
    if (!state.isSharing || !profile || !channelRef.current) return;

    const interval = setInterval(async () => {
      try {
        const location = await getCurrentLocation();
        
        await channelRef.current?.track({
          name: `User ${profile.phone.slice(-4)}`,
          phone: profile.phone,
          location: {
            lat: location.lat,
            lng: location.lng,
            lastUpdated: new Date().toISOString()
          },
          healthSummary: {
            bioShieldScore: profile.bioShieldScore,
            bloodType: profile.bloodType,
            chronicConditions: profile.chronicConditions,
            allergies: profile.allergies,
            riskLevel: profile.bioShieldScore >= 80 ? 'low' : profile.bioShieldScore >= 50 ? 'medium' : 'high'
          },
          connectedAt: new Date().toISOString(),
          connectionType: 'qr'
        });
      } catch (error) {
        console.error('Location update error:', error);
      }
    }, LOCATION_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [state.isSharing, profile, getCurrentLocation]);

  return {
    ...state,
    startSharing,
    stopSharing,
    joinSession
  };
};
