import type { AdminPermission } from "@/lib/adminPermissions";

export type Role = "member" | "admin";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  permission?: AdminPermission;
  superAdminOnly?: boolean;
};

export const memberNavigation: NavItem[] = [
  { label: "Dashboard", href: "/member/dashboard", icon: "🏠" },
  { label: "Wallet", href: "/member/wallet", icon: "💼" },
  { label: "Deposits", href: "/member/deposits", icon: "⬆️" },
  { label: "Investments", href: "/member/investments", icon: "📈" },
  { label: "Withdrawals", href: "/member/withdrawals", icon: "⬇️" },
  { label: "Ledger", href: "/member/ledger", icon: "📒" },
  { label: "Statement", href: "/member/statement", icon: "🧾" },
  { label: "Profile", href: "/member/profile", icon: "👤" },
  { label: "Notifications", href: "/member/notifications", icon: "🔔" },
];

export const adminNavigation: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "🏠" },
  { label: "Members", href: "/admin/members", icon: "👥" },
  {
    label: "Deposits",
    href: "/admin/deposits",
    icon: "⬆️",
    permission: "approve_deposits",
  },
  {
    label: "Opportunities",
    href: "/admin/opportunities",
    icon: "📌",
    permission: "manage_opportunities",
  },
  { label: "Investments", href: "/admin/investments", icon: "📈" },
  {
    label: "ROI",
    href: "/admin/roi",
    icon: "💰",
    permission: "process_roi",
  },
  {
    label: "ROI Processing",
    href: "/admin/roi-processing",
    icon: "⚙️",
    permission: "process_roi",
  },
  {
    label: "Withdrawals",
    href: "/admin/withdrawals",
    icon: "⬇️",
    permission: "pay_withdrawals",
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "📊",
    permission: "view_reports",
  },
  { label: "Certificates", href: "/admin/certificates", icon: "🏅" },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "⚙️",
    permission: "manage_settings",
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: "🛡️",
    permission: "view_audit_logs",
  },
  {
    label: "Admin Users",
    href: "/admin/users",
    icon: "👑",
    permission: "manage_admins",
    superAdminOnly: true,
  },
  {
    label: "Announcements",
    href: "/admin/announcements",
    icon: "📣",
    permission: "manage_settings",
  },
];

export function filterAdminNavigation(profile: any) {
  if (!profile) return [];

  if (profile.admin_role === "super_admin") {
    return adminNavigation;
  }

  const permissions = profile.permissions || {};

  return adminNavigation.filter((item) => {
    if (item.superAdminOnly) return false;
    if (!item.permission) return true;
    return permissions[item.permission] === true;
  });
}

export function getNavigation(role: Role, profile?: any) {
  if (role === "member") return memberNavigation;
  return filterAdminNavigation(profile);
}