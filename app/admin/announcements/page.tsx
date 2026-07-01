"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminAnnouncementsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    audience: "all",
    title: "",
    body: "",
    priority: "info",
    actionUrl: "/member/notifications",
  });

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    setMessage("");

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
      .from("members")
      .select("id, user_id, full_name, email, membership_number, status")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const targetMembers = useMemo(() => {
    if (form.audience === "approved") {
      return members.filter((item) => item.status === "approved");
    }

    if (form.audience === "pending") {
      return members.filter((item) => item.status === "pending");
    }

    return members;
  }, [members, form.audience]);

  async function sendAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage("");

    try {
      if (!form.title.trim() || !form.body.trim()) {
        throw new Error("Announcement title and message are required.");
      }

      if (targetMembers.length === 0) {
        throw new Error("No members found for the selected audience.");
      }

      const rows = targetMembers.map((member) => ({
        user_id: member.user_id,
        member_id: member.id,
        title: form.title.trim(),
        message: form.body.trim(),
        notification_type: "announcement",
        related_entity_type: "announcement",
        related_entity_id: null,
        priority: form.priority,
        action_url: form.actionUrl || "/member/notifications",
      }));

      const { error } = await supabase.from("notifications").insert(rows);

      if (error) throw error;

      setMessage(
        `Announcement sent successfully to ${targetMembers.length} member(s).`
      );

      setForm({
        audience: "all",
        title: "",
        body: "",
        priority: "info",
        actionUrl: "/member/notifications",
      });
    } catch (error: any) {
      setMessage(error.message || "Unable to send announcement.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading announcements...
      </main>
    );
  }

  return (
    <AppShell
      title="Announcement Center"
      subtitle="Send platform announcements and important notices to LP45 members."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Total Members" value={members.length.toString()} />
        <StatCard
          title="Approved Members"
          value={members.filter((item) => item.status === "approved").length.toString()}
        />
        <StatCard
          title="Selected Audience"
          value={targetMembers.length.toString()}
        />
      </div>

      <form
        onSubmit={sendAnnouncement}
        className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6"
      >
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Audience</span>
            <select
              value={form.audience}
              onChange={(e) => updateField("audience", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
            >
              <option value="all">All Members</option>
              <option value="approved">Approved Members</option>
              <option value="pending">Pending Members</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Priority</span>
            <select
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Action URL
            </span>
            <input
              value={form.actionUrl}
              onChange={(e) => updateField("actionUrl", e.target.value)}
              placeholder="/member/notifications"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Announcement Title
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. New Investment Opportunity Available"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Announcement Message
            </span>
            <textarea
              required
              rows={7}
              value={form.body}
              onChange={(e) => updateField("body", e.target.value)}
              placeholder="Write the announcement message members will receive..."
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <p className="text-sm font-semibold">Preview</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4">
            <p className="font-semibold">{form.title || "Announcement title"}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {form.body || "Announcement message preview will appear here."}
            </p>
            <p className="mt-3 text-xs capitalize text-slate-500">
              Priority: {form.priority} • Audience: {targetMembers.length} member(s)
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {sending ? "Sending Announcement..." : "Send Announcement"}
          </button>
        </div>
      </form>
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