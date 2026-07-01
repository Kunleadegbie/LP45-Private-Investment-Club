"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminROIProcessingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [roiRecords, setRoiRecords] = useState<any[]>([]);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
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

    const { data: opportunityData, error: opportunityError } = await supabase
      .from("investment_opportunities")
      .select("*")
      .in("status", ["open", "closed", "matured"])
      .order("created_at", { ascending: false });

    if (opportunityError) {
      setMessage(opportunityError.message);
      setLoading(false);
      return;
    }

    const { data: roiData, error: roiError } = await supabase
      .from("roi_records")
      .select(`
        *,
        members (
          full_name,
          email,
          phone,
          membership_number
        ),
        investment_opportunities (
          title,
          investment_type,
          maturity_date,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (roiError) {
      setMessage(roiError.message);
      setLoading(false);
      return;
    }

    setOpportunities(opportunityData || []);
    setRoiRecords(roiData || []);
    setLoading(false);
  }

  function money(value: any) {
    return `₦${Number(value || 0).toLocaleString()}`;
  }

  function date(value: any) {
    return value ? new Date(value).toLocaleDateString() : "Not specified";
  }

  function recordsForOpportunity(opportunityId: string) {
    return roiRecords.filter((record) => record.opportunity_id === opportunityId);
  }

  function pendingRecordsForOpportunity(opportunityId: string) {
    return recordsForOpportunity(opportunityId).filter(
      (record) => record.status === "pending"
    );
  }

  function getGrossROI(record: any) {
    return Number(record.gross_roi_amount ?? record.roi_amount ?? 0);
  }

  function getDeduction(record: any) {
    return Number(record.deduction_amount || 0);
  }

  function getNetROI(record: any) {
    return Number(record.net_roi_amount ?? record.roi_amount ?? 0);
  }

  function opportunitySummary(opportunityId: string) {
    const records = recordsForOpportunity(opportunityId);
    const pending = records.filter((record) => record.status === "pending");
    const credited = records.filter((record) =>
      ["credited", "paid"].includes(record.status)
    );

    return {
      totalMembers: records.length,
      pendingMembers: pending.length,
      creditedMembers: credited.length,
      grossROI: records.reduce((sum, item) => sum + getGrossROI(item), 0),
      deductions: records.reduce((sum, item) => sum + getDeduction(item), 0),
      netROI: records.reduce((sum, item) => sum + getNetROI(item), 0),
      pendingNetROI: pending.reduce((sum, item) => sum + getNetROI(item), 0),
    };
  }

  async function processOpportunity(opportunity: any) {
    const pendingRecords = pendingRecordsForOpportunity(opportunity.id);

    if (pendingRecords.length === 0) {
      setMessage("No pending ROI records found for this opportunity.");
      return;
    }

    const confirmed = window.confirm(
      `Process ROI for ${pendingRecords.length} member(s) under "${opportunity.title}"? This will credit net ROI to member wallets and ledger.`
    );

    if (!confirmed) return;

    setProcessingId(opportunity.id);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("process_roi_for_opportunity", {
        p_opportunity_id: opportunity.id,
      });

      if (error) throw error;

      setMessage(
        `ROI processed successfully. Members processed: ${
          data?.processed_count || 0
        }. Total net ROI credited: ${money(data?.total_net_roi || 0)}.`
      );

      await loadPage();
    } catch (error: any) {
      setMessage(error.message || "Unable to process ROI.");
    } finally {
      setProcessingId(null);
    }
  }

  const totals = useMemo(() => {
    return {
      opportunities: opportunities.length,
      records: roiRecords.length,
      pendingRecords: roiRecords.filter((item) => item.status === "pending").length,
      creditedRecords: roiRecords.filter((item) =>
        ["credited", "paid"].includes(item.status)
      ).length,
      grossROI: roiRecords.reduce((sum, item) => sum + getGrossROI(item), 0),
      deductions: roiRecords.reduce((sum, item) => sum + getDeduction(item), 0),
      netROI: roiRecords.reduce((sum, item) => sum + getNetROI(item), 0),
      pendingNetROI: roiRecords
        .filter((item) => item.status === "pending")
        .reduce((sum, item) => sum + getNetROI(item), 0),
    };
  }, [opportunities, roiRecords]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading ROI processing engine...
      </main>
    );
  }

  return (
    <AppShell
      title="ROI Processing Engine"
      subtitle="Bulk process matured investment ROI, credit member wallets, and update ledger automatically."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="mb-8 flex justify-end">
        <button
          onClick={loadPage}
          className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Refresh ROI Engine
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <StatCard title="Opportunities" value={totals.opportunities.toString()} />
        <StatCard title="ROI Records" value={totals.records.toString()} />
        <StatCard title="Pending ROI" value={totals.pendingRecords.toString()} />
        <StatCard title="Credited/Paid" value={totals.creditedRecords.toString()} />
        <StatCard title="Gross ROI" value={money(totals.grossROI)} />
        <StatCard title="Deductions" value={money(totals.deductions)} />
        <StatCard title="Net ROI" value={money(totals.netROI)} />
        <StatCard title="Pending Net ROI" value={money(totals.pendingNetROI)} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Process ROI by Investment Opportunity</h2>

        <div className="mt-5 grid gap-6">
          {opportunities.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
              No investment opportunity found.
            </div>
          ) : (
            opportunities.map((opportunity) => {
              const summary = opportunitySummary(opportunity.id);
              const pendingRecords = pendingRecordsForOpportunity(opportunity.id);

              return (
                <div
                  key={opportunity.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{opportunity.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {opportunity.investment_type || "General Investment"} • ROI{" "}
                        {opportunity.expected_roi_percent}% • Maturity{" "}
                        {date(opportunity.maturity_date)}
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
                        Status:{" "}
                        <span className="capitalize text-slate-200">
                          {opportunity.status}
                        </span>{" "}
                        • Deduction:{" "}
                        {opportunity.deduction_applicable
                          ? `${opportunity.deduction_label || "WHT"} @ ${Number(
                              opportunity.deduction_rate || 0
                            )}%`
                          : "Not applicable"}
                      </p>
                    </div>

                    <button
                      onClick={() => processOpportunity(opportunity)}
                      disabled={
                        processingId === opportunity.id ||
                        pendingRecords.length === 0
                      }
                      className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {processingId === opportunity.id
                        ? "Processing..."
                        : pendingRecords.length === 0
                        ? "No Pending ROI"
                        : "Process Net ROI"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <MiniCard title="Total Members" value={summary.totalMembers} />
                    <MiniCard title="Pending Members" value={summary.pendingMembers} />
                    <MiniCard title="Credited/Paid" value={summary.creditedMembers} />
                    <MiniCard title="Pending Net ROI" value={money(summary.pendingNetROI)} />
                    <MiniCard title="Gross ROI" value={money(summary.grossROI)} />
                    <MiniCard title="Deductions" value={money(summary.deductions)} />
                    <MiniCard title="Net ROI" value={money(summary.netROI)} />
                  </div>

                  <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1200px] text-left text-sm">
                        <thead className="bg-slate-900 text-slate-300">
                          <tr>
                            <th className="px-5 py-4">Member</th>
                            <th className="px-5 py-4">Capital</th>
                            <th className="px-5 py-4">Gross ROI</th>
                            <th className="px-5 py-4">Deduction</th>
                            <th className="px-5 py-4">Net ROI</th>
                            <th className="px-5 py-4">Net Payable</th>
                            <th className="px-5 py-4">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {recordsForOpportunity(opportunity.id).length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-5 py-8 text-center text-slate-400"
                              >
                                No ROI records found for this opportunity.
                              </td>
                            </tr>
                          ) : (
                            recordsForOpportunity(opportunity.id).map((record) => (
                              <tr
                                key={record.id}
                                className="border-t border-white/10"
                              >
                                <td className="px-5 py-4">
                                  <div className="font-semibold">
                                    {record.members?.full_name || "N/A"}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {record.members?.membership_number || "N/A"}
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  {money(record.capital_amount)}
                                </td>

                                <td className="px-5 py-4">
                                  {money(getGrossROI(record))}
                                </td>

                                <td className="px-5 py-4">
                                  {record.deduction_applicable ? (
                                    <>
                                      <div>{money(getDeduction(record))}</div>
                                      <div className="text-xs text-slate-400">
                                        {record.deduction_label || "WHT"} @{" "}
                                        {Number(record.deduction_rate || 0)}%
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-500">None</span>
                                  )}
                                </td>

                                <td className="px-5 py-4 font-semibold text-emerald-300">
                                  {money(getNetROI(record))}
                                </td>

                                <td className="px-5 py-4 font-semibold">
                                  {money(
                                    record.net_total_payable ??
                                      record.total_payable ??
                                      0
                                  )}
                                </td>

                                <td className="px-5 py-4">
                                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                                    {record.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
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

function MiniCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}