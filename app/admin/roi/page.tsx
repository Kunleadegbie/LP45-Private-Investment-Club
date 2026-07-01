"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { generateRoiAdvicePdf } from "@/lib/pdf/roiAdvicePdf";

export default function AdminROIPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadROIRecords();
  }, []);

  async function loadROIRecords() {
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

    const { data, error } = await supabase
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
          maturity_date
        )
      `)
      .order("created_at", { ascending: false });

    if (!error) setRecords(data || []);

    const { data: platform } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    setSettings(platform);

    setLoading(false);
  }

  function getGrossROI(record: any) {
    return Number(record.gross_roi_amount ?? record.roi_amount ?? 0);
  }

  function getDeductionAmount(record: any) {
    return Number(record.deduction_amount || 0);
  }

  function getNetROI(record: any) {
    return Number(record.net_roi_amount ?? record.roi_amount ?? 0);
  }

  function getNetTotalPayable(record: any) {
    return Number(record.net_total_payable ?? record.total_payable ?? 0);
  }

  async function creditROI(record: any) {
    setProcessingId(record.id);
    setMessage("");

    try {
      const netROI = getNetROI(record);
      const grossROI = getGrossROI(record);
      const deductionAmount = getDeductionAmount(record);
      const deductionLabel = record.deduction_label || "WHT";
      const deductionRate = Number(record.deduction_rate || 0);
      const investmentTitle =
        record.investment_opportunities?.title || "investment";

      const narration = record.deduction_applicable
        ? `Net ROI credited for ${investmentTitle}. Gross ROI: ₦${grossROI.toLocaleString()}; ${deductionLabel} (${deductionRate}%): ₦${deductionAmount.toLocaleString()}; Net ROI: ₦${netROI.toLocaleString()}`
        : `ROI credited for ${investmentTitle}. Net ROI: ₦${netROI.toLocaleString()}`;

      const { error: walletError } = await supabase
        .from("wallet_transactions")
        .insert({
          member_id: record.member_id,
          transaction_type: "roi_credit",
          amount: netROI,
          reference_type: "roi_records",
          reference_id: record.id,
          description: narration,
        });

      if (walletError) throw walletError;

      const { error: ledgerError } = await supabase.rpc(
        "create_member_ledger_entry",
        {
          p_member_id: record.member_id,
          p_ledger_type: "roi_credit",
          p_entry_direction: "credit",
          p_amount: netROI,
          p_reference_type: "roi_records",
          p_reference_id: record.id,
          p_narration: narration,
        }
      );

      if (ledgerError) throw ledgerError;

      const { error: updateError } = await supabase
        .from("roi_records")
        .update({
          status: "credited",
          credited_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (updateError) throw updateError;

      setMessage("Net ROI credited successfully to member wallet.");
      await loadROIRecords();
    } catch (error: any) {
      setMessage(error.message || "Unable to credit ROI.");
    } finally {
      setProcessingId(null);
    }
  }

  async function markAsPaid(recordId: string) {
    setProcessingId(recordId);
    setMessage("");

    try {
      const { error } = await supabase
        .from("roi_records")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", recordId);

      if (error) throw error;

      setMessage("ROI record marked as paid.");
      await loadROIRecords();
    } catch (error: any) {
      setMessage(error.message || "Unable to update ROI record.");
    } finally {
      setProcessingId(null);
    }
  }

  function downloadROIAdvice(record: any) {
    generateRoiAdvicePdf({
      roiRecord: record,
      settings: {
        clubName: settings?.club_name,
        clubShortName: settings?.club_short_name,
        supportEmail: settings?.support_email,
        supportPhone: settings?.support_phone,
      },
    });
  }

  const totalCapital = records.reduce(
    (sum, item) => sum + Number(item.capital_amount || 0),
    0
  );

  const totalGrossROI = records.reduce(
    (sum, item) => sum + getGrossROI(item),
    0
  );

  const totalDeductions = records.reduce(
    (sum, item) => sum + getDeductionAmount(item),
    0
  );

  const totalNetROI = records.reduce((sum, item) => sum + getNetROI(item), 0);

  const totalNetPayable = records.reduce(
    (sum, item) => sum + getNetTotalPayable(item),
    0
  );

  const totalCreditedROI = records
    .filter((item) => ["credited", "paid"].includes(item.status))
    .reduce((sum, item) => sum + getNetROI(item), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading ROI records...
      </main>
    );
  }

  return (
    <AppShell
      title="ROI Management"
      subtitle="Review, credit, and track net member return on investment records."
      role="admin"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Total Capital" value={`₦${totalCapital.toLocaleString()}`} />
        <StatCard title="Gross ROI" value={`₦${totalGrossROI.toLocaleString()}`} />
        <StatCard title="Total Deductions" value={`₦${totalDeductions.toLocaleString()}`} />
        <StatCard title="Net ROI" value={`₦${totalNetROI.toLocaleString()}`} />
        <StatCard title="Net Payable" value={`₦${totalNetPayable.toLocaleString()}`} />
        <StatCard title="Credited ROI" value={`₦${totalCreditedROI.toLocaleString()}`} />
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Membership No.</th>
                <th className="px-5 py-4">Investment</th>
                <th className="px-5 py-4">Capital</th>
                <th className="px-5 py-4">ROI %</th>
                <th className="px-5 py-4">Gross ROI</th>
                <th className="px-5 py-4">Deduction</th>
                <th className="px-5 py-4">Net ROI</th>
                <th className="px-5 py-4">Net Payable</th>
                <th className="px-5 py-4">Maturity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-8 text-center text-slate-400">
                    No ROI records found.
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const grossROI = getGrossROI(record);
                  const deductionAmount = getDeductionAmount(record);
                  const netROI = getNetROI(record);
                  const netTotalPayable = getNetTotalPayable(record);

                  return (
                    <tr key={record.id} className="border-t border-white/10">
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {record.members?.full_name || "N/A"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {record.members?.email || "No email"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {record.members?.phone || "No phone"}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {record.members?.membership_number || "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {record.investment_opportunities?.title || "Investment"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {record.investment_opportunities?.investment_type || "General Investment"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        ₦{Number(record.capital_amount || 0).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">{record.roi_percent}%</td>
                      <td className="px-5 py-4">₦{grossROI.toLocaleString()}</td>

                      <td className="px-5 py-4">
                        {record.deduction_applicable ? (
                          <>
                            <div>₦{deductionAmount.toLocaleString()}</div>
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
                        ₦{netROI.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        ₦{netTotalPayable.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {record.investment_opportunities?.maturity_date
                          ? new Date(record.investment_opportunities.maturity_date).toLocaleDateString()
                          : "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                          {record.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {record.status === "pending" ? (
                          <button
                            onClick={() => creditROI(record)}
                            disabled={processingId === record.id}
                            className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {processingId === record.id ? "Crediting..." : "Credit Net ROI"}
                          </button>
                        ) : record.status === "credited" ? (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => markAsPaid(record.id)}
                              disabled={processingId === record.id}
                              className="rounded-xl border border-white/10 px-4 py-2 font-semibold hover:bg-white/10 disabled:opacity-60"
                            >
                              {processingId === record.id ? "Updating..." : "Mark Paid"}
                            </button>

                            <button
                              onClick={() => downloadROIAdvice(record)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              ROI Advice PDF
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="text-slate-500">Completed</span>

                            <button
                              onClick={() => downloadROIAdvice(record)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              ROI Advice PDF
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
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
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}