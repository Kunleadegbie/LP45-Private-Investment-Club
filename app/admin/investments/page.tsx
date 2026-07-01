"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminInvestmentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<any[]>([]);
  const [totalCapital, setTotalCapital] = useState(0);
  const [totalExpectedRoi, setTotalExpectedRoi] = useState(0);

  useEffect(() => {
    loadInvestments();
  }, []);

  async function loadInvestments() {
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
      .from("member_investments")
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
      .order("invested_at", { ascending: false });

    if (!error) {
      setInvestments(data || []);

      setTotalCapital(
        (data || []).reduce(
          (sum, item) => sum + Number(item.amount_invested || 0),
          0
        )
      );

      setTotalExpectedRoi(
        (data || []).reduce(
          (sum, item) => sum + Number(item.expected_roi_amount || 0),
          0
        )
      );
    }

    setLoading(false);
  }

  async function updateInvestmentStatus(id: string, status: string) {
    await supabase.from("member_investments").update({ status }).eq("id", id);
    await loadInvestments();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading investments...
      </main>
    );
  }

  return (
    <AppShell
      title="All Member Investments"
      subtitle="View all investments made by LP45 members."
      role="admin"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Total Investment Records" value={investments.length.toString()} />
        <StatCard title="Total Capital Invested" value={`₦${totalCapital.toLocaleString()}`} />
        <StatCard title="Total Expected ROI" value={`₦${totalExpectedRoi.toLocaleString()}`} />
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Membership No.</th>
                <th className="px-5 py-4">Investment</th>
                <th className="px-5 py-4">Capital</th>
                <th className="px-5 py-4">ROI %</th>
                <th className="px-5 py-4">ROI Amount</th>
                <th className="px-5 py-4">Expected Return</th>
                <th className="px-5 py-4">Maturity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {investments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-slate-400">
                    No investments found.
                  </td>
                </tr>
              ) : (
                investments.map((investment) => (
                  <tr key={investment.id} className="border-t border-white/10">
                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {investment.members?.full_name || "N/A"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {investment.members?.email || "No email"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {investment.members?.phone || "No phone"}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {investment.membership_number ||
                        investment.members?.membership_number ||
                        "N/A"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {investment.investment_opportunities?.title || "Investment"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {investment.investment_opportunities?.investment_type ||
                          "General Investment"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      ₦{Number(investment.amount_invested || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      {investment.expected_roi_percent}%
                    </td>

                    <td className="px-5 py-4">
                      ₦{Number(investment.expected_roi_amount || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      ₦{Number(investment.expected_total_return || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {investment.investment_opportunities?.maturity_date
                        ? new Date(
                            investment.investment_opportunities.maturity_date
                          ).toLocaleDateString()
                        : "N/A"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                        {investment.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={investment.status}
                        onChange={(e) =>
                          updateInvestmentStatus(investment.id, e.target.value)
                        }
                        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="matured">Matured</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
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