import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface UserPlan {
  user_id: string;
  plan: string;
  status: string;
  expires_at: string | null;
}

export const useSubscription = () => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const fetchUserPlan = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user plan:', error);
        return;
      }

      setUserPlan(data);
    } catch (error) {
      console.error('Error fetching user plan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPlan();
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_plans_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_plans',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Plan updated:', payload);
          if (payload.new) {
            setUserPlan(payload.new as UserPlan);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unlockPlan = async (plan: string = 'pro') => {
    if (!user) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập để mở khóa gói dịch vụ",
        variant: "destructive"
      });
      return;
    }

    setUnlocking(true);
    try {
      const { error } = await supabase.rpc('fn_unlock_plan', {
        uid: user.id,
        plan_name: plan
      });

      if (error) {
        console.error('Error unlocking plan:', error);
        toast({
          title: "Lỗi",
          description: "Không thể mở khóa gói dịch vụ. Vui lòng thử lại.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Thành công",
        description: "Gói dịch vụ đã được mở khóa thành công!",
        variant: "default"
      });

      // Refresh user plan
      await fetchUserPlan();
    } catch (error) {
      console.error('Error unlocking plan:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setUnlocking(false);
    }
  };

  const hasAccess = (requiredPlans: string[] = ['pro', 'enterprise']) => {
    if (!userPlan) return false;
    
    return (
      requiredPlans.includes(userPlan.plan.toLowerCase()) &&
      userPlan.status === 'active' &&
      (!userPlan.expires_at || new Date(userPlan.expires_at) > new Date())
    );
  };

  return {
    userPlan,
    loading,
    unlocking,
    hasAccess,
    unlockPlan,
    refreshPlan: fetchUserPlan
  };
};