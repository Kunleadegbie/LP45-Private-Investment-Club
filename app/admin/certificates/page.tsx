"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminCertificatesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    loadCertificates();
  }, []);

  async function loadCertificates() {
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
          maturity_date
        )
      `)
      .not("certificate_number", "is", null)
      .order("invested_at", { ascending: false });

    if (!error) {
      setCertificates(data || []);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading certificates...
      </main>
    );
  }

  return (
    <AppShell
      title="Investment Certificates"
      subtitle="View all member investment certificates issued by LP45 Private Investment Club."
      role="admin"
    >
      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <StatCard
          title="Total Certificates"
          value={certificates.length.toString()}
        />

        <StatCard
          title="Total Certified Capital"
          value={`₦${certificates
            .reduce((sum, item) => sum + Number(item.amount_invested || 0), 0)
            .toLocaleString()}`}
        />

        <StatCard
          title="Expected Returns"
          value={`₦${certificates
            .reduce(
              (sum, item) => sum + Number(item.expected_total_return || 0),
              0
            )
            .toLocaleString()}`}
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Membership No.</th>
                <th className="px-5 py-4">Investment</th>
                <th className="px-5 py-4">Capital</th>
                <th className="px-5 py-4">ROI</th>
                <th className="px-5 py-4">Expected Return</th>
                <th className="px-5 py-4">Certificate No.</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {certificates.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No investment certificate found.
                  </td>
                </tr>
              ) : (
                certificates.map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {item.members?.full_name || "N/A"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.members?.email || "No email"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.members?.phone || "No phone"}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {item.members?.membership_number || item.membership_number || "N/A"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {item.investment_opportunities?.title || "Investment"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.investment_opportunities?.investment_type ||
                          "General Investment"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      ₦{Number(item.amount_invested || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      {item.expected_roi_percent}%
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      ₦
                      {Number(
                        item.expected_total_return || 0
                      ).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {item.certificate_number || "N/A"}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {new Date(item.invested_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() =>
                          router.push(`/admin/certificates/${item.id}`)
                        }
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                      >
                        View Certificate
                      </button>
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