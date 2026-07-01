"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminReportsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [roiRecords, setRoiRecords] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
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

      const [
        membersRes,
        depositsRes,
        walletsRes,
        investmentsRes,
        roiRes,
        withdrawalsRes,
        ledgerRes,
      ] = await Promise.all([
        supabase.from("members").select("*").order("created_at", {
          ascending: false,
        }),

        supabase
          .from("member_deposits")
          .select(`
            *,
            members (
              full_name,
              email,
              membership_number
            )
          `)
          .order("created_at", { ascending: false }),

        supabase.from("member_wallet_balances").select("*"),

        supabase
          .from("member_investments")
          .select(`
            *,
            members (
              full_name,
              email,
              membership_number
            ),
            investment_opportunities (
              title,
              investment_type,
              maturity_date
            )
          `)
          .order("invested_at", { ascending: false }),

        supabase
          .from("roi_records")
          .select(`
            *,
            members (
              full_name,
              email,
              membership_number
            ),
            investment_opportunities (
              title,
              investment_type,
              maturity_date
            )
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("withdrawals")
          .select(`
            *,
            members (
              full_name,
              email,
              membership_number
            )
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("member_ledger")
          .select(`
            *,
            members (
              full_name,
              email,
              membership_number
            )
          `)
          .order("created_at", { ascending: false }),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (depositsRes.error) throw depositsRes.error;
      if (walletsRes.error) throw walletsRes.error;
      if (investmentsRes.error) throw investmentsRes.error;
      if (roiRes.error) throw roiRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      setMembers(membersRes.data || []);
      setDeposits(depositsRes.data || []);

      const memberMap = new Map(
        (membersRes.data || []).map((member: any) => [member.id, member])
      );

      const enrichedWallets = (walletsRes.data || []).map((wallet: any) => ({
        ...wallet,
        members: memberMap.get(wallet.member_id) || null,
      }));

      setWallets(enrichedWallets);
      setInvestments(investmentsRes.data || []);
      setRoiRecords(roiRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);
      setLedger(ledgerRes.data || []);
    } catch (error: any) {
      setMessage(error.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }

  function money(value: any) {
    return `₦${Number(value || 0).toLocaleString()}`;
  }

  function rawMoney(value: any) {
    return Number(value || 0);
  }

  function date(value: any) {
    return value ? new Date(value).toLocaleDateString() : "N/A";
  }

  function csvEscape(value: any) {
    const safeValue = value === null || value === undefined ? "" : String(value);
    return `"${safeValue.replaceAll('"', '""')}"`;
  }

  function exportCSV(filename: string, headers: string[], rows: any[][]) {
    const csvContent = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportMembers() {
    exportCSV(
      "lp45-members-report",
      [
        "Full Name",
        "Email",
        "Membership Number",
        "Phone",
        "Status",
        "Created At",
      ],
      members.map((item) => [
        item.full_name || "",
        item.email || "",
        item.membership_number || "",
        item.phone || "",
        item.status || "",
        date(item.created_at),
      ])
    );
  }

  function exportDeposits() {
    exportCSV(
      "lp45-deposit-report",
      ["Member", "Membership Number", "Amount", "Reference", "Status", "Date"],
      deposits.map((item) => [
        item.members?.full_name || "",
        item.members?.membership_number || "",
        rawMoney(item.amount),
        item.payment_reference || "",
        item.status || "",
        date(item.created_at),
      ])
    );
  }

  function exportInvestments() {
    exportCSV(
      "lp45-investment-report",
      [
        "Member",
        "Membership Number",
        "Investment",
        "Investment Type",
        "Capital",
        "ROI %",
        "Gross ROI",
        "Deduction Label",
        "Deduction Rate",
        "Deduction Amount",
        "Net ROI",
        "Net Total Return",
        "Certificate Number",
        "Status",
        "Date",
      ],
      investments.map((item) => [
        item.members?.full_name || "",
        item.members?.membership_number || item.membership_number || "",
        item.investment_opportunities?.title || "",
        item.investment_opportunities?.investment_type || "",
        rawMoney(item.amount_invested),
        item.expected_roi_percent || 0,
        rawMoney(item.gross_roi_amount ?? item.expected_roi_amount),
        item.deduction_applicable ? item.deduction_label || "WHT" : "None",
        item.deduction_applicable ? Number(item.deduction_rate || 0) : 0,
        rawMoney(item.deduction_amount),
        rawMoney(item.net_roi_amount ?? item.expected_roi_amount),
        rawMoney(item.net_total_return ?? item.expected_total_return),
        item.certificate_number || "",
        item.status || "",
        date(item.invested_at),
      ])
    );
  }

  function exportROI() {
    exportCSV(
      "lp45-roi-deduction-report",
      [
        "Member",
        "Membership Number",
        "Investment",
        "Capital",
        "Gross ROI",
        "Deduction Label",
        "Deduction Rate",
        "Deduction Amount",
        "Net ROI",
        "Net Payable",
        "Status",
      ],
      roiRecords.map((item) => [
        item.members?.full_name || "",
        item.members?.membership_number || "",
        item.investment_opportunities?.title || "",
        rawMoney(item.capital_amount),
        rawMoney(item.gross_roi_amount ?? item.roi_amount),
        item.deduction_applicable ? item.deduction_label || "WHT" : "None",
        item.deduction_applicable ? Number(item.deduction_rate || 0) : 0,
        rawMoney(item.deduction_amount),
        rawMoney(item.net_roi_amount ?? item.roi_amount),
        rawMoney(item.net_total_payable ?? item.total_payable),
        item.status || "",
      ])
    );
  }

  function exportWallets() {
    exportCSV(
      "lp45-wallet-report",
      ["Member", "Membership Number", "Wallet Balance", "Last Updated"],
      wallets.map((item) => [
        item.members?.full_name || "",
        item.members?.membership_number || "",
        rawMoney(item.wallet_balance),
        date(item.updated_at),
      ])
    );
  }

  function exportWithdrawals() {
    exportCSV(
      "lp45-withdrawal-report",
      [
        "Member",
        "Membership Number",
        "Amount",
        "Bank",
        "Account Name",
        "Account Number",
        "Status",
        "Date",
      ],
      withdrawals.map((item) => [
        item.members?.full_name || "",
        item.members?.membership_number || "",
        rawMoney(item.amount),
        item.bank_name || "",
        item.account_name || "",
        item.account_number || "",
        item.status || "",
        date(item.created_at),
      ])
    );
  }

  function exportLedger() {
    exportCSV(
      "lp45-ledger-report",
      [
        "Member",
        "Membership Number",
        "Type",
        "Narration",
        "Direction",
        "Amount",
        "Opening Balance",
        "Closing Balance",
        "Date",
      ],
      ledger.map((item) => [
        item.members?.full_name || "",
        item.members?.membership_number || "",
        item.ledger_type || "",
        item.narration || "",
        item.entry_direction || "",
        rawMoney(item.amount),
        rawMoney(item.opening_balance),
        rawMoney(item.closing_balance),
        date(item.created_at),
      ])
    );
  }

  const summary = useMemo(() => {
    const approvedDeposits = deposits.filter((item) => item.status === "approved");

    const totalDeposits = approvedDeposits.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const totalWalletBalance = wallets.reduce(
      (sum, item) => sum + Number(item.wallet_balance || 0),
      0
    );

    const totalCapitalInvested = investments.reduce(
      (sum, item) => sum + Number(item.amount_invested || 0),
      0
    );

    const grossROI = investments.reduce(
      (sum, item) =>
        sum + Number(item.gross_roi_amount ?? item.expected_roi_amount ?? 0),
      0
    );

    const deductions = investments.reduce(
      (sum, item) => sum + Number(item.deduction_amount || 0),
      0
    );

    const netROI = investments.reduce(
      (sum, item) =>
        sum + Number(item.net_roi_amount ?? item.expected_roi_amount ?? 0),
      0
    );

    const netTotalReturn = investments.reduce(
      (sum, item) =>
        sum + Number(item.net_total_return ?? item.expected_total_return ?? 0),
      0
    );

    const pendingWithdrawals = withdrawals
      .filter((item) => ["pending", "approved"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      totalMembers: members.length,
      approvedMembers: members.filter((item) => item.status === "approved").length,
      pendingMembers: members.filter((item) => item.status === "pending").length,
      totalDeposits,
      totalWalletBalance,
      totalCapitalInvested,
      grossROI,
      deductions,
      netROI,
      netTotalReturn,
      pendingWithdrawals,
      certificates: investments.filter((item) => item.certificate_number).length,
    };
  }, [members, deposits, wallets, investments, withdrawals]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading reports...
      </main>
    );
  }

  return (
    <AppShell
      title="Reports Center"
      subtitle="Financial summaries, member reports, investment reports, ROI reports, deductions, withdrawals, and ledger activity."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="mb-8 flex flex-wrap justify-end gap-3">
        <button
          onClick={exportMembers}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
        >
          Export Members
        </button>

        <button
          onClick={exportInvestments}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
        >
          Export Investments
        </button>

        <button
          onClick={exportROI}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
        >
          Export ROI/Tax
        </button>

        <button
          onClick={loadReports}
          className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Refresh Reports
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Members" value={summary.totalMembers.toString()} />
        <StatCard title="Approved Members" value={summary.approvedMembers.toString()} />
        <StatCard title="Pending Members" value={summary.pendingMembers.toString()} />
        <StatCard title="Certificates Issued" value={summary.certificates.toString()} />
        <StatCard title="Approved Deposits" value={money(summary.totalDeposits)} />
        <StatCard title="Wallet Balance" value={money(summary.totalWalletBalance)} />
        <StatCard title="Capital Invested" value={money(summary.totalCapitalInvested)} />
        <StatCard title="Net Total Return" value={money(summary.netTotalReturn)} />
        <StatCard title="Gross ROI" value={money(summary.grossROI)} />
        <StatCard title="Total Deductions" value={money(summary.deductions)} />
        <StatCard title="Net ROI" value={money(summary.netROI)} />
        <StatCard title="Pending Withdrawals" value={money(summary.pendingWithdrawals)} />
      </div>

      <ReportSection title="Member Report" onExport={exportMembers}>
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Membership No.</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Created</th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <EmptyRow colSpan={6} label="No member record found." />
            ) : (
              members.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-5 py-4 font-semibold">
                    {item.full_name || "N/A"}
                  </td>
                  <td className="px-5 py-4">{item.membership_number || "N/A"}</td>
                  <td className="px-5 py-4">{item.email || "N/A"}</td>
                  <td className="px-5 py-4">{item.phone || "N/A"}</td>
                  <td className="px-5 py-4 capitalize">{item.status || "N/A"}</td>
                  <td className="px-5 py-4 text-slate-400">{date(item.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Investment Report" onExport={exportInvestments}>
        <table className="w-full min-w-[1400px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Investment</th>
              <th className="px-5 py-4">Capital</th>
              <th className="px-5 py-4">ROI %</th>
              <th className="px-5 py-4">Gross ROI</th>
              <th className="px-5 py-4">Deduction</th>
              <th className="px-5 py-4">Net ROI</th>
              <th className="px-5 py-4">Net Total</th>
              <th className="px-5 py-4">Certificate</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>

          <tbody>
            {investments.length === 0 ? (
              <EmptyRow colSpan={10} label="No investment record found." />
            ) : (
              investments.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.members?.full_name || "N/A"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.members?.membership_number || item.membership_number || "N/A"}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.investment_opportunities?.title || "Investment"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.investment_opportunities?.investment_type || "General"}
                    </div>
                  </td>

                  <td className="px-5 py-4">{money(item.amount_invested)}</td>
                  <td className="px-5 py-4">{item.expected_roi_percent}%</td>
                  <td className="px-5 py-4">
                    {money(item.gross_roi_amount ?? item.expected_roi_amount)}
                  </td>
                  <td className="px-5 py-4">
                    {item.deduction_applicable ? (
                      <>
                        <div>{money(item.deduction_amount)}</div>
                        <div className="text-xs text-slate-400">
                          {item.deduction_label || "WHT"} @{" "}
                          {Number(item.deduction_rate || 0)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-emerald-300">
                    {money(item.net_roi_amount ?? item.expected_roi_amount)}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {money(item.net_total_return ?? item.expected_total_return)}
                  </td>
                  <td className="px-5 py-4">{item.certificate_number || "N/A"}</td>
                  <td className="px-5 py-4 text-slate-400">{date(item.invested_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Deposit Report" onExport={exportDeposits}>
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Reference</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>

          <tbody>
            {deposits.length === 0 ? (
              <EmptyRow colSpan={5} label="No deposit record found." />
            ) : (
              deposits.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.members?.full_name || "N/A"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.members?.membership_number || "N/A"}
                    </div>
                  </td>
                  <td className="px-5 py-4">{money(item.amount)}</td>
                  <td className="px-5 py-4">{item.payment_reference || "N/A"}</td>
                  <td className="px-5 py-4 capitalize">{item.status}</td>
                  <td className="px-5 py-4 text-slate-400">{date(item.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="ROI / Deduction Report" onExport={exportROI}>
        <table className="w-full min-w-[1300px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Investment</th>
              <th className="px-5 py-4">Capital</th>
              <th className="px-5 py-4">Gross ROI</th>
              <th className="px-5 py-4">Deduction</th>
              <th className="px-5 py-4">Net ROI</th>
              <th className="px-5 py-4">Net Payable</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {roiRecords.length === 0 ? (
              <EmptyRow colSpan={8} label="No ROI record found." />
            ) : (
              roiRecords.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.members?.full_name || "N/A"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.members?.membership_number || "N/A"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {item.investment_opportunities?.title || "Investment"}
                  </td>
                  <td className="px-5 py-4">{money(item.capital_amount)}</td>
                  <td className="px-5 py-4">
                    {money(item.gross_roi_amount ?? item.roi_amount)}
                  </td>
                  <td className="px-5 py-4">
                    {item.deduction_applicable ? (
                      <>
                        <div>{money(item.deduction_amount)}</div>
                        <div className="text-xs text-slate-400">
                          {item.deduction_label || "WHT"} @{" "}
                          {Number(item.deduction_rate || 0)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-emerald-300">
                    {money(item.net_roi_amount ?? item.roi_amount)}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {money(item.net_total_payable ?? item.total_payable)}
                  </td>
                  <td className="px-5 py-4 capitalize">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Wallet Report" onExport={exportWallets}>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Wallet Balance</th>
              <th className="px-5 py-4">Last Updated</th>
            </tr>
          </thead>

          <tbody>
            {wallets.length === 0 ? (
              <EmptyRow colSpan={3} label="No wallet record found." />
            ) : (
              wallets.map((item) => (
                <tr key={item.member_id} className="border-t border-white/10">
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.members?.full_name || "N/A"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.members?.membership_number || "N/A"}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {money(item.wallet_balance)}
                  </td>
                  <td className="px-5 py-4 text-slate-400">{date(item.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Withdrawal Report" onExport={exportWithdrawals}>
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Bank</th>
              <th className="px-5 py-4">Account</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>

          <tbody>
            {withdrawals.length === 0 ? (
              <EmptyRow colSpan={6} label="No withdrawal record found." />
            ) : (
              withdrawals.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.members?.full_name || "N/A"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.members?.membership_number || "N/A"}
                    </div>
                  </td>
                  <td className="px-5 py-4">{money(item.amount)}</td>
                  <td className="px-5 py-4">{item.bank_name || "N/A"}</td>
                  <td className="px-5 py-4">
                    <div>{item.account_name || "N/A"}</div>
                    <div className="text-xs text-slate-400">
                      {item.account_number || "N/A"}
                    </div>
                  </td>
                  <td className="px-5 py-4 capitalize">{item.status}</td>
                  <td className="px-5 py-4 text-slate-400">{date(item.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Recent Ledger Activity" onExport={exportLedger}>
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Narration</th>
              <th className="px-5 py-4">Credit/Debit</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Closing Balance</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>

          <tbody>
            {ledger.length === 0 ? (
              <EmptyRow colSpan={7} label="No ledger activity found." />
            ) : (
              ledger.slice(0, 25).map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.members?.full_name || "N/A"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.members?.membership_number || "N/A"}
                    </div>
                  </td>
                  <td className="px-5 py-4 capitalize">
                    {item.ledger_type?.replaceAll("_", " ")}
                  </td>
                  <td className="px-5 py-4">{item.narration || "Ledger entry"}</td>
                  <td className="px-5 py-4 capitalize">{item.entry_direction}</td>
                  <td className="px-5 py-4">{money(item.amount)}</td>
                  <td className="px-5 py-4 font-semibold">
                    {money(item.closing_balance)}
                  </td>
                  <td className="px-5 py-4 text-slate-400">{date(item.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>
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

function ReportSection({
  title,
  children,
  onExport,
}: {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
        <h2 className="text-xl font-semibold">{title}</h2>

        {onExport && (
          <button
            onClick={onExport}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-center text-slate-400">
        {label}
      </td>
    </tr>
  );
}
