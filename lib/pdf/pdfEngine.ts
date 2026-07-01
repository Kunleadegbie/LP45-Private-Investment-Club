import jsPDF from "jspdf";

export type PdfSettings = {
  clubName?: string;
  clubShortName?: string;
  supportEmail?: string;
  supportPhone?: string;
  certificateFooterNote?: string;
  statementFooterNote?: string;
  investmentManagerName?: string;
  clubSecretaryName?: string;
};

export const DEFAULT_CLUB_NAME = "LP45 Private Investment Club";
export const DEFAULT_CLUB_SHORT_NAME = "LP45 PIC";

export function money(value: any) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export function formatDate(value: any) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export function formatDateTime(value?: any) {
  return value ? new Date(value).toLocaleString() : new Date().toLocaleString();
}

export function verificationText() {
  return "Electronically generated and valid without physical signature.";
}

export function createPdf(title: string, settings?: PdfSettings) {
  const doc = new jsPDF("p", "mm", "a4");

  doc.setProperties({
    title,
    subject: settings?.clubName || DEFAULT_CLUB_NAME,
    author: settings?.clubName || DEFAULT_CLUB_NAME,
    creator: "LP45 Investment Platform",
  });

  return doc;
}

export function addHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
  settings?: PdfSettings
) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings?.clubName || DEFAULT_CLUB_NAME, 15, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(settings?.clubShortName || DEFAULT_CLUB_SHORT_NAME, 15, 20);

  const support = [settings?.supportEmail, settings?.supportPhone]
    .filter(Boolean)
    .join(" | ");

  if (support) {
    doc.setFontSize(7);
    doc.text(support, 15, 27);
  }

  doc.setTextColor(16, 185, 129);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 15, 44);

  if (subtitle) {
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(subtitle, 175);
    doc.text(lines, 15, 51);
  }

  doc.setTextColor(0, 0, 0);
}

export function addFooter(doc: jsPDF, note?: string, settings?: PdfSettings) {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(226, 232, 240);
  doc.line(15, pageHeight - 24, 195, pageHeight - 24);

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const footer =
    note ||
    settings?.statementFooterNote ||
    "This document is system-generated from the LP45 Private Investment Club platform.";

  const lines = doc.splitTextToSize(footer, 138);
  doc.text(lines, 15, pageHeight - 18);

  doc.setFontSize(7);
  doc.text(`Generated: ${formatDateTime()}`, 15, pageHeight - 7);
  doc.text(verificationText(), 78, pageHeight - 7);
  doc.text("LP45 System", 170, pageHeight - 7);

  doc.setTextColor(0, 0, 0);
}

export function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, y - 6, 180, 10, 2, 2, "F");

  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(title.toUpperCase(), 18, y + 0.5);

  doc.setTextColor(0, 0, 0);
  return y + 11;
}

export function addInfoGrid(
  doc: jsPDF,
  items: { label: string; value: string }[],
  startY: number
) {
  let y = startY;
  const leftX = 15;
  const rightX = 108;
  const valueWidth = 82;
  const rowHeight = 18;

  items.forEach((item, index) => {
    const x = index % 2 === 0 ? leftX : rightX;

    if (index % 2 === 0 && index !== 0) {
      y += rowHeight;
    }

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(item.label.toUpperCase(), x, y);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    const lines = doc.splitTextToSize(String(item.value || "N/A"), valueWidth);
    doc.text(lines.slice(0, 2), x, y + 5);
  });

  doc.setTextColor(0, 0, 0);
  return y + 20;
}

export function addSimpleTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number
) {
  let y = startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  const colWidth = 180 / headers.length;

  function drawHeader() {
    doc.setFillColor(15, 23, 42);
    doc.rect(15, y, 180, 9, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);

    headers.forEach((header, index) => {
      const text = doc.splitTextToSize(header, colWidth - 3);
      doc.text(text[0] || "", 17 + index * colWidth, y + 6);
    });

    y += 9;
  }

  drawHeader();

  rows.forEach((row, rowIndex) => {
    if (y > pageHeight - 35) {
      addFooter(doc);
      doc.addPage();
      y = 20;
      drawHeader();
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 9, "F");
    }

    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, 180, 9);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);

    row.forEach((cell, index) => {
      const text = doc.splitTextToSize(String(cell || ""), colWidth - 4);
      doc.text(text[0] || "", 17 + index * colWidth, y + 6);
    });

    y += 9;
  });

  doc.setTextColor(0, 0, 0);
  return y + 8;
}

export function addConfirmationBox(
  doc: jsPDF,
  title: string,
  body: string,
  y: number
) {
  const lines = doc.splitTextToSize(body, 155);
  const boxHeight = Math.max(34, 18 + lines.length * 5);

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, y, 180, boxHeight, 2, 2, "F");

  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(title, 20, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(lines, 20, y + 18);

  doc.setTextColor(0, 0, 0);
  return y + boxHeight + 12;
}

export function addSystemDetails(
  doc: jsPDF,
  documentType: string,
  documentId: string,
  y: number
) {
  y = addSectionTitle(doc, "System Details", y);

  return addInfoGrid(
    doc,
    [
      { label: "Document ID", value: documentId || "N/A" },
      { label: "Generated By", value: "LP45 System" },
      { label: "Generated Date", value: new Date().toLocaleDateString() },
      { label: "Document Type", value: documentType },
      { label: "Verification", value: verificationText() },
      { label: "Record Source", value: "LP45 Secure Platform" },
    ],
    y
  );
}

export function addSignatureBlock(
  doc: jsPDF,
  y: number,
  leftLabel = "Investment Manager",
  rightLabel = "Club Secretary"
) {
  doc.setDrawColor(100, 116, 139);
  doc.line(25, y, 85, y);
  doc.line(125, y, 185, y);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(leftLabel, 25, y + 6);
  doc.text(rightLabel, 125, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorized Signature", 25, y + 11);
  doc.text("Authorized Signature", 125, y + 11);

  doc.setTextColor(0, 0, 0);
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}