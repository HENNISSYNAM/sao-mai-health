import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserAlert {
  id: string;
  user_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  metadata: Record<string, any>;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export function useUserAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user?.id) {
      setAlerts([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_alerts')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const alertsData = (data || []) as unknown as UserAlert[];
      setAlerts(alertsData);
      setUnreadCount(alertsData.filter(a => !a.read_at).length);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newAlert = payload.new as UserAlert;
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (alertId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_alerts')
        .update({ read_at: new Date().toISOString() } as any)
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId ? { ...a, read_at: new Date().toISOString() } : a
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  const dismissAlert = async (alertId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_alerts')
        .update({ dismissed_at: new Date().toISOString() } as any)
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (error) throw error;

      const dismissedAlert = alerts.find(a => a.id === alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      if (dismissedAlert && !dismissedAlert.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const unreadIds = alerts.filter(a => !a.read_at).map(a => a.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('user_alerts')
        .update({ read_at: new Date().toISOString() } as any)
        .in('id', unreadIds)
        .eq('user_id', user.id);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a => ({ ...a, read_at: a.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  return {
    alerts,
    unreadCount,
    loading,
    markAsRead,
    dismissAlert,
    markAllAsRead,
    refreshAlerts: fetchAlerts,
  };
}
