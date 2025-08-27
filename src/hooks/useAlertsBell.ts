import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AlertItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  facility_id: string | null;
  ward: string | null;
  created_at: string;
  is_unread: boolean;
}

interface AlertsUnreadCount {
  unread: number;
}

export const useAlertsBell = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Query for alerts list
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts:bell:list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_alerts_bell' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as unknown as AlertItem[]) || [];
    },
  });

  // Query for unread count
  const { data: unreadData, isLoading: countLoading } = useQuery({
    queryKey: ['alerts:unread'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_alerts_unread_count' as any)
        .select('*')
        .single();
      
      if (error) throw error;
      return (data as unknown as AlertsUnreadCount) || { unread: 0 };
    },
  });

  // Mark single alert as read
  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase.rpc('fn_alert_mark_read' as any, {
        p_alert_id: alertId
      });
      
      if (error) throw error;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['alerts:bell:list'] });
      queryClient.invalidateQueries({ queryKey: ['alerts:unread'] });
      
      toast.success('Alert marked as read');
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Failed to mark alert as read');
    }
  };

  // Mark all alerts as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('fn_alert_mark_all_read' as any);
      
      if (error) throw error;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['alerts:bell:list'] });
      queryClient.invalidateQueries({ queryKey: ['alerts:unread'] });
      
      toast.success('All alerts marked as read');
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      toast.error('Failed to mark all alerts as read');
    }
  };

  // Navigate to alert details
  const navigateToAlert = (alertId: string) => {
    navigate(`/alerts?id=${alertId}`);
  };

  // Handle alert click - mark as read and navigate
  const handleAlertClick = async (alertId: string) => {
    await markAsRead(alertId);
    navigateToAlert(alertId);
  };

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'health',
          table: 'alerts'
        },
        () => {
          console.log('Alerts changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['alerts:bell:list'] });
          queryClient.invalidateQueries({ queryKey: ['alerts:unread'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'health',
          table: 'alert_reads'
        },
        () => {
          console.log('Alert reads changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['alerts:bell:list'] });
          queryClient.invalidateQueries({ queryKey: ['alerts:unread'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    alerts,
    unreadCount: unreadData?.unread || 0,
    isLoading: alertsLoading || countLoading,
    markAsRead,
    markAllAsRead,
    handleAlertClick,
    navigateToAlert,
  };
};