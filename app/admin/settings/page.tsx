"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settingsId, setSettingsId] = useState("");

  const [form, setForm] = useState({
    clubName: "",
    clubShortName: "",
    defaultDeductionLabel: "",
    defaultDeductionRate: "",
    investmentManagerName: "",
    clubSecretaryName: "",
    supportEmail: "",
    supportPhone: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    certificateFooterNote: "",
    statementFooterNote: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function loadSettings() {
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
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setSettingsId(data.id);

    setForm({
      clubName: data.club_name || "",
      clubShortName: data.club_short_name || "",
      defaultDeductionLabel: data.default_deduction_label || "",
      defaultDeductionRate: String(data.default_deduction_rate ?? ""),
      investmentManagerName: data.investment_manager_name || "",
      clubSecretaryName: data.club_secretary_name || "",
      supportEmail: data.support_email || "",
      supportPhone: data.support_phone || "",
      bankName: data.bank_name || "",
      bankAccountName: data.bank_account_name || "",
      bankAccountNumber: data.bank_account_number || "",
      certificateFooterNote: data.certificate_footer_note || "",
      statementFooterNote: data.statement_footer_note || "",
    });

    setLoading(false);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          club_name: form.clubName,
          club_short_name: form.clubShortName,
          default_deduction_label: form.defaultDeductionLabel,
          default_deduction_rate: Number(form.defaultDeductionRate || 0),
          investment_manager_name: form.investmentManagerName,
          club_secretary_name: form.clubSecretaryName,
          support_email: form.supportEmail,
          support_phone: form.supportPhone,
          bank_name: form.bankName,
          bank_account_name: form.bankAccountName,
          bank_account_number: form.bankAccountNumber,
          certificate_footer_note: form.certificateFooterNote,
          statement_footer_note: form.statementFooterNote,
        })
        .eq("id", settingsId);

      if (error) throw error;

      setMessage("Platform settings updated successfully.");
      await loadSettings();
    } catch (error: any) {
      setMessage(error.message || "Unable to save platform settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading platform settings...
      </main>
    );
  }

  return (
    <AppShell
      title="Platform Settings"
      subtitle="Manage LP45 club identity, default deduction settings, support details, bank details, and document notes."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <form onSubmit={saveSettings} className="grid gap-6">
        <SettingsSection
          title="Club Identity"
          description="These details will be used across dashboards, certificates, statements, and future PDF documents."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Club Name"
              value={form.clubName}
              onChange={(v) => updateField("clubName", v)}
            />

            <Input
              label="Club Short Name"
              value={form.clubShortName}
              onChange={(v) => updateField("clubShortName", v)}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Default Deduction / Tax"
          description="These default values can guide future investment opportunity setup."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Default Deduction Label"
              value={form.defaultDeductionLabel}
              onChange={(v) => updateField("defaultDeductionLabel", v)}
              placeholder="e.g. WHT, VAT"
            />

            <Input
              label="Default Deduction Rate (%)"
              type="number"
              value={form.defaultDeductionRate}
              onChange={(v) => updateField("defaultDeductionRate", v)}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Authorized Signatories"
          description="These names will later appear on certificates, reports, and approval documents."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Investment Manager Name"
              value={form.investmentManagerName}
              onChange={(v) => updateField("investmentManagerName", v)}
            />

            <Input
              label="Club Secretary Name"
              value={form.clubSecretaryName}
              onChange={(v) => updateField("clubSecretaryName", v)}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Support Contact"
          description="Member-facing support details."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Support Email"
              type="email"
              value={form.supportEmail}
              onChange={(v) => updateField("supportEmail", v)}
              required={false}
            />

            <Input
              label="Support Phone"
              value={form.supportPhone}
              onChange={(v) => updateField("supportPhone", v)}
              required={false}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Club Bank Details"
          description="Primary club account details for deposits or reference."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Input
              label="Bank Name"
              value={form.bankName}
              onChange={(v) => updateField("bankName", v)}
              required={false}
            />

            <Input
              label="Account Name"
              value={form.bankAccountName}
              onChange={(v) => updateField("bankAccountName", v)}
              required={false}
            />

            <Input
              label="Account Number"
              value={form.bankAccountNumber}
              onChange={(v) => updateField("bankAccountNumber", v)}
              required={false}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Document Notes"
          description="Footer notes for investment certificates and member statements."
        >
          <div className="grid gap-5">
            <Textarea
              label="Certificate Footer Note"
              value={form.certificateFooterNote}
              onChange={(v) => updateField("certificateFooterNote", v)}
            />

            <Textarea
              label="Statement Footer Note"
              value={form.statementFooterNote}
              onChange={(v) => updateField("statementFooterNote", v)}
            />
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? "Saving Settings..." : "Save Platform Settings"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <textarea
        required
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
      />
    </label>
  );
}