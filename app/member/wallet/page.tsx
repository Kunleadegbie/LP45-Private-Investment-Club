"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function MemberWalletPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: memberData } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!memberData) {
      router.push("/login");
      return;
    }

    setMember(memberData);

    const { data: balanceData } = await supabase
      .from("member_wallet_balances")
      .select("wallet_balance")
      .eq("member_id", memberData.id)
      .single();

    setWalletBalance(Number(balanceData?.wallet_balance || 0));

    const { data: txData } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("member_id", memberData.id)
      .order("created_at", { ascending: false });

    setTransactions(txData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading wallet...
      </main>
    );
  }

  return (
    <AppShell
      title="My Wallet"
      subtitle="Track your available balance and all wallet movements."
      role="member"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          title="Membership Number"
          value={member?.membership_number || "N/A"}
        />

        <StatCard
          title="Available Balance"
          value={`₦${walletBalance.toLocaleString()}`}
        />

        <StatCard
          title="Total Transactions"
          value={transactions.length.toString()}
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 p-6">
          <h2 className="text-xl font-semibold">Wallet Transactions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Credit</th>
                <th className="px-5 py-4">Debit</th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No wallet transaction yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isCredit = [
                    "deposit_credit",
                    "roi_credit",
                    "refund_credit",
                  ].includes(tx.transaction_type);

                  return (
                    <tr key={tx.id} className="border-t border-white/10">
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 capitalize">
                        {tx.transaction_type?.replaceAll("_", " ")}
                      </td>

                      <td className="px-5 py-4">
                        {tx.description || "Wallet transaction"}
                      </td>

                      <td className="px-5 py-4 text-emerald-400">
                        {isCredit
                          ? `₦${Number(tx.amount || 0).toLocaleString()}`
                          : "-"}
                      </td>

                      <td className="px-5 py-4 text-red-300">
                        {!isCredit
                          ? `₦${Number(tx.amount || 0).toLocaleString()}`
                          : "-"}
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
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}