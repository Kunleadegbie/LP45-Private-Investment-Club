import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  checkAdminPermission,
  type AdminPermission,
  type AdminAccessResult,
} from "@/lib/adminPermissions";

export async function requireAdminPermission(
  router: AppRouterInstance,
  permission: AdminPermission
): Promise<AdminAccessResult> {
  const result = await checkAdminPermission(permission);

  if (!result.allowed) {
    if (result.reason === "User is not logged in.") {
      router.push("/login");
      return result;
    }

    if (result.profile?.role === "member") {
      router.push("/member/dashboard");
      return result;
    }

    router.push("/admin/dashboard");
    return result;
  }

  return result;
}

export async function requireAdmin(
  router: AppRouterInstance
): Promise<AdminAccessResult> {
  const result = await checkAdminPermission("view_reports");

  if (!result.allowed && result.profile?.admin_role !== "super_admin") {
    if (result.reason === "User is not logged in.") {
      router.push("/login");
      return result;
    }

    router.push("/admin/dashboard");
    return result;
  }

  return {
    ...result,
    allowed: true,
  };
}