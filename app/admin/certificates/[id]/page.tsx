"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { generateCertificatePdf } from "@/lib/pdf/certificatePdf";

export default function AdminCertificateDetailPage() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadCertificate();
  }, []);

  async function loadCertificate() {
    const investmentId = params.id as string;

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
          expected_roi_percent,
          duration_days,
          maturity_date
        )
      `)
      .eq("id", investmentId)
      .single();

    const { data: setting } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    setSettings(setting);

    if (!error) setCertificate(data);
    setLoading(false);
  }

  function printCertificate() {
    window.print();
  }

  function downloadPdf() {
    if (!certificate) return;

    generateCertificatePdf(certificate, {
      clubName: settings?.club_name,
      clubShortName: settings?.club_short_name,
      supportEmail: settings?.support_email,
      supportPhone: settings?.support_phone,
      certificateFooterNote: settings?.certificate_footer_note,
      statementFooterNote: settings?.statement_footer_note,
      investmentManagerName: settings?.investment_manager_name,
      clubSecretaryName: settings?.club_secretary_name,
    });
  }

  function money(value: any) {
    return `₦${Number(value || 0).toLocaleString()}`;
  }

  function date(value: any) {
    return value ? new Date(value).toLocaleDateString() : "Not specified";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading certificate...
      </main>
    );
  }

  if (!certificate) {
    return (
      <AppShell
        title="Investment Certificate"
        subtitle="Certificate not found"
        role="admin"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          Certificate not found.
        </div>
      </AppShell>
    );
  }

  const grossROI = Number(
    certificate.gross_roi_amount ?? certificate.expected_roi_amount ?? 0
  );

  const deductionApplicable = Boolean(certificate.deduction_applicable);
  const deductionLabel = certificate.deduction_label || "WHT";
  const deductionRate = Number(certificate.deduction_rate || 0);
  const deductionAmount = Number(certificate.deduction_amount || 0);

  const netROI = Number(
    certificate.net_roi_amount ?? certificate.expected_roi_amount ?? 0
  );

  const netTotalReturn = Number(
    certificate.net_total_return ?? certificate.expected_total_return ?? 0
  );

  return (
    <AppShell
      title="Investment Certificate"
      subtitle={certificate.certificate_number || "Certificate"}
      role="admin"
    >
      <div className="mb-6 flex flex-wrap justify-end gap-3 print:hidden">
        <button
          onClick={() => router.push("/admin/certificates")}
          className="rounded-xl border border-white/10 px-6 py-3 font-semibold hover:bg-white/10"
        >
          Back to Certificates
        </button>

        <button
          onClick={downloadPdf}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500"
        >
          Download PDF
        </button>

        <button
          onClick={printCertificate}
          className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950  hover:bg-emerald-400"
        >
          Print Certificate
        </button>
      </div>
        
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-emerald-500/40 bg-white p-8 text-slate-950 shadow-2xl print:border-4 print:border-emerald-700 print:shadow-none md:p-12">
        <div className="relative overflow-hidden rounded-[1.5rem] border-4 border-emerald-700 p-8 md:p-12">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
            <div className="rotate-[-18deg] text-center">
              <p className="text-8xl font-black tracking-widest">LP45</p>
              <p className="mt-2 text-3xl font-bold tracking-[0.4em]">
                PRIVATE INVESTMENT CLUB
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="border-b-4 border-emerald-700 pb-6 text-center">
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                LP45 Private Investment Club
              </h1>
              <p className="mt-3 text-lg font-semibold uppercase tracking-[0.35em] text-emerald-700">
                Investment Certificate
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Certificate No:{" "}
                <span className="font-bold text-slate-800">
                  {certificate.certificate_number || "N/A"}
                </span>
              </p>
            </div>

            <div className="mt-10 text-center">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
                This certifies that
              </p>

              <h2 className="mt-4 text-3xl font-black md:text-4xl">
                {certificate.members?.full_name || "Member"}
              </h2>

              <p className="mt-3 text-slate-600">
                Membership Number:{" "}
                <span className="font-bold text-slate-900">
                  {certificate.members?.membership_number ||
                    certificate.membership_number ||
                    "N/A"}
                </span>
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {certificate.members?.email || "No email"}{" "}
                {certificate.members?.phone
                  ? `• ${certificate.members.phone}`
                  : ""}
              </p>

              <p className="mx-auto mt-6 max-w-3xl leading-8 text-slate-700">
                has participated in the investment opportunity stated below
                under LP45 Private Investment Club, subject to the terms,
                deductions, maturity timeline, and return structure approved for
                this investment.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="border-b border-slate-200 pb-3 text-lg font-bold uppercase tracking-wider text-slate-700">
                  Investment Details
                </h3>

                <div className="mt-5 grid gap-5">
                  <Info
                    label="Investment Title"
                    value={certificate.investment_opportunities?.title || "N/A"}
                  />
                  <Info
                    label="Investment Type"
                    value={
                      certificate.investment_opportunities?.investment_type ||
                      "General Investment"
                    }
                  />
                  <Info
                    label="Capital Invested"
                    value={money(certificate.amount_invested)}
                  />
                  <Info
                    label="Investment Date"
                    value={date(certificate.invested_at)}
                  />
                  <Info
                    label="Maturity Date"
                    value={date(
                      certificate.investment_opportunities?.maturity_date
                    )}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="border-b border-emerald-200 pb-3 text-lg font-bold uppercase tracking-wider text-emerald-800">
                  Return Summary
                </h3>

                <div className="mt-5 grid gap-5">
                  <Info
                    label="ROI Rate"
                    value={`${certificate.expected_roi_percent}%`}
                  />
                  <Info label="Gross ROI" value={money(grossROI)} />
                  <Info
                    label="Deduction / Tax"
                    value={
                      deductionApplicable
                        ? `${deductionLabel} @ ${deductionRate}%`
                        : "Not applicable"
                    }
                  />
                  <Info
                    label="Deduction Amount"
                    value={money(deductionAmount)}
                  />
                  <Info label="Net ROI" value={money(netROI)} strong />
                  <Info
                    label="Net Total Return"
                    value={money(netTotalReturn)}
                    strong
                  />
                </div>
              </section>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold uppercase tracking-wider text-slate-700">
                Certificate Authenticity
              </h3>

              <div className="mt-5 grid gap-5 md:grid-cols-4">
                <Info
                  label="Certificate Number"
                  value={certificate.certificate_number || "N/A"}
                />
                <Info
                  label="Issued Date"
                  value={date(certificate.invested_at)}
                />
                <Info label="Status" value={certificate.status || "Active"} />
                <Info label="Generated By" value="LP45 System" />
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              <p className="font-bold">Deduction / Tax Disclosure</p>
              <p className="mt-2">
                Where deduction is applicable, the Net ROI stated on this
                certificate represents the amount due to the member after
                deduction from Gross ROI. The deduction may represent WHT, VAT,
                or any other approved charge configured for the investment
                opportunity.
              </p>
            </div>

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              <div>
                <div className="h-px w-full bg-slate-400" />
                <p className="mt-3 text-sm font-bold">Investment Manager</p>
                <p className="text-xs text-slate-500">Authorized Signature</p>
              </div>

              <div>
                <div className="h-px w-full bg-slate-400" />
                <p className="mt-3 text-sm font-bold">Club Secretary</p>
                <p className="text-xs text-slate-500">Authorized Signature</p>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-emerald-700 text-center text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Official
                  <br />
                  Club Seal
                </div>
              </div>
            </div>

            <div className="mt-12 border-t border-slate-300 pt-5 text-center text-xs leading-6 text-slate-500">
              <p>
                This certificate is electronically generated and can be verified
                from the LP45 Private Investment Club Portal.
              </p>
              <p>Any alteration renders this certificate invalid.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Info({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 ${
          strong ? "text-2xl font-black text-emerald-800" : "text-lg font-bold"
        }`}
      >
        {value}
      </p>
    </div>
  );
}