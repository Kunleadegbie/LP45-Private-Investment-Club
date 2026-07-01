"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function MemberLedgerPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    loadLedger();
  }, []);

  async function loadLedger() {
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

    const { data } = await supabase
      .from("member_ledger")
      .select("*")
      .eq("member_id", memberData.id)
      .order("created_at", { ascending: false });

    setLedger(data || []);
    setLoading(false);
  }

  const totalCredits = ledger
    .filter((item) => item.entry_direction === "credit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalDebits = ledger
    .filter((item) => item.entry_direction === "debit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const currentBalance = ledger.length > 0 ? Number(ledger[0].closing_balance || 0) : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading ledger...
      </main>
    );
  }

  return (
    <AppShell
      title="Investment Ledger"
      subtitle={`Membership No: ${member?.membership_number || "N/A"}`}
      role="member"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Total Credits" value={`₦${totalCredits.toLocaleString()}`} />
        <StatCard title="Total Debits" value={`₦${totalDebits.toLocaleString()}`} />
        <StatCard title="Current Balance" value={`₦${currentBalance.toLocaleString()}`} />
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 p-6">
          <h2 className="text-xl font-semibold">Ledger Entries</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Type</th>
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
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No ledger entry yet.
                  </td>
                </tr>
              ) : (
                ledger.map((entry) => {
                  const isCredit = entry.entry_direction === "credit";

                  return (
                    <tr key={entry.id} className="border-t border-white/10">
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 capitalize">
                        {entry.ledger_type?.replaceAll("_", " ")}
                      </td>

                      <td className="px-5 py-4">
                        {entry.narration || "Ledger entry"}
                      </td>

                      <td className="px-5 py-4">
                        ₦{Number(entry.opening_balance || 0).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-emerald-400">
                        {isCredit
                          ? `₦${Number(entry.amount || 0).toLocaleString()}`
                          : "-"}
                      </td>

                      <td className="px-5 py-4 text-red-300">
                        {!isCredit
                          ? `₦${Number(entry.amount || 0).toLocaleString()}`
                          : "-"}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        ₦{Number(entry.closing_balance || 0).toLocaleString()}
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