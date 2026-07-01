"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { requireAdminPermission } from "@/lib/adminGuard";
import AppShell from "@/components/AppShell";
import { generateDepositReceiptPdf } from "@/lib/pdf/depositReceiptPdf";

export default function AdminDepositsPage() {
  const router = useRouter();

  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadDeposits();
  }, []);

  async function loadDeposits() {
    setLoading(true);

    const access = await requireAdminPermission(
      router,
      "approve_deposits"
    );

    if (!access.allowed) return;
    
    const { data: platform } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    setSettings(platform);

    const { data, error } = await supabase
      .from("member_deposits")
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

    if (!error) setDeposits(data || []);
    setLoading(false);
  }

  async function approveDeposit(depositId: string) {
    setApprovingId(depositId);
    setMessage("");

    try {
      const { error } = await supabase.rpc("approve_member_deposit", {
        p_deposit_id: depositId,
      });

      if (error) throw error;

      setMessage("Deposit approved and member wallet credited successfully.");
      await loadDeposits();
    } catch (error: any) {
      setMessage(error.message || "Unable to approve deposit.");
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading deposits...
      </main>
    );
  }

  function downloadReceipt(deposit: any) {
    generateDepositReceiptPdf({
      deposit,
      settings: {
        clubName: settings?.club_name,
        clubShortName: settings?.club_short_name,
        supportEmail: settings?.support_email,
        supportPhone: settings?.support_phone,
      },
    });
  }

  return (
    <AppShell
      title="Deposit Approvals"
      subtitle="Review member deposits, confirm receipts, and credit wallets."
      role="admin"
    >
      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Membership No.</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Reference</th>
                <th className="px-5 py-4">Receipt</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No deposits found.
                  </td>
                </tr>
              ) : (
                deposits.map((deposit) => (
                  <tr key={deposit.id} className="border-t border-white/10">
                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {deposit.members?.full_name || "N/A"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {deposit.members?.email || "No email"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {deposit.members?.phone || "No phone"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {deposit.members?.membership_number || "N/A"}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      ₦{Number(deposit.amount || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      {deposit.payment_reference || "N/A"}
                    </td>

                    <td className="px-5 py-4">
                      {deposit.receipt_url ? (
                        <a
                          href={deposit.receipt_url}
                          target="_blank"
                          className="text-emerald-400 hover:underline"
                        >
                          View Receipt
                        </a>
                      ) : (
                        "No receipt"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                        {deposit.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {new Date(deposit.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      {deposit.status === "pending" ? (
                        <button
                          onClick={() => approveDeposit(deposit.id)}
                          disabled={approvingId === deposit.id}
                          className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                        >
                          {approvingId === deposit.id ? "Approving..." : "Approve"}
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <span className="text-slate-500">Processed</span>

                          <button
                            onClick={() => downloadReceipt(deposit)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            PDF Receipt
                          </button>
                        </div>
                      )}
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