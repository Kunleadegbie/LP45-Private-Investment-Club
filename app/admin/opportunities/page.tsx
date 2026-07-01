"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminOpportunitiesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [opportunities, setOpportunities] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    investmentType: "",
    expectedRoiPercent: "",
    durationDays: "",
    minimumInvestment: "",
    maximumInvestment: "",
    totalTargetAmount: "",
    openingDate: "",
    closingDate: "",
    maturityDate: "",
    deductionApplicable: "no",
    deductionLabel: "WHT",
    deductionRate: "",
    status: "draft",
  });

  useEffect(() => {
    loadPage();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function loadPage() {
    setLoading(true);

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

    const { data } = await supabase
      .from("investment_opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    setOpportunities(data || []);
    setLoading(false);
  }

  async function createOpportunity(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Admin session not found.");

      const deductionApplicable = form.deductionApplicable === "yes";

      const { error } = await supabase.from("investment_opportunities").insert({
        title: form.title,
        description: form.description,
        investment_type: form.investmentType,
        expected_roi_percent: Number(form.expectedRoiPercent),
        duration_days: form.durationDays ? Number(form.durationDays) : null,
        minimum_investment: Number(form.minimumInvestment || 0),
        maximum_investment: form.maximumInvestment
          ? Number(form.maximumInvestment)
          : null,
        total_target_amount: form.totalTargetAmount
          ? Number(form.totalTargetAmount)
          : null,
        opening_date: form.openingDate || null,
        closing_date: form.closingDate || null,
        maturity_date: form.maturityDate || null,
        deduction_applicable: deductionApplicable,
        deduction_label: deductionApplicable ? form.deductionLabel || "WHT" : "WHT",
        deduction_rate: deductionApplicable ? Number(form.deductionRate || 0) : 0,
        status: form.status,
        created_by: user.id,
      });

      if (error) throw error;

      setMessage("Investment opportunity created successfully.");

      setForm({
        title: "",
        description: "",
        investmentType: "",
        expectedRoiPercent: "",
        durationDays: "",
        minimumInvestment: "",
        maximumInvestment: "",
        totalTargetAmount: "",
        openingDate: "",
        closingDate: "",
        maturityDate: "",
        deductionApplicable: "no",
        deductionLabel: "WHT",
        deductionRate: "",
        status: "draft",
      });

      await loadPage();
    } catch (error: any) {
      setMessage(error.message || "Unable to create opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOpportunityStatus(id: string, status: string) {
    await supabase
      .from("investment_opportunities")
      .update({ status })
      .eq("id", id);

    await loadPage();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading opportunities...
      </main>
    );
  }

  return (
    <AppShell
      title="Investment Opportunities"
      subtitle="Create and manage investment opportunities for LP45 members."
      role="admin"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={createOpportunity}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-xl font-semibold">Create New Opportunity</h2>

          <div className="mt-5 space-y-5">
            <Input
              label="Investment Title"
              value={form.title}
              onChange={(v) => updateField("title", v)}
            />

            <Textarea
              label="Description"
              value={form.description}
              onChange={(v) => updateField("description", v)}
            />

            <Input
              label="Investment Type"
              value={form.investmentType}
              onChange={(v) => updateField("investmentType", v)}
              placeholder="e.g. Real Estate, Trading, Fixed Income"
            />

            <Input
              label="Expected ROI (%)"
              type="number"
              value={form.expectedRoiPercent}
              onChange={(v) => updateField("expectedRoiPercent", v)}
            />

            <Input
              label="Duration Days"
              type="number"
              value={form.durationDays}
              onChange={(v) => updateField("durationDays", v)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Minimum Investment"
                type="number"
                value={form.minimumInvestment}
                onChange={(v) => updateField("minimumInvestment", v)}
              />

              <Input
                label="Maximum Investment"
                type="number"
                value={form.maximumInvestment}
                onChange={(v) => updateField("maximumInvestment", v)}
                required={false}
              />
            </div>

            <Input
              label="Total Target Amount"
              type="number"
              value={form.totalTargetAmount}
              onChange={(v) => updateField("totalTargetAmount", v)}
              required={false}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Opening Date"
                type="date"
                value={form.openingDate}
                onChange={(v) => updateField("openingDate", v)}
                required={false}
              />
              <Input
                label="Closing Date"
                type="date"
                value={form.closingDate}
                onChange={(v) => updateField("closingDate", v)}
                required={false}
              />
              <Input
                label="Maturity Date"
                type="date"
                value={form.maturityDate}
                onChange={(v) => updateField("maturityDate", v)}
                required={false}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h3 className="font-semibold">Deduction / Tax</h3>
              <p className="mt-1 text-sm text-slate-400">
                Use this where WHT, VAT, or any other deduction applies to member ROI.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Deduction Applicable?
                  </span>
                  <select
                    value={form.deductionApplicable}
                    onChange={(e) =>
                      updateField("deductionApplicable", e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                {form.deductionApplicable === "yes" && (
                  <>
                    <Input
                      label="Deduction Label"
                      value={form.deductionLabel}
                      onChange={(v) => updateField("deductionLabel", v)}
                      placeholder="e.g. WHT, VAT"
                    />

                    <Input
                      label="Deduction Rate (%)"
                      type="number"
                      value={form.deductionRate}
                      onChange={(v) => updateField("deductionRate", v)}
                      placeholder="e.g. 10"
                    />
                  </>
                )}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Status</span>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="matured">Matured</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Opportunity"}
            </button>
          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
              {message}
            </div>
          )}
        </form>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Existing Opportunities</h2>

          <div className="mt-5 space-y-4">
            {opportunities.length === 0 ? (
              <p className="text-sm text-slate-400">
                No investment opportunity created yet.
              </p>
            ) : (
              opportunities.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {item.investment_type || "General Investment"}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {item.description}
                  </p>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <Info label="ROI" value={`${item.expected_roi_percent}%`} />
                    <Info
                      label="Min Investment"
                      value={`₦${Number(
                        item.minimum_investment || 0
                      ).toLocaleString()}`}
                    />
                    <Info
                      label="Max Investment"
                      value={
                        item.maximum_investment
                          ? `₦${Number(item.maximum_investment).toLocaleString()}`
                          : "No limit"
                      }
                    />
                    <Info
                      label="Target Amount"
                      value={
                        item.total_target_amount
                          ? `₦${Number(item.total_target_amount).toLocaleString()}`
                          : "Not specified"
                      }
                    />
                    <Info
                      label="Deduction"
                      value={
                        item.deduction_applicable
                          ? `${item.deduction_label || "WHT"} @ ${Number(
                              item.deduction_rate || 0
                            )}%`
                          : "No deduction"
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <label className="text-xs text-slate-400">Update Status</label>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateOpportunityStatus(item.id, e.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="matured">Matured</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}