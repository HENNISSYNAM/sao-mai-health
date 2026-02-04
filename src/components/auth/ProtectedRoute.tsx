import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { AuthModal } from '@/components/auth/AuthModal';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show auth modal when not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Save the intended destination
      sessionStorage.setItem('auth_redirect_to', location.pathname);
      setShowAuthModal(true);
    }
  }, [isLoading, isAuthenticated, location.pathname]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Show auth modal overlay if not authenticated (like Instagram)
  if (!isAuthenticated) {
    return (
      <>
        {/* Show blurred/disabled content behind */}
        <div className="pointer-events-none opacity-50 blur-sm">
          {children}
        </div>
        
        {/* Auth modal on top */}
        <AuthModal 
          open={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    );
  }

  return <>{children}</>;
};
