"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function MemberDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [investments, setInvestments] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
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

      if (memberError) throw memberError;

      setMember(memberData);

      const { data: balanceData } = await supabase
        .from("member_wallet_balances")
        .select("wallet_balance")
        .eq("member_id", memberData.id)
        .single();

      setWalletBalance(Number(balanceData?.wallet_balance || 0));

      const { data: investmentData } = await supabase
        .from("member_investments")
        .select(`
          id,
          amount_invested,
          expected_roi_percent,
          expected_roi_amount,
          expected_total_return,
          status,
          invested_at,
          investment_opportunities (
            title,
            maturity_date
          )
        `)
        .eq("member_id", memberData.id)
        .order("invested_at", { ascending: false })
        .limit(5);

      setInvestments(investmentData || []);

      const { data: depositData } = await supabase
        .from("member_deposits")
        .select("*")
        .eq("member_id", memberData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setDeposits(depositData || []);
    } catch (error: any) {
      console.error("Member dashboard error:", error);
      alert(error.message || JSON.stringify(error) || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading dashboard...
      </main>
    );
  }

  return (
    <AppShell
      title="LP45 Member Dashboard"
      subtitle={`Welcome, ${member?.full_name || "Member"}`}
      role="member"
    >
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard title="Membership No." value={member?.membership_number || "N/A"} />
        <StatCard title="Wallet Balance" value={`₦${walletBalance.toLocaleString()}`} />
        <StatCard title="Member Status" value={member?.status || "N/A"} />
        <StatCard title="Total Investments" value={investments.length.toString()} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Recent Investments</h2>

          <div className="mt-5 space-y-4">
            {investments.length === 0 ? (
              <p className="text-sm text-slate-400">
                You have not made any investment yet.
              </p>
            ) : (
              investments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {item.investment_opportunities?.title || "Investment"}
                      </p>
                      <p className="text-sm text-slate-400">
                        ROI: {item.expected_roi_percent}%
                      </p>
                    </div>
                    <p className="font-semibold">
                      ₦{Number(item.amount_invested || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-3 text-sm text-slate-300">
                    Expected Return: ₦
                    {Number(item.expected_total_return || 0).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Recent Deposits</h2>

          <div className="mt-5 space-y-4">
            {deposits.length === 0 ? (
              <p className="text-sm text-slate-400">
                You have not submitted any deposit yet.
              </p>
            ) : (
              deposits.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        ₦{Number(item.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-400">
                        Reference: {item.payment_reference || "N/A"}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                      {item.status}
                    </span>
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

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-bold capitalize">{value}</p>
    </div>
  );
}