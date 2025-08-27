import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false
        });

        if (event === 'SIGNED_IN') {
          toast({
            title: "Đăng nhập thành công",
            description: "Chào mừng bạn trở lại!"
          });
          
          // Redirect to home page after successful login
          setTimeout(() => {
            navigate('/');
          }, 100);
        }
        
        if (event === 'SIGNED_OUT') {
          toast({
            title: "Đăng xuất thành công",
            description: "Hẹn gặp lại bạn!"
          });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false
      });
    });

    return () => subscription.unsubscribe();
  }, [toast, navigate]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Lỗi đăng xuất",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getUserRole = () => {
    if (!authState.user) return null;
    return authState.user.app_metadata?.role || 'authenticated';
  };

  return {
    ...authState,
    signOut,
    getUserRole
  };
};