"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [members, setMembers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [roiRecords, setRoiRecords] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
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
        opportunitiesRes,
        ledgerRes,
      ] = await Promise.all([
        supabase.from("members").select("*").order("created_at", { ascending: false }),

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
              maturity_date,
              status
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
          .from("investment_opportunities")
          .select("*")
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
      if (opportunitiesRes.error) throw opportunitiesRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      const memberMap = new Map(
        (membersRes.data || []).map((member: any) => [member.id, member])
      );

      const enrichedWallets = (walletsRes.data || []).map((wallet: any) => ({
        ...wallet,
        members: memberMap.get(wallet.member_id) || null,
      }));

      setMembers(membersRes.data || []);
      setDeposits(depositsRes.data || []);
      setWallets(enrichedWallets);
      setInvestments(investmentsRes.data || []);
      setRoiRecords(roiRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);
      setOpportunities(opportunitiesRes.data || []);
      setLedger(ledgerRes.data || []);
    } catch (error: any) {
      setMessage(error.message || "Unable to load executive dashboard.");
    } finally {
      setLoading(false);
    }
  }

  function money(value: any) {
    return `₦${Number(value || 0).toLocaleString()}`;
  }

  function date(value: any) {
    return value ? new Date(value).toLocaleDateString() : "N/A";
  }

  const dashboard = useMemo(() => {
    const approvedDeposits = deposits.filter((item) => item.status === "approved");
    const pendingDeposits = deposits.filter((item) => item.status === "pending");

    const totalDeposits = approvedDeposits.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const walletBalance = wallets.reduce(
      (sum, item) => sum + Number(item.wallet_balance || 0),
      0
    );

    const capitalInvested = investments.reduce(
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

    const pendingROI = roiRecords
      .filter((item) => item.status === "pending")
      .reduce(
        (sum, item) => sum + Number(item.net_roi_amount ?? item.roi_amount ?? 0),
        0
      );

    const creditedROI = roiRecords
      .filter((item) => ["credited", "paid"].includes(item.status))
      .reduce(
        (sum, item) => sum + Number(item.net_roi_amount ?? item.roi_amount ?? 0),
        0
      );

    const pendingWithdrawals = withdrawals
      .filter((item) => ["pending", "approved"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const paidWithdrawals = withdrawals
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const aum = walletBalance + capitalInvested;

    const availableCash =
      walletBalance - pendingWithdrawals - pendingROI > 0
        ? walletBalance - pendingWithdrawals - pendingROI
        : 0;

    const liquidityRatio =
      walletBalance > 0
        ? Math.min(100, Math.round((availableCash / walletBalance) * 100))
        : 0;

    const activeInvestments = investments.filter((item) =>
      ["active", "matured"].includes(item.status)
    );

    const matureSoon = investments.filter((item) => {
      const maturityDate = item.investment_opportunities?.maturity_date;
      if (!maturityDate) return false;

      const today = new Date();
      const maturity = new Date(maturityDate);
      const days = Math.ceil(
        (maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return days >= 0 && days <= 30;
    });

    const healthScore = Math.round(
      Math.min(
        100,
        (liquidityRatio * 0.35) +
          (members.length > 0 ? 20 : 0) +
          (capitalInvested > 0 ? 20 : 0) +
          (pendingWithdrawals === 0 ? 15 : 8) +
          (pendingDeposits.length === 0 ? 10 : 5)
      )
    );

    return {
      aum,
      walletBalance,
      capitalInvested,
      totalDeposits,
      grossROI,
      deductions,
      netROI,
      pendingROI,
      creditedROI,
      pendingWithdrawals,
      paidWithdrawals,
      availableCash,
      liquidityRatio,
      healthScore,
      totalMembers: members.length,
      approvedMembers: members.filter((item) => item.status === "approved").length,
      pendingMembers: members.filter((item) => item.status === "pending").length,
      activeInvestments: activeInvestments.length,
      opportunities: opportunities.length,
      openOpportunities: opportunities.filter((item) => item.status === "open").length,
      certificates: investments.filter((item) => item.certificate_number).length,
      pendingDeposits: pendingDeposits.length,
      pendingWithdrawalsCount: withdrawals.filter((item) =>
        ["pending", "approved"].includes(item.status)
      ).length,
      pendingROIRecords: roiRecords.filter((item) => item.status === "pending").length,
      matureSoon,
    };
  }, [members, deposits, wallets, investments, roiRecords, withdrawals, opportunities]);

  const topInvestors = useMemo(() => {
    const map = new Map();

    investments.forEach((item) => {
      const key = item.member_id;
      const existing = map.get(key) || {
        name: item.members?.full_name || "N/A",
        membership: item.members?.membership_number || item.membership_number || "N/A",
        total: 0,
        count: 0,
      };

      existing.total += Number(item.amount_invested || 0);
      existing.count += 1;
      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [investments]);

  const topWallets = useMemo(() => {
    return [...wallets]
      .sort(
        (a, b) => Number(b.wallet_balance || 0) - Number(a.wallet_balance || 0)
      )
      .slice(0, 5);
  }, [wallets]);

  const portfolioAllocation = useMemo(() => {
    const map = new Map();

    investments.forEach((item) => {
      const type =
        item.investment_opportunities?.investment_type || "General Investment";

      map.set(type, (map.get(type) || 0) + Number(item.amount_invested || 0));
    });

    return Array.from(map.entries())
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [investments]);

  const recentActivity = ledger.slice(0, 8);
  const pendingDeposits = deposits.filter((item) => item.status === "pending").slice(0, 5);
  const pendingWithdrawals = withdrawals
    .filter((item) => ["pending", "approved"].includes(item.status))
    .slice(0, 5);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading executive dashboard...
      </main>
    );
  }

  return (
    <AppShell
      title="LP45 Executive Dashboard"
      subtitle="AI-ready command center for assets, investments, ROI, tax, liquidity, and member activity."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 to-slate-900 p-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
            Executive Overview
          </p>
          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            LP45 Private Investment Club
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Real-time view of member funds, capital allocation, ROI liability,
            deductions, liquidity exposure, pending approvals, and AI-ready
            executive insights.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Refresh Dashboard
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <HeroMetric title="Assets Under Management" value={money(dashboard.aum)} note="Wallet + active invested capital" />
        <HeroMetric title="Capital Invested" value={money(dashboard.capitalInvested)} note={`${dashboard.activeInvestments} active investment records`} />
        <HeroMetric title="Wallet Balances" value={money(dashboard.walletBalance)} note="Total available member wallet value" />
        <HeroMetric title="Available Cash Position" value={money(dashboard.availableCash)} note="After pending withdrawals and ROI liability" />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Members" value={dashboard.totalMembers.toString()} />
        <StatCard title="Approved Members" value={dashboard.approvedMembers.toString()} />
        <StatCard title="Pending Members" value={dashboard.pendingMembers.toString()} />
        <StatCard title="Open Opportunities" value={dashboard.openOpportunities.toString()} />
        <StatCard title="Certificates" value={dashboard.certificates.toString()} />
        <StatCard title="Maturing Soon" value={dashboard.matureSoon.length.toString()} />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Gross ROI Liability" value={money(dashboard.grossROI)} />
        <StatCard title="Total Deductions" value={money(dashboard.deductions)} />
        <StatCard title="Net ROI Liability" value={money(dashboard.netROI)} />
        <StatCard title="ROI Pending Processing" value={money(dashboard.pendingROI)} />
        <StatCard title="ROI Credited/Paid" value={money(dashboard.creditedROI)} />
        <StatCard title="Pending Deposits" value={dashboard.pendingDeposits.toString()} />
        <StatCard title="Pending Withdrawals" value={money(dashboard.pendingWithdrawals)} />
        <StatCard title="Paid Withdrawals" value={money(dashboard.paidWithdrawals)} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Club Health Score</h2>
          <div className="mt-6 flex items-center gap-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-emerald-500/70 text-3xl font-black">
              {dashboard.healthScore}%
            </div>
            <div>
              <p className="font-semibold text-emerald-300">Operationally Healthy</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Score considers liquidity, pending obligations, members, invested
                capital, and approval backlog.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Liquidity Coverage</h2>
          <Progress
            label="Cash Coverage"
            value={dashboard.liquidityRatio}
            caption={`${money(dashboard.availableCash)} available after key obligations`}
          />
          <div className="mt-5 grid gap-3 text-sm">
            <InfoLine label="Wallet Balance" value={money(dashboard.walletBalance)} />
            <InfoLine label="Less Pending Withdrawals" value={money(dashboard.pendingWithdrawals)} />
            <InfoLine label="Less Pending ROI" value={money(dashboard.pendingROI)} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">AI Executive Commentary</h2>
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            <p className="font-semibold">AI-ready Insight Placeholder</p>
            <p className="mt-2">
              Future AI module will summarize liquidity pressure, member growth,
              portfolio concentration, ROI exposure, and pending operational
              actions automatically.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/reports")}
            className="mt-5 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Open Reports Center
          </button>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Portfolio Allocation">
          {portfolioAllocation.length === 0 ? (
            <EmptyText text="No investment allocation yet." />
          ) : (
            <div className="space-y-4">
              {portfolioAllocation.map((item) => {
                const percent =
                  dashboard.capitalInvested > 0
                    ? Math.round((Number(item.amount) / dashboard.capitalInvested) * 100)
                    : 0;

                return (
                  <Progress
                    key={item.type}
                    label={item.type}
                    value={percent}
                    caption={money(item.amount)}
                  />
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Top Investors">
          {topInvestors.length === 0 ? (
            <EmptyText text="No investor activity yet." />
          ) : (
            <div className="space-y-3">
              {topInvestors.map((item, index) => (
                <RankRow
                  key={`${item.membership}-${index}`}
                  rank={index + 1}
                  title={item.name}
                  subtitle={`${item.membership} • ${item.count} investment(s)`}
                  value={money(item.total)}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Largest Wallet Balances">
          {topWallets.length === 0 ? (
            <EmptyText text="No wallet balances found." />
          ) : (
            <div className="space-y-3">
              {topWallets.map((item, index) => (
                <RankRow
                  key={item.member_id}
                  rank={index + 1}
                  title={item.members?.full_name || "N/A"}
                  subtitle={item.members?.membership_number || "N/A"}
                  value={money(item.wallet_balance)}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Investments Maturing Soon">
          {dashboard.matureSoon.length === 0 ? (
            <EmptyText text="No investment maturing in the next 30 days." />
          ) : (
            <div className="space-y-3">
              {dashboard.matureSoon.slice(0, 5).map((item) => (
                <RankRow
                  key={item.id}
                  rank="•"
                  title={item.investment_opportunities?.title || "Investment"}
                  subtitle={`${item.members?.full_name || "Member"} • ${date(
                    item.investment_opportunities?.maturity_date
                  )}`}
                  value={money(item.amount_invested)}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <ActionPanel
          title="Pending Deposits"
          count={dashboard.pendingDeposits}
          description="Deposit receipts awaiting review and wallet credit."
          href="/admin/deposits"
        />

        <ActionPanel
          title="Pending Withdrawals"
          count={dashboard.pendingWithdrawalsCount}
          description="Withdrawal requests requiring approval or payment."
          href="/admin/withdrawals"
        />

        <ActionPanel
          title="ROI Awaiting Processing"
          count={dashboard.pendingROIRecords}
          description="Pending ROI records available for bulk processing."
          href="/admin/roi-processing"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent Ledger Activity">
          {recentActivity.length === 0 ? (
            <EmptyText text="No ledger activity found." />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <ActivityRow
                  key={item.id}
                  title={item.members?.full_name || "N/A"}
                  subtitle={`${item.ledger_type?.replaceAll("_", " ")} • ${
                    item.narration || "Ledger entry"
                  }`}
                  amount={money(item.amount)}
                  date={date(item.created_at)}
                  direction={item.entry_direction}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Quick Actions">
          <div className="grid gap-4 md:grid-cols-2">
            <QuickLink title="Manage Members" href="/admin/members" />
            <QuickLink title="Approve Deposits" href="/admin/deposits" />
            <QuickLink title="Create Opportunity" href="/admin/opportunities" />
            <QuickLink title="ROI Processing" href="/admin/roi-processing" />
            <QuickLink title="Certificates" href="/admin/certificates" />
            <QuickLink title="Reports" href="/admin/reports" />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function HeroMetric({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 shadow-xl">
      <p className="text-sm text-emerald-200">{title}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-2 text-xs leading-5 text-emerald-100/80">{note}</p>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Progress({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function RankRow({
  rank,
  title,
  subtitle,
  value,
}: {
  rank: number | string;
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
          {rank}
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function ActivityRow({
  title,
  subtitle,
  amount,
  date,
  direction,
}: {
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  direction: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          <p className="mt-2 text-xs text-slate-500">{date}</p>
        </div>

        <p
          className={`font-bold ${
            direction === "credit" ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {direction === "credit" ? "+" : "-"}
          {amount}
        </p>
      </div>
    </div>
  );
}

function ActionPanel({
  title,
  count,
  description,
  href,
}: {
  title: string;
  count: number;
  description: string;
  href: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
    >
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-4xl font-black">{count}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
      <p className="mt-5 text-sm font-semibold text-emerald-400">Open →</p>
    </button>
  );
}

function QuickLink({ title, href }: { title: string; href: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-left text-sm font-semibold hover:bg-white/10"
    >
      {title} →
    </button>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-slate-400">{text}</p>;
}