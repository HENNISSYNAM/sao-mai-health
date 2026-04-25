import type { ReactNode } from "react";
import { useRole, type UserRole } from "@/hooks/useRole";
import { Shield } from "lucide-react";

interface RoleGateProps {
  /** Minimum role required (hierarchy-based) */
  requiredRole?: UserRole;
  /** Or: specific roles allowed (any match) */
  allowedRoles?: UserRole[];
  children: ReactNode;
  /** What to show when access denied — defaults to subtle locked message */
  fallback?: ReactNode;
  /** If true, renders nothing when denied instead of fallback */
  silent?: boolean;
}

const DefaultFallback = () => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground text-xs">
    <Shield className="h-3.5 w-3.5 flex-shrink-0" />
    <span>Bạn không có quyền truy cập tính năng này. Liên hệ quản trị viên.</span>
  </div>
);

/**
 * RoleGate wraps any UI that should only be visible/usable by certain roles.
 *
 * Usage:
 *   <RoleGate requiredRole="admin">...</RoleGate>
 *   <RoleGate allowedRoles={["admin","doctor"]}>...</RoleGate>
 *   <RoleGate requiredRole="admin" silent>...</RoleGate>
 */
export function RoleGate({ requiredRole, allowedRoles, children, fallback, silent = false }: RoleGateProps) {
  const { hasPermission, canAccess } = useRole();

  const allowed = requiredRole
    ? hasPermission(requiredRole)
    : allowedRoles
      ? canAccess(...allowedRoles)
      : true;

  if (allowed) return <>{children}</>;
  if (silent) return null;
  return <>{fallback ?? <DefaultFallback />}</>;
}
