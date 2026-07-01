"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function MemberInvestmentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [myInvestments, setMyInvestments] = useState<any[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [investingId, setInvestingId] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setMessage("");

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

    const { data: balanceData } = await supabase
      .from("member_wallet_balances")
      .select("wallet_balance")
      .eq("member_id", memberData.id)
      .single();

    setWalletBalance(Number(balanceData?.wallet_balance || 0));

    const { data: opportunityData } = await supabase
      .from("investment_opportunities")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    setOpportunities(opportunityData || []);

    const { data: investmentData } = await supabase
      .from("member_investments")
      .select(`
        *,
        investment_opportunities (
          title,
          maturity_date,
          investment_type
        )
      `)
      .eq("member_id", memberData.id)
      .order("invested_at", { ascending: false });

    setMyInvestments(investmentData || []);
    setLoading(false);
  }

  function updateAmount(opportunityId: string, value: string) {
    setAmounts((prev) => ({
      ...prev,
      [opportunityId]: value,
    }));
  }

  function calculatePreview(opportunity: any, amount: number) {
    const roiRate = Number(opportunity.expected_roi_percent || 0);
    const grossRoi = (amount * roiRate) / 100;

    const deductionApplicable = Boolean(opportunity.deduction_applicable);
    const deductionRate = deductionApplicable
      ? Number(opportunity.deduction_rate || 0)
      : 0;

    const deductionAmount = deductionApplicable
      ? (grossRoi * deductionRate) / 100
      : 0;

    const netRoi = grossRoi - deductionAmount;
    const netTotalReturn = amount + netRoi;

    return {
      roiRate,
      grossRoi,
      deductionApplicable,
      deductionLabel: opportunity.deduction_label || "WHT",
      deductionRate,
      deductionAmount,
      netRoi,
      netTotalReturn,
    };
  }

  async function invest(opportunity: any) {
    setMessage("");
    setInvestingId(opportunity.id);

    try {
      const amount = Number(amounts[opportunity.id] || 0);

      if (!amount || amount <= 0) {
        throw new Error("Please enter a valid investment amount.");
      }

      if (amount > walletBalance) {
        throw new Error("Insufficient wallet balance.");
      }

      if (amount < Number(opportunity.minimum_investment || 0)) {
        throw new Error(
          `Minimum investment is ₦${Number(
            opportunity.minimum_investment || 0
          ).toLocaleString()}.`
        );
      }

      if (
        opportunity.maximum_investment &&
        amount > Number(opportunity.maximum_investment)
      ) {
        throw new Error(
          `Maximum investment is ₦${Number(
            opportunity.maximum_investment
          ).toLocaleString()}.`
        );
      }

      const { error } = await supabase.rpc("create_member_investment", {
        p_opportunity_id: opportunity.id,
        p_amount: amount,
      });

      if (error) throw error;

      setMessage("Investment successful. Your wallet has been debited.");
      setAmounts((prev) => ({ ...prev, [opportunity.id]: "" }));
      await loadPage();
    } catch (error: any) {
      setMessage(error.message || "Unable to complete investment.");
    } finally {
      setInvestingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading investment opportunities...
      </main>
    );
  }

  return (
    <AppShell
      title="Investment Opportunities"
      subtitle="View open opportunities and invest directly from your wallet."
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

      <section>
        <h2 className="text-xl font-semibold">Open Opportunities</h2>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {opportunities.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
              No open investment opportunity at the moment.
            </div>
          ) : (
            opportunities.map((opportunity) => {
              const amount = Number(amounts[opportunity.id] || 0);
              const preview = calculatePreview(opportunity, amount);

              return (
                <div
                  key={opportunity.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {opportunity.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {opportunity.investment_type || "General Investment"}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
                      Open
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {opportunity.description}
                  </p>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <Info
                      label="Expected ROI"
                      value={`${opportunity.expected_roi_percent}%`}
                    />
                    <Info
                      label="Minimum Investment"
                      value={`₦${Number(
                        opportunity.minimum_investment || 0
                      ).toLocaleString()}`}
                    />
                    <Info
                      label="Maximum Investment"
                      value={
                        opportunity.maximum_investment
                          ? `₦${Number(
                              opportunity.maximum_investment
                            ).toLocaleString()}`
                          : "No limit"
                      }
                    />
                    <Info
                      label="Maturity Date"
                      value={
                        opportunity.maturity_date
                          ? new Date(
                              opportunity.maturity_date
                            ).toLocaleDateString()
                          : "Not specified"
                      }
                    />
                    <Info
                      label="Deduction / Tax"
                      value={
                        preview.deductionApplicable
                          ? `${preview.deductionLabel} @ ${preview.deductionRate}%`
                          : "Not applicable"
                      }
                    />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">
                        Amount to Invest
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={amounts[opportunity.id] || ""}
                        onChange={(e) =>
                          updateAmount(opportunity.id, e.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                        placeholder="Enter amount"
                      />
                    </label>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <Info
                        label="Gross ROI"
                        value={`₦${preview.grossRoi.toLocaleString()}`}
                      />
                      <Info
                        label={
                          preview.deductionApplicable
                            ? `${preview.deductionLabel} Deduction`
                            : "Deduction"
                        }
                        value={
                          preview.deductionApplicable
                            ? `₦${preview.deductionAmount.toLocaleString()}`
                            : "₦0"
                        }
                      />
                      <Info
                        label="Net ROI"
                        value={`₦${preview.netRoi.toLocaleString()}`}
                      />
                      <Info
                        label="Net Total Return"
                        value={`₦${preview.netTotalReturn.toLocaleString()}`}
                      />
                    </div>

                    {preview.deductionApplicable && amount > 0 && (
                      <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
                        {preview.deductionLabel} of {preview.deductionRate}% will
                        be deducted from your gross ROI. Your net ROI will be ₦
                        {preview.netRoi.toLocaleString()}.
                      </p>
                    )}

                    <button
                      onClick={() => invest(opportunity)}
                      disabled={investingId === opportunity.id}
                      className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {investingId === opportunity.id
                        ? "Processing..."
                        : "Invest Now"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">My Investments</h2>

        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-5 py-4">Investment</th>
                  <th className="px-5 py-4">Capital</th>
                  <th className="px-5 py-4">ROI %</th>
                  <th className="px-5 py-4">Gross ROI</th>
                  <th className="px-5 py-4">Deduction</th>
                  <th className="px-5 py-4">Net ROI</th>
                  <th className="px-5 py-4">Net Total Return</th>
                  <th className="px-5 py-4">Certificate</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {myInvestments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      You have not made any investment yet.
                    </td>
                  </tr>
                ) : (
                  myInvestments.map((investment) => {
                    const grossRoi = Number(
                      investment.gross_roi_amount ??
                        investment.expected_roi_amount ??
                        0
                    );

                    const deductionAmount = Number(
                      investment.deduction_amount || 0
                    );

                    const netRoi = Number(
                      investment.net_roi_amount ??
                        investment.expected_roi_amount ??
                        0
                    );

                    const netTotalReturn = Number(
                      investment.net_total_return ??
                        investment.expected_total_return ??
                        0
                    );

                    return (
                      <tr
                        key={investment.id}
                        className="border-t border-white/10"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {investment.investment_opportunities?.title ||
                              "Investment"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {investment.investment_opportunities
                              ?.investment_type || "General Investment"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          ₦
                          {Number(
                            investment.amount_invested || 0
                          ).toLocaleString()}
                        </td>

                        <td className="px-5 py-4">
                          {investment.expected_roi_percent}%
                        </td>

                        <td className="px-5 py-4">
                          ₦{grossRoi.toLocaleString()}
                        </td>

                        <td className="px-5 py-4">
                          {investment.deduction_applicable ? (
                            <>
                              <div>
                                ₦{deductionAmount.toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-400">
                                {investment.deduction_label || "WHT"} @{" "}
                                {Number(
                                  investment.deduction_rate || 0
                                ).toLocaleString()}
                                %
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-300">
                          ₦{netRoi.toLocaleString()}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          ₦{netTotalReturn.toLocaleString()}
                        </td>

                        <td className="px-5 py-4">
                          {investment.certificate_number ? (
                            <button
                              onClick={() =>
                                router.push(
                                  `/member/certificates/${investment.id}`
                                )
                              }
                              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                            >
                              View Certificate
                            </button>
                          ) : (
                            <span className="text-slate-500">
                              Not generated
                            </span>
                          )}

                          {investment.certificate_number && (
                            <div className="mt-1 text-xs text-slate-400">
                              {investment.certificate_number}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                            {investment.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-400">
                          {new Date(
                            investment.invested_at
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}