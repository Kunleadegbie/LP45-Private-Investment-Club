import {
  addFooter,
  addHeader,
  addInfoGrid,
  addSectionTitle,
  addSimpleTable,
  createPdf,
  downloadPdf,
  formatDate,
  money,
  type PdfSettings,
} from "@/lib/pdf/pdfEngine";

type StatementPayload = {
  member: any;
  ledger: any[];
  roiRecords?: any[];
  fromDate?: string;
  toDate?: string;
  settings?: PdfSettings;
};

export function generateStatementPdf({
  member,
  ledger,
  roiRecords = [],
  fromDate,
  toDate,
  settings,
}: StatementPayload) {
  const doc = createPdf("Member Statement", settings);

  const statementPeriod = `${fromDate || "Start"} to ${toDate || "Today"}`;

  const openingBalance =
    ledger.length > 0 ? Number(ledger[0].opening_balance || 0) : 0;

  const closingBalance =
    ledger.length > 0
      ? Number(ledger[ledger.length - 1].closing_balance || 0)
      : 0;

  const totalCredits = ledger
    .filter((item) => item.entry_direction === "credit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalDebits = ledger
    .filter((item) => item.entry_direction === "debit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalDeposits = ledger
    .filter((item) => item.ledger_type === "deposit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalInvestments = ledger
    .filter((item) => item.ledger_type === "investment")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalNetROI = ledger
    .filter((item) => item.ledger_type === "roi_credit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalWithdrawals = ledger
    .filter((item) => item.ledger_type === "withdrawal")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const grossROI = roiRecords.reduce(
    (sum, item) => sum + Number(item.gross_roi_amount ?? item.roi_amount ?? 0),
    0
  );

  const totalDeductions = roiRecords.reduce(
    (sum, item) => sum + Number(item.deduction_amount || 0),
    0
  );

  addHeader(
    doc,
    "Member Statement of Account",
    `Statement Period: ${statementPeriod}`,
    settings
  );

  let y = 60;

  y = addSectionTitle(doc, "Member Information", y);

  y = addInfoGrid(
    doc,
    [
      { label: "Member Name", value: member?.full_name || "N/A" },
      {
        label: "Membership Number",
        value: member?.membership_number || "N/A",
      },
      { label: "Email", value: member?.email || "N/A" },
      { label: "Phone", value: member?.phone || "N/A" },
      { label: "Statement Period", value: statementPeriod },
      { label: "Generated Date", value: new Date().toLocaleDateString() },
    ],
    y
  );

  y = addSectionTitle(doc, "Financial Summary", y + 2);

  y = addInfoGrid(
    doc,
    [
      { label: "Opening Balance", value: money(openingBalance) },
      { label: "Total Deposits", value: money(totalDeposits) },
      { label: "Total Investments", value: money(totalInvestments) },
      { label: "Gross ROI", value: money(grossROI) },
      { label: "Total Deductions", value: money(totalDeductions) },
      { label: "Net ROI Credited", value: money(totalNetROI) },
      { label: "Withdrawals", value: money(totalWithdrawals) },
      { label: "Closing Balance", value: money(closingBalance) },
      { label: "Total Credits", value: money(totalCredits) },
      { label: "Total Debits", value: money(totalDebits) },
    ],
    y
  );

  y = addSectionTitle(doc, "Transaction Statement", y + 2);

  const ledgerRows = ledger.map((entry) => [
    formatDate(entry.created_at),
    entry.ledger_type?.replaceAll("_", " ") || "Transaction",
    entry.narration || "Ledger transaction",
    entry.entry_direction === "debit" ? money(entry.amount) : "-",
    entry.entry_direction === "credit" ? money(entry.amount) : "-",
    money(entry.closing_balance),
  ]);

  y = addSimpleTable(
    doc,
    ["Date", "Type", "Narration", "Debit", "Credit", "Balance"],
    ledgerRows.length > 0
      ? ledgerRows
      : [["-", "-", "No transaction found for this period", "-", "-", "-"]],
    y
  );

  if (roiRecords.length > 0) {
    y = addSectionTitle(doc, "ROI / Deduction Summary", y + 2);

    const roiRows = roiRecords.map((record) => [
      record.investment_opportunities?.title || "Investment",
      money(record.gross_roi_amount ?? record.roi_amount),
      record.deduction_applicable
        ? `${record.deduction_label || "WHT"} @ ${Number(
            record.deduction_rate || 0
          )}%`
        : "None",
      money(record.deduction_amount),
      money(record.net_roi_amount ?? record.roi_amount),
      record.status || "N/A",
    ]);

    y = addSimpleTable(
      doc,
      ["Investment", "Gross ROI", "Deduction", "Tax Amt", "Net ROI", "Status"],
      roiRows,
      y
    );
  }

  addFooter(
    doc,
    settings?.statementFooterNote ||
      "This statement is system-generated from the LP45 Private Investment Club ledger records.",
    settings
  );

  downloadPdf(
    doc,
    `member-statement-${member?.membership_number || "lp45"}-${new Date()
      .toISOString()
      .slice(0, 10)}`
  );
}