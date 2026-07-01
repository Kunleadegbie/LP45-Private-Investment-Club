"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function AdminWithdrawalsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function loadWithdrawals() {
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
      .from("withdrawals")
      .select(`
        *,
        members (
          full_name,
          email,
          phone,
          membership_number
        )
      `)
      .order("created_at", { ascending: false });

    if (!error) setWithdrawals(data || []);
    setLoading(false);
  }

  async function approveWithdrawal(id: string) {
    setProcessingId(id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setMessage("Withdrawal approved successfully.");
      await loadWithdrawals();
    } catch (error: any) {
      setMessage(error.message || "Unable to approve withdrawal.");
    } finally {
      setProcessingId(null);
    }
  }

  async function payWithdrawal(id: string) {
    setProcessingId(id);
    setMessage("");

    try {
      const { error } = await supabase.rpc("pay_member_withdrawal", {
        p_withdrawal_id: id,
      });

      if (error) throw error;

      setMessage("Withdrawal paid and member wallet debited successfully.");
      await loadWithdrawals();
    } catch (error: any) {
      setMessage(error.message || "Unable to pay withdrawal.");
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectWithdrawal(id: string) {
    setProcessingId(id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status: "rejected",
          admin_note: "Withdrawal request rejected by admin.",
        })
        .eq("id", id);

      if (error) throw error;

      setMessage("Withdrawal rejected.");
      await loadWithdrawals();
    } catch (error: any) {
      setMessage(error.message || "Unable to reject withdrawal.");
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading withdrawals...
      </main>
    );
  }

  return (
    <AppShell
      title="Withdrawal Approvals"
      subtitle="Review, approve, pay, or reject member withdrawal requests."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Membership No.</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Bank Details</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No withdrawal request found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((item) => (
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
                      {item.members?.membership_number || "N/A"}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      ₦{Number(item.amount || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {item.withdrawal_type?.replaceAll("_", " ")}
                    </td>

                    <td className="px-5 py-4">
                      <div>{item.bank_name}</div>
                      <div className="text-xs text-slate-400">
                        {item.account_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.account_number}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                        {item.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.status === "pending" && (
                          <>
                            <button
                              onClick={() => approveWithdrawal(item.id)}
                              disabled={processingId === item.id}
                              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-60"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => payWithdrawal(item.id)}
                              disabled={processingId === item.id}
                              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                            >
                              Pay
                            </button>

                            <button
                              onClick={() => rejectWithdrawal(item.id)}
                              disabled={processingId === item.id}
                              className="rounded-xl bg-red-500/80 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {item.status === "approved" && (
                          <button
                            onClick={() => payWithdrawal(item.id)}
                            disabled={processingId === item.id}
                            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                          >
                            Pay & Debit Wallet
                          </button>
                        )}

                        {["paid", "rejected"].includes(item.status) && (
                          <span className="text-xs text-slate-500">
                            Completed
                          </span>
                        )}
                      </div>
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