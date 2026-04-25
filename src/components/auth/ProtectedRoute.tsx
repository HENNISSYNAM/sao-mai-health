import React, { useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useRole, type UserRole } from "@/hooks/useRole";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If set, user must have at least this role level */
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const { hasPermission, label } = useRole();
  const location = useLocation();

  // Save intended destination when not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const fullPath = `${location.pathname}${location.search}${location.hash}`;
      sessionStorage.setItem("auth_redirect_to", fullPath);
    }
  }, [isLoading, isAuthenticated, location.pathname, location.search, location.hash]);

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

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Role check — user is logged in but doesn't have required permission
  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm p-8">
          <div className="p-4 rounded-2xl bg-destructive/10">
            <ShieldX className="h-10 w-10 text-destructive mx-auto" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Không đủ quyền truy cập</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Trang này yêu cầu quyền <strong>{requiredRole}</strong>. Tài khoản của bạn đang ở cấp <strong>{label}</strong>.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.history.back()}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
