"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { generateDepositReceiptPdf } from "@/lib/pdf/depositReceiptPdf";

export default function MemberDepositsPage() {
  const router = useRouter();

  const [member, setMember] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    loadMemberAndDeposits();
  }, []);

  async function loadMemberAndDeposits() {
    setPageLoading(true);

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

    if (memberError || !memberData) {
      router.push("/login");
      return;
    }

    setMember(memberData);

    const { data } = await supabase
      .from("member_deposits")
      .select(`
        *,
        members (
          full_name,
          membership_number,
          email,
          phone
        )
      `)
      .eq("member_id", memberData.id)
      .order("created_at", { ascending: false });

    setDeposits(data || []);
    setPageLoading(false);
  }

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!member) throw new Error("Member record not found.");
      if (!receipt) throw new Error("Please upload payment receipt.");

      const fileExt = receipt.name.split(".").pop();
      const fileName = `${member.membership_number}-${Date.now()}.${fileExt}`;
      const filePath = `${member.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("deposit-receipts")
        .upload(filePath, receipt);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("deposit-receipts")
        .getPublicUrl(filePath);

      const receiptUrl = publicUrlData.publicUrl;

      const { error: depositError } = await supabase
        .from("member_deposits")
        .insert({
          member_id: member.id,
          amount: Number(amount),
          receipt_url: receiptUrl,
          payment_reference: paymentReference,
          status: "pending",
        });

      if (depositError) throw depositError;

      setMessage("Deposit submitted successfully. Awaiting admin approval.");
      setAmount("");
      setPaymentReference("");
      setReceipt(null);

      await loadMemberAndDeposits();
    } catch (error: any) {
      setMessage(error.message || "Unable to submit deposit.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReceipt(deposit: any) {
    generateDepositReceiptPdf({
      deposit,
      settings: {
        clubName: "LP45 Private Investment Club",
        clubShortName: "LP45 PIC",
        supportEmail: "support@lp45.com",
        supportPhone: "",
      },
    });
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading deposits...
      </main>
    );
  }

  return (
    <AppShell
      title="Capital Deposit"
      subtitle="Submit your investment capital deposit for admin confirmation."
      role="member"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={submitDeposit}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-xl font-semibold">Submit New Deposit</h2>

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Amount Deposited
              </span>
              <input
                required
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                placeholder="e.g. 500000"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Payment Reference
              </span>
              <input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                placeholder="Bank transfer reference"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Upload Receipt
              </span>
              <input
                required
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Deposit"}
            </button>
          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
              {message}
            </div>
          )}
        </form>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Deposit History</h2>

          <div className="mt-5 space-y-4">
            {deposits.length === 0 ? (
              <p className="text-sm text-slate-400">
                No deposit submitted yet.
              </p>
            ) : (
              deposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">
                        ₦{Number(deposit.amount || 0).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Ref: {deposit.payment_reference || "N/A"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(deposit.created_at).toLocaleString()}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                      {deposit.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    {deposit.receipt_url && (
                      <a
                        href={deposit.receipt_url}
                        target="_blank"
                        className="inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-white/10"
                      >
                        View Receipt
                      </a>
                    )}

                    {deposit.status === "approved" && (
                      <button
                        onClick={() => downloadReceipt(deposit)}
                        className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                      >
                        Download Receipt
                      </button>
                    )}
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