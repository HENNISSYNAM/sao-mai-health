import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile, UserProfile } from '@/hooks/useUserProfile';
import { SmartOnboardingModal } from '@/components/onboarding/SmartOnboardingModal';

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
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // For now, onboarding is considered not needed since the table doesn't have that column
  const needsOnboarding = false;

  const handleOnboardingComplete = async (onboardingProfile: any) => {
    if (!user?.id) return;

    try {
      // Save only fields that exist in the actual user_profiles table
      await updateProfile({
        gender: onboardingProfile.gender,
        blood_type: onboardingProfile.blood_type,
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
    needsOnboarding,
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
