"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function MemberNotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setNotifications(data || []);
    setLoading(false);
  }

  async function markAsRead(notification: any) {
    if (notification.is_read) {
      if (notification.action_url) router.push(notification.action_url);
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadNotifications();

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in("id", unreadIds);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("All notifications marked as read.");
    await loadNotifications();
  }

  function formatDate(value: any) {
    return value ? new Date(value).toLocaleString() : "N/A";
  }

  function badgeClass(priority: string) {
    if (priority === "success") {
      return "bg-emerald-500/15 text-emerald-300";
    }

    if (priority === "warning") {
      return "bg-amber-500/15 text-amber-300";
    }

    if (priority === "critical") {
      return "bg-red-500/15 text-red-300";
    }

    return "bg-blue-500/15 text-blue-300";
  }

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.is_read);
    }

    if (filter === "read") {
      return notifications.filter((item) => item.is_read);
    }

    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading notifications...
      </main>
    );
  }

  return (
    <AppShell
      title="Notifications"
      subtitle="Important updates about deposits, investments, ROI, withdrawals, and certificates."
      role="member"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="mb-8 grid gap-5 md:grid-cols-4">
        <StatCard title="Total Notifications" value={notifications.length.toString()} />
        <StatCard title="Unread" value={unreadCount.toString()} />
        <StatCard
          title="Read"
          value={(notifications.length - unreadCount).toString()}
        />
        <StatCard
          title="Latest"
          value={
            notifications[0]?.created_at
              ? new Date(notifications[0].created_at).toLocaleDateString()
              : "N/A"
          }
        />
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-end md:justify-between">
        <label className="block w-full md:max-w-sm">
          <span className="mb-2 block text-sm text-slate-300">Filter</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </label>

        <div className="flex gap-3">
          <button
            onClick={loadNotifications}
            className="rounded-xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Refresh
          </button>

          <button
            onClick={markAllAsRead}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Mark All Read
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
            No notification found.
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markAsRead(notification)}
              className={`rounded-3xl border p-5 text-left transition hover:bg-white/10 ${
                notification.is_read
                  ? "border-white/10 bg-white/5"
                  : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {notification.title}
                    </h2>

                    {!notification.is_read && (
                      <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold uppercase text-slate-950">
                        New
                      </span>
                    )}

                    <span
                      className={`rounded-full px-3 py-1 text-xs capitalize ${badgeClass(
                        notification.priority
                      )}`}
                    >
                      {notification.priority || "info"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {notification.message}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    {formatDate(notification.created_at)}
                  </p>
                </div>

                <div className="text-sm font-semibold text-emerald-400">
                  {notification.action_url ? "Open →" : "View"}
                </div>
              </div>
            </button>
          ))
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