"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminAuditLogsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
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
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/member/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      setLogs(data || []);
    } catch (error: any) {
      setMessage(error.message || "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value: any) {
    return value ? new Date(value).toLocaleString() : "N/A";
  }

  function formatAction(value: string) {
    return value?.replaceAll("_", " ") || "Unknown action";
  }

  const actionTypes = useMemo(() => {
    const unique = Array.from(
      new Set(logs.map((item) => item.action_type).filter(Boolean))
    );

    return unique.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction =
        actionFilter === "all" || log.action_type === actionFilter;

      const searchText = [
        log.actor_email,
        log.actor_role,
        log.action_type,
        log.entity_type,
        log.description,
        JSON.stringify(log.metadata || {}),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      return matchesAction && matchesSearch;
    });
  }, [logs, search, actionFilter]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading audit logs...
      </main>
    );
  }

  return (
    <AppShell
      title="Audit Logs"
      subtitle="Compliance trail of key financial and administrative actions across LP45."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-4">
        <StatCard title="Total Logs" value={logs.length.toString()} />
        <StatCard
          title="Filtered Logs"
          value={filteredLogs.length.toString()}
        />
        <StatCard
          title="Action Types"
          value={actionTypes.length.toString()}
        />
        <StatCard
          title="Latest Log"
          value={logs[0]?.created_at ? formatDate(logs[0].created_at) : "N/A"}
        />
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm text-slate-300">
              Search Logs
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, action, description, metadata..."
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Action Type
            </span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
            >
              <option value="all">All Actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {formatAction(type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={loadAuditLogs}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Refresh Logs
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Date/Time</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Entity</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Metadata</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No audit log found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-white/10">
                    <td className="px-5 py-4 text-slate-400">
                      {formatDate(log.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold capitalize text-emerald-300">
                        {formatAction(log.action_type)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {log.actor_email || "System"}
                      </div>
                      <div className="text-xs capitalize text-slate-400">
                        {log.actor_role || "N/A"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="capitalize">
                        {log.entity_type?.replaceAll("_", " ") || "N/A"}
                      </div>
                      <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                        {log.entity_id || "No entity ID"}
                      </div>
                    </td>

                    <td className="px-5 py-4 leading-6">
                      {log.description || "No description"}
                    </td>

                    <td className="px-5 py-4">
                      <pre className="max-h-32 max-w-[360px] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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