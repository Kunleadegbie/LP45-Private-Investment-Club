"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { generateStatementPdf } from "@/lib/pdf/statementPdf";

export default function MemberStatementPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [roiRecords, setRoiRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadStatement();
  }, []);

  async function loadStatement() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      router.push("/login");
      return;
    }

    setMember(memberData);

    let query = supabase
      .from("member_ledger")
      .select("*")
      .eq("member_id", memberData.id)
      .order("created_at", { ascending: true });

    if (fromDate) {
      query = query.gte("created_at", `${fromDate}T00:00:00`);
    }

    if (toDate) {
      query = query.lte("created_at", `${toDate}T23:59:59`);
    }

    const { data, error } = await query;

    if (!error) setLedger(data || []);

    const { data: roi } = await supabase
      .from("roi_records")
      .select(`
        *,
        investment_opportunities (
          title
        )
      `)
      .eq("member_id", memberData.id);

    setRoiRecords(roi || []);

    const { data: platform } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    setSettings(platform);

    setLoading(false);
  }

  function printStatement() {
    window.print();
  }

  function downloadStatementPdf() {
    if (!member) return;

    generateStatementPdf({
      member,
      ledger,
      roiRecords,
      fromDate,
      toDate,
      settings: {
        clubName: settings?.club_name,
        clubShortName: settings?.club_short_name,
        supportEmail: settings?.support_email,
        supportPhone: settings?.support_phone,
        statementFooterNote: settings?.statement_footer_note,
      },
    });
  }

  function isCredit(entry: any) {
    return entry.entry_direction === "credit";
  }

  function isDebit(entry: any) {
    return entry.entry_direction === "debit";
  }

  function formatMoney(value: any) {
    return `₦${Number(value || 0).toLocaleString()}`;
  }

  function readableType(type: string) {
    return type?.replaceAll("_", " ") || "ledger transaction";
  }

  function getTypeBadgeClass(entry: any) {
    if (entry.ledger_type === "roi_credit") {
      return "bg-emerald-500/15 text-emerald-300";
    }

    if (entry.ledger_type === "investment") {
      return "bg-blue-500/15 text-blue-300";
    }

    if (entry.ledger_type === "withdrawal") {
      return "bg-red-500/15 text-red-300";
    }

    if (entry.ledger_type === "deposit") {
      return "bg-cyan-500/15 text-cyan-300";
    }

    return "bg-white/10 text-slate-300";
  }

  const openingBalance =
    ledger.length > 0 ? Number(ledger[0].opening_balance || 0) : 0;

  const closingBalance =
    ledger.length > 0
      ? Number(ledger[ledger.length - 1].closing_balance || 0)
      : 0;

  const totalCredits = ledger
    .filter((item) => isCredit(item))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalDebits = ledger
    .filter((item) => isDebit(item))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalDeposits = ledger
    .filter((item) => item.ledger_type === "deposit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalInvestments = ledger
    .filter((item) => item.ledger_type === "investment")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalNetROI = ledger
    .filter((item) => item.ledger_type === "roi_credit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalWithdrawals = ledger
    .filter((item) => item.ledger_type === "withdrawal")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading statement...
      </main>
    );
  }

  return (
    <AppShell
      title="Member Statement"
      subtitle={`Membership No: ${member?.membership_number || "N/A"}`}
      role="member"
    >
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              From Date
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadStatement}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Apply Filter
          </button>

          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              setTimeout(loadStatement, 100);
            }}
            className="rounded-xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Reset
          </button>

          <button
            onClick={downloadStatementPdf}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Download PDF
          </button>

          <button
            onClick={printStatement}
            className="rounded-xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Print Statement
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 print:border-none print:bg-white print:text-black">
        <div className="border-b border-white/10 pb-6 print:border-gray-300">
          <h1 className="text-3xl font-bold">LP45 Private Investment Club</h1>
          <p className="mt-2 text-slate-400 print:text-gray-600">
            Member Statement of Account
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Info label="Member Name" value={member?.full_name || "N/A"} />
            <Info
              label="Membership Number"
              value={member?.membership_number || "N/A"}
            />
            <Info label="Email" value={member?.email || "N/A"} />
            <Info
              label="Statement Period"
              value={`${fromDate || "Start"} to ${toDate || "Today"}`}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-4">
          <SummaryCard title="Opening Balance" value={formatMoney(openingBalance)} />
          <SummaryCard title="Total Credits" value={formatMoney(totalCredits)} />
          <SummaryCard title="Total Debits" value={formatMoney(totalDebits)} />
          <SummaryCard title="Closing Balance" value={formatMoney(closingBalance)} />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-4">
          <SummaryCard title="Deposits" value={formatMoney(totalDeposits)} />
          <SummaryCard title="Investments" value={formatMoney(totalInvestments)} />
          <SummaryCard title="Net ROI Credited" value={formatMoney(totalNetROI)} />
          <SummaryCard title="Withdrawals" value={formatMoney(totalWithdrawals)} />
        </div>

        <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100 print:border-gray-300 print:bg-gray-100 print:text-gray-700">
          <p className="font-semibold">ROI and Tax/Deduction Note</p>
          <p className="mt-2 leading-6">
            Where WHT, VAT, or any other deduction applies to an investment,
            this statement reflects the <strong>net ROI credited</strong> to
            the member’s wallet. The transaction narration contains the gross
            ROI, deduction rate, deduction amount, and net ROI credited.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 print:border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-900 text-slate-300 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Transaction Type</th>
                  <th className="px-5 py-4">Narration</th>
                  <th className="px-5 py-4">Opening Balance</th>
                  <th className="px-5 py-4">Credit</th>
                  <th className="px-5 py-4">Debit</th>
                  <th className="px-5 py-4">Closing Balance</th>
                </tr>
              </thead>

              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-slate-400 print:text-gray-600"
                    >
                      No statement record found for this period.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry) => {
                    const credit = isCredit(entry);
                    const debit = isDebit(entry);

                    return (
                      <tr
                        key={entry.id}
                        className="border-t border-white/10 print:border-gray-300"
                      >
                        <td className="px-5 py-4 text-slate-400 print:text-gray-700">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>

                        <td className="px-5 py-4 capitalize">
                          <span
                            className={`rounded-full px-3 py-1 text-xs capitalize print:bg-gray-100 print:text-black ${getTypeBadgeClass(
                              entry
                            )}`}
                          >
                            {readableType(entry.ledger_type)}
                          </span>
                        </td>

                        <td className="px-5 py-4 leading-6">
                          {entry.narration || "Ledger transaction"}
                        </td>

                        <td className="px-5 py-4">
                          {formatMoney(entry.opening_balance)}
                        </td>

                        <td className="px-5 py-4 text-emerald-400 print:text-black">
                          {credit ? formatMoney(entry.amount) : "-"}
                        </td>

                        <td className="px-5 py-4 text-red-300 print:text-black">
                          {debit ? formatMoney(entry.amount) : "-"}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {formatMoney(entry.closing_balance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-sm text-slate-300 print:border-gray-300 print:bg-gray-100 print:text-gray-700">
          <p>
            {settings?.statement_footer_note ||
              "This statement is system-generated from the LP45 Private Investment Club ledger records."}
          </p>
          <p className="mt-2">Generated on: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 print:bg-gray-100">
      <p className="text-xs text-slate-500 print:text-gray-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 print:border-gray-300 print:bg-gray-100">
      <p className="text-sm text-slate-400 print:text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}