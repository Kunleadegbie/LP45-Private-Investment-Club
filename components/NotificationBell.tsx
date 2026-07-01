"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NotificationBell() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  async function loadNotifications() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) {
      setNotifications(data || []);
    }

    setLoading(false);
  }

  async function openNotification(notification: any) {
    if (!notification.is_read) {
      await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      await loadNotifications();
    }

    setOpen(false);

    if (notification.action_url) {
      router.push(notification.action_url);
    } else {
      router.push("/member/notifications");
    }
  }

  async function markAllRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in("id", unreadIds);

    await loadNotifications();
  }

  function formatDate(value: any) {
    if (!value) return "N/A";

    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  }

  function priorityClass(priority: string) {
    if (priority === "success") {
      return "bg-emerald-500";
    }

    if (priority === "warning") {
      return "bg-amber-500";
    }

    if (priority === "critical") {
      return "bg-red-500";
    }

    return "bg-blue-500";
  }

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          loadNotifications();
        }}
        className="relative rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        aria-label="Open notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="mt-1 text-xs text-slate-400">
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </p>
            </div>

            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-5 text-sm text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-5 text-sm text-slate-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  className={`flex w-full gap-3 border-b border-white/10 p-4 text-left transition hover:bg-white/10 ${
                    notification.is_read ? "bg-slate-900" : "bg-emerald-500/10"
                  }`}
                >
                  <span
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full ${priorityClass(
                      notification.priority
                    )}`}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {notification.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-300">
                      {notification.message}
                    </span>
                    <span className="mt-2 block text-xs text-slate-500">
                      {formatDate(notification.created_at)}
                    </span>
                  </span>

                  {!notification.is_read && (
                    <span className="mt-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold uppercase text-slate-950">
                      New
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              router.push("/member/notifications");
            }}
            className="w-full border-t border-white/10 p-4 text-sm font-semibold text-emerald-400 hover:bg-white/10"
          >
            View All Notifications →
          </button>
        </div>
      )}
    </div>
  );
}