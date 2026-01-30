import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile, UserProfile } from '@/hooks/useUserProfile';
import { SmartOnboardingModal } from '@/components/onboarding/SmartOnboardingModal';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  profile: UserProfile | null;
  needsOnboarding: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { profile, loading: profileLoading, needsOnboarding, completeOnboarding } = useUserProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding modal when user is authenticated but hasn't completed onboarding
  useEffect(() => {
    if (isAuthenticated && !profileLoading && needsOnboarding) {
      // Small delay to let the app render first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, profileLoading, needsOnboarding]);

  const handleOnboardingComplete = async (onboardingProfile: any) => {
    if (!user?.id) return;

    try {
      // Save the onboarding data to user_profiles
      await completeOnboarding({
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        language: onboardingProfile.language,
        region: onboardingProfile.region,
        living_environment: onboardingProfile.living_environment,
        date_of_birth: onboardingProfile.date_of_birth,
        age_group: onboardingProfile.age_group,
        health_sensitivity: onboardingProfile.health_sensitivity,
        primary_interests: onboardingProfile.primary_interest || [],
        alert_threshold: onboardingProfile.alert_threshold,
        inference_log: onboardingProfile.inference_log || [],
      });

      setShowOnboarding(false);
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading: authLoading || profileLoading,
    user,
    profile,
    needsOnboarding: needsOnboarding || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Smart Onboarding Modal */}
      {user && (
        <SmartOnboardingModal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
          userId={user.id}
          googleProfile={{
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            email: user.email,
            locale: user.user_metadata?.locale,
          }}
        />
      )}
    </AuthContext.Provider>
  );
};
