import { useAuth } from "./useAuth";
import { useRole } from "./useRole";

export interface OrgContext {
  orgId: string | null;
  orgName: string;
  orgCode: string | null;
  province: string;
  isMultiTenant: boolean;
}

/**
 * Reads org context from user_metadata.
 * Set via Supabase admin: UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"org_id":"cdc-q7","org_name":"CDC Quận 7","province":"TP.HCM"}'
 * super_admin gets null orgId = sees all data across orgs.
 */
export function useOrg(): OrgContext {
  const { user, isAuthenticated } = useAuth();
  const { isSuperAdmin } = useRole();

  if (!isAuthenticated || !user) {
    return { orgId: null, orgName: "Demo", orgCode: null, province: "TP.HCM", isMultiTenant: false };
  }

  const meta = user.user_metadata ?? {};

  return {
    orgId:         isSuperAdmin ? null : (meta.org_id as string | null) ?? null,
    orgName:       (meta.org_name as string) ?? "Đơn vị của bạn",
    orgCode:       (meta.org_code as string | null) ?? null,
    province:      (meta.province as string) ?? "TP.HCM",
    // Multi-tenant is active when the user has an org_id assigned
    isMultiTenant: !isSuperAdmin && !!(meta.org_id as string | null),
  };
}
