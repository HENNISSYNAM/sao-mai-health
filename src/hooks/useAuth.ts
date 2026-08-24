import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cacheSessionData, getCachedSessionData, clearSessionCache } from '@/services/cacheService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const recoveryAttempted = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user?.id) {
          localStorage.setItem('supabase_user_id', session.user.id);
          // Cache session metadata for fast restore
          await cacheSessionData('last_session', {
            user_id: session.user.id,
            email: session.user.email,
            display_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            logged_in_at: new Date().toISOString(),
          });

          // Record login event (only on actual sign-in, not token refresh)
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              try {
                supabase.from('user_logins').insert({
                  user_id: session.user.id,
                  email: session.user.email ?? null,
                  provider: (session.user.app_metadata as any)?.provider ?? null,
                  user_agent: navigator.userAgent,
                  language: navigator.language,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  platform: (navigator as any).platform ?? null,
                  screen_size: `${window.screen.width}x${window.screen.height}`,
                  referrer: document.referrer || null,
                }).then(({ error }) => {
                  if (error) console.warn('Login log failed:', error.message);
                });
              } catch (e) {
                console.warn('Login log error:', e);
              }
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('supabase_user_id');
          await clearSessionCache();
        }

        // Auto-refresh token if expiring soon
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed successfully');
        }
      }
    );

    // THEN check for existing session with recovery
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
        return;
      }

      // If no session but we had a cached one, try refresh
      if (!recoveryAttempted.current) {
        recoveryAttempted.current = true;
        const cached = await getCachedSessionData('last_session');
        if (cached) {
          console.log('🔄 Attempting session recovery...');
          const { data, error } = await supabase.auth.refreshSession();
          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
          } else {
            console.warn('⚠️ Session recovery failed:', error?.message);
            await clearSessionCache();
          }
        }
      }

      setLoading(false);
    };

    initSession();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await clearSessionCache();
    await supabase.auth.signOut();
  };

  const getAvatarUrl = (): string | null => {
    if (!user) return null;
    return user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  };

  const getDisplayName = (): string => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
  };

  return {
    user,
    session,
    loading,
    signOut,
    getAvatarUrl,
    getDisplayName,
    isAuthenticated: !!user,
  };
}
