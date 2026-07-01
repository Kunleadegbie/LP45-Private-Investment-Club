"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
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

    const { data } = await supabase
      .from("members")
      .select(`
        *,
        member_bank_details (
          bank_name,
          account_name,
          account_number
        ),
        next_of_kin (
          full_name,
          relationship,
          phone,
          email
        )
      `)
      .order("created_at", { ascending: false });

    setMembers(data || []);
    setLoading(false);
  }

  async function updateMemberStatus(memberId: string, status: string) {
    await supabase.from("members").update({ status }).eq("id", memberId);
    await loadMembers();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading members...
      </main>
    );
  }

  return (
    <AppShell
      title="Members"
      subtitle="View all registered LP45 Private Investment Club members."
      role="admin"
    >
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Membership No.</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Bank Details</th>
                <th className="px-5 py-4">Next of Kin</th>
                <th className="px-5 py-4">Preference</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const bank = member.member_bank_details?.[0];
                  const kin = member.next_of_kin?.[0];

                  return (
                    <tr key={member.id} className="border-t border-white/10">
                      <td className="px-5 py-4">
                        <div className="font-semibold">{member.full_name}</div>
                        <div className="text-xs text-slate-400">{member.email}</div>
                        <div className="text-xs text-slate-500">
                          {member.address || "No address"}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {member.membership_number}
                      </td>

                      <td className="px-5 py-4">{member.phone || "N/A"}</td>

                      <td className="px-5 py-4">
                        {bank ? (
                          <>
                            <div>{bank.bank_name}</div>
                            <div className="text-xs text-slate-400">
                              {bank.account_name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {bank.account_number}
                            </div>
                          </>
                        ) : (
                          "N/A"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {kin ? (
                          <>
                            <div>{kin.full_name}</div>
                            <div className="text-xs text-slate-400">
                              {kin.relationship}
                            </div>
                            <div className="text-xs text-slate-400">
                              {kin.phone}
                            </div>
                          </>
                        ) : (
                          "N/A"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {member.investment_preferences || "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                          {member.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={member.status}
                          onChange={(e) =>
                            updateMemberStatus(member.id, e.target.value)
                          }
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="suspended">Suspended</option>
                          <option value="rejected">Rejected</option>
                        </select>
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