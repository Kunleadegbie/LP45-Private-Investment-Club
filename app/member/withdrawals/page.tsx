"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { generateWithdrawalAdvicePdf } from "@/lib/pdf/withdrawalAdvicePdf";

export default function MemberWithdrawalsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<any>(null);

  const [form, setForm] = useState({
    amount: "",
    withdrawalType: "wallet",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
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

    const { data: bankData } = await supabase
      .from("member_bank_details")
      .select("*")
      .eq("member_id", memberData.id)
      .limit(1)
      .single();

    if (bankData) {
      setForm((prev) => ({
        ...prev,
        bankName: bankData.bank_name || "",
        accountName: bankData.account_name || "",
        accountNumber: bankData.account_number || "",
      }));
    }

    const { data: withdrawalData } = await supabase
      .from("withdrawals")
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

    setWithdrawals(withdrawalData || []);

    const { data: platform } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    setSettings(platform);

    setLoading(false);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      if (!member) throw new Error("Member record not found.");

      const amount = Number(form.amount || 0);

      if (!amount || amount <= 0) {
        throw new Error("Please enter a valid withdrawal amount.");
      }

      if (amount > walletBalance) {
        throw new Error("Withdrawal amount cannot be higher than wallet balance.");
      }

      const { error } = await supabase.from("withdrawals").insert({
        member_id: member.id,
        amount,
        withdrawal_type: form.withdrawalType,
        bank_name: form.bankName,
        account_name: form.accountName,
        account_number: form.accountNumber,
        status: "pending",
      });

      if (error) throw error;

      setMessage(
        "Withdrawal request submitted successfully. Awaiting admin approval."
      );

      setForm((prev) => ({
        ...prev,
        amount: "",
      }));

      await loadPage();
    } catch (error: any) {
      setMessage(error.message || "Unable to submit withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadAdvice(withdrawal: any) {
    generateWithdrawalAdvicePdf({
      withdrawal,
      settings: {
        clubName: settings?.club_name,
        clubShortName: settings?.club_short_name,
        supportEmail: settings?.support_email,
        supportPhone: settings?.support_phone,
      },
    });
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
      title="Withdrawal Request"
      subtitle="Request withdrawal from your available wallet balance."
      role="member"
    >
      <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-slate-400">Available Wallet Balance</p>
        <p className="mt-2 text-3xl font-bold">
          ₦{walletBalance.toLocaleString()}
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={submitWithdrawal}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-xl font-semibold">Submit Withdrawal Request</h2>

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Amount to Withdraw
              </span>
              <input
                required
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="e.g. 250000"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Withdrawal Type
              </span>
              <select
                value={form.withdrawalType}
                onChange={(e) => updateField("withdrawalType", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >
                <option value="wallet">Wallet Balance</option>
                <option value="roi">ROI Withdrawal</option>
                <option value="full_balance">Full Balance</option>
              </select>
            </label>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="font-semibold">Payment Bank Details</p>
              <p className="mt-1 text-sm text-slate-400">
                These details are prefilled from your profile but can be edited
                for this request.
              </p>

              <div className="mt-4 space-y-4">
                <Input
                  label="Bank Name"
                  value={form.bankName}
                  onChange={(v) => updateField("bankName", v)}
                />

                <Input
                  label="Account Name"
                  value={form.accountName}
                  onChange={(v) => updateField("accountName", v)}
                />

                <Input
                  label="Account Number"
                  value={form.accountNumber}
                  onChange={(v) => updateField("accountNumber", v)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Withdrawal Request"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Withdrawal History</h2>

          <div className="mt-5 space-y-4">
            {withdrawals.length === 0 ? (
              <p className="text-sm text-slate-400">
                No withdrawal request submitted yet.
              </p>
            ) : (
              withdrawals.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">
                        ₦{Number(item.amount || 0).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-slate-400 capitalize">
                        {item.withdrawal_type?.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                    <p>{item.bank_name}</p>
                    <p>{item.account_name}</p>
                    <p>{item.account_number}</p>
                  </div>

                  {(item.status === "approved" || item.status === "paid") && (
                    <button
                      onClick={() => downloadAdvice(item)}
                      className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Download Withdrawal Advice
                    </button>
                  )}

                  {item.admin_note && (
                    <p className="mt-3 text-sm text-slate-400">
                      Admin note: {item.admin_note}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
      />
    </label>
  );
}