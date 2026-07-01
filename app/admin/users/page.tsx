"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

const ADMIN_ROLES = [
  "super_admin",
  "finance_admin",
  "investment_admin",
  "operations_admin",
  "auditor",
  "read_only",
];

const PERMISSIONS = [
  { key: "approve_deposits", label: "Approve Deposits" },
  { key: "manage_opportunities", label: "Manage Opportunities" },
  { key: "process_roi", label: "Process ROI" },
  { key: "pay_withdrawals", label: "Pay Withdrawals" },
  { key: "view_reports", label: "View Reports" },
  { key: "view_audit_logs", label: "View Audit Logs" },
  { key: "manage_settings", label: "Manage Settings" },
  { key: "manage_admins", label: "Manage Admins" },
];

export default function AdminUsersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [edits, setEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, admin_role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin" || profile?.admin_role !== "super_admin") {
        router.push("/admin/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProfiles(data || []);

      const initialEdits: Record<string, any> = {};
      (data || []).forEach((item: any) => {
        initialEdits[item.id] = {
          adminRole: item.admin_role || "",
          permissions: item.permissions || {},
        };
      });

      setEdits(initialEdits);
    } catch (error: any) {
      setMessage(error.message || "Unable to load admin users.");
    } finally {
      setLoading(false);
    }
  }

  function formatRole(value: string) {
    return value?.replaceAll("_", " ") || "No role";
  }

  function updateAdminRole(profileId: string, value: string) {
    setEdits((prev) => ({
      ...prev,
      [profileId]: {
        ...(prev[profileId] || {}),
        adminRole: value,
      },
    }));
  }

  function togglePermission(profileId: string, permission: string) {
    setEdits((prev) => {
      const current = prev[profileId] || {};
      const currentPermissions = current.permissions || {};

      return {
        ...prev,
        [profileId]: {
          ...current,
          permissions: {
            ...currentPermissions,
            [permission]: !currentPermissions[permission],
          },
        },
      };
    });
  }

  async function saveRole(profile: any) {
    setSavingId(profile.id);
    setMessage("");

    try {
      const edit = edits[profile.id];

      if (!edit?.adminRole) {
        throw new Error("Please select an admin role.");
      }

      const { error } = await supabase.rpc("update_admin_role", {
        p_profile_id: profile.id,
        p_admin_role: edit.adminRole,
        p_permissions: edit.permissions || {},
      });

      if (error) throw error;

      setMessage("Admin role and permissions updated successfully.");
      await loadUsers();
    } catch (error: any) {
      setMessage(error.message || "Unable to update admin role.");
    } finally {
      setSavingId(null);
    }
  }

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const text = [
        profile.full_name,
        profile.email,
        profile.role,
        profile.admin_role,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [profiles, search]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading admin users...
      </main>
    );
  }

  return (
    <AppShell
      title="Admin Users"
      subtitle="Manage administrator roles, access levels, and operational permissions."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-4">
        <StatCard title="Total Users" value={profiles.length.toString()} />
        <StatCard
          title="Admins"
          value={profiles.filter((item) => item.role === "admin").length.toString()}
        />
        <StatCard
          title="Members"
          value={profiles.filter((item) => item.role === "member").length.toString()}
        />
        <StatCard
          title="Super Admins"
          value={
            profiles
              .filter((item) => item.admin_role === "super_admin")
              .length.toString()
          }
        />
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">
            Search Users
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, role..."
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      <div className="mt-8 grid gap-6">
        {filteredProfiles.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
            No user found.
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const edit = edits[profile.id] || {};
            const permissions = edit.permissions || {};

            return (
              <div
                key={profile.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {profile.full_name || "Unnamed User"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {profile.email}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge label={formatRole(profile.role)} />
                      {profile.admin_role && (
                        <Badge label={formatRole(profile.admin_role)} />
                      )}
                      <Badge label={profile.status || "active"} />
                    </div>
                  </div>

                  <div className="w-full max-w-sm">
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">
                        Admin Role
                      </span>
                      <select
                        value={edit.adminRole || ""}
                        onChange={(e) =>
                          updateAdminRole(profile.id, e.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
                      >
                        <option value="">Not Admin</option>
                        {ADMIN_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {formatRole(role)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5">
                  <h3 className="font-semibold">Permissions</h3>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {PERMISSIONS.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(permissions[permission.key])}
                          onChange={() =>
                            togglePermission(profile.id, permission.key)
                          }
                          className="h-4 w-4"
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Super Admin automatically has all permissions, even if some
                    permission boxes are not checked.
                  </p>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => saveRole(profile)}
                    disabled={savingId === profile.id}
                    className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {savingId === profile.id ? "Saving..." : "Save Role"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-slate-300">
      {label}
    </span>
  );
}