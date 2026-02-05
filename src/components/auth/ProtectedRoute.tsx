 import React, { useEffect } from 'react';
 import { useLocation, Navigate } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const location = useLocation();

   // Save intended destination when not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const fullPath = `${location.pathname}${location.search}${location.hash}`;
      sessionStorage.setItem('auth_redirect_to', fullPath);
    }
  }, [isLoading, isAuthenticated, location.pathname, location.search, location.hash]);

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

   // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
     return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
