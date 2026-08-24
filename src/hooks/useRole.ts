import { useAuth } from "./useAuth";

export type UserRole = "super_admin" | "admin" | "doctor" | "field_worker" | "viewer";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin:       80,
  doctor:      60,
  field_worker:40,
  viewer:      20,
};

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:  "Quản trị hệ thống",
  admin:        "Quản trị viên",
  doctor:       "Bác sĩ / Y sĩ",
  field_worker: "NVYT tuyến cơ sở",
  viewer:       "Người xem",
};

export function useRole() {
  const { user, isAuthenticated } = useAuth();

  // Role stored in user_metadata — set via Supabase admin or profile update
  const role: UserRole = isAuthenticated
    ? ((user?.user_metadata?.role as UserRole) ?? "viewer")
    : "viewer";

  const level = ROLE_HIERARCHY[role];

  /**
   * hasPermission("admin") → true if current role >= admin in hierarchy
   */
  function hasPermission(required: UserRole): boolean {
    return level >= ROLE_HIERARCHY[required];
  }

  /**
   * canAccess("admin", "doctor") → true if role is one of the listed roles
   */
  function canAccess(...allowed: UserRole[]): boolean {
    return allowed.includes(role) || hasPermission("super_admin");
  }

  return {
    role,
    level,
    label: ROLE_LABELS[role],
    hasPermission,
    canAccess,
    isAdmin:       hasPermission("admin"),
    isDoctor:      hasPermission("doctor"),
    isFieldWorker: hasPermission("field_worker"),
    isSuperAdmin:  role === "super_admin",
  };
}
