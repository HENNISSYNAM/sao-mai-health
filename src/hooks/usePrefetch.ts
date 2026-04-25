import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchQuery = (queryKey: string[], queryFn: () => Promise<any>) => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Prefetch functions for different pages
  const prefetchAppointments = () => {
    prefetchQuery(['appointments'], async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      return data;
    });
  };

  const prefetchAlerts = () => {
    prefetchQuery(['alerts'], async () => {
      const { data, error } = await supabase
        .from('temperature_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    });
  };

  const prefetchBeds = () => {
    prefetchQuery(['beds'], async () => {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    });
  };

  const prefetchCampaigns = () => {
    prefetchQuery(['campaigns'], async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    });
  };

  const prefetchPatients = () => {
    prefetchQuery(['patients'], async () => {
      // Mock data since patients table doesn't exist
      return [];
    });
  };

  const prefetchInventory = () => {
    prefetchQuery(['inventory'], async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    });
  };

  const prefetchDashboard = () => {
    prefetchQuery(['dashboard'], async () => {
      // Prefetch multiple dashboard data
      const [appointmentsRes, alertsRes, campaignsRes] = await Promise.all([
        supabase.from('appointments').select('*').limit(10),
        supabase.from('temperature_alerts').select('*').limit(5),
        supabase.from('campaigns').select('*').limit(5)
      ]);

      return {
        appointments: appointmentsRes.data || [],
        alerts: alertsRes.data || [],
        campaigns: campaignsRes.data || []
      };
    });
  };

  const prefetchByRoute = (route: string) => {
    switch (route) {
      case '/dashboard':
        prefetchDashboard();
        break;
      case '/appointments':
        prefetchAppointments();
        break;
      case '/alerts':
        prefetchAlerts();
        break;
      case '/beds':
        prefetchBeds();
        break;
      case '/campaigns':
        prefetchCampaigns();
        break;
      case '/patients':
        prefetchPatients();
        break;
      case '/inventory':
        prefetchInventory();
        break;
      default:
        break;
    }
  };

  return {
    prefetchByRoute,
    prefetchAppointments,
    prefetchAlerts,
    prefetchBeds,
    prefetchCampaigns,
    prefetchPatients,
    prefetchInventory,
    prefetchDashboard
  };
};