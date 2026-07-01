import { supabase } from "@/lib/supabaseClient";

export type AdminPermission =
  | "approve_deposits"
  | "manage_opportunities"
  | "process_roi"
  | "pay_withdrawals"
  | "view_reports"
  | "view_audit_logs"
  | "manage_settings"
  | "manage_admins";

export type AdminAccessResult = {
  allowed: boolean;
  reason?: string;
  profile?: any;
};

export async function checkAdminPermission(
  permission: AdminPermission
): Promise<AdminAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      allowed: false,
      reason: "User is not logged in.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, admin_role, permissions, status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      allowed: false,
      reason: "User profile not found.",
    };
  }

  if (profile.role !== "admin") {
    return {
      allowed: false,
      reason: "User is not an administrator.",
      profile,
    };
  }

  if (profile.status && profile.status !== "active") {
    return {
      allowed: false,
      reason: "Administrator account is not active.",
      profile,
    };
  }

  if (profile.admin_role === "super_admin") {
    return {
      allowed: true,
      profile,
    };
  }

  const permissions = profile.permissions || {};

  if (permissions[permission] === true) {
    return {
      allowed: true,
      profile,
    };
  }

  return {
    allowed: false,
    reason: `Missing permission: ${permission}`,
    profile,
  };
}

export function formatPermission(permission: string) {
  return permission.replaceAll("_", " ");
}