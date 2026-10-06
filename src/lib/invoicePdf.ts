import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceSettings } from '@/types';

export type InvoicePdfLineItem = {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
};

export type InvoicePdfData = {
  invoice_number: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  issue_date: string;
  due_date?: string | null;
  currency: string;
  items: InvoicePdfLineItem[];
  subtotal: number;
  tax_percent: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  payment_status: string;
  notes?: string | null;
};

const GOLD: [number, number, number] = [212, 165, 60];
const DARK: [number, number, number] = [17, 17, 17];
const GREY: [number, number, number] = [110, 110, 110];

const money = (n: number, c: string) =>
  `${c === 'TZS' ? 'TSh' : c} ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

const statusLabel = (s: string) => (s || 'pending').replace(/_/g, ' ').toUpperCase();

export function generateInvoicePdf(
  invoice: InvoicePdfData,
  settings: Partial<InvoiceSettings> | null,
  fileName?: string
) {
  const s = settings || {};
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 0;

  // ---- Header band ----
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 110, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 110, W, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text((s.business_name || 'African Boy').toUpperCase(), M, 48);
  if (s.trading_name) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(s.trading_name, M, 64);
  }
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  const addrLines = [s.business_address, [s.city, s.country].filter(Boolean).join(', ')]
    .filter(Boolean) as string[];
  addrLines.forEach((l, i) => doc.text(l, M, 80 + i * 11));
  const contactLine = [s.phone, s.email, s.website].filter(Boolean).join('  ·  ');
  if (contactLine) doc.text(contactLine, M, 80 + addrLines.length * 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const regLines = [
    s.tin_number ? `TIN: ${s.tin_number}` : '',
    s.vrn_number ? `VRN: ${s.vrn_number}` : '',
    s.registration_number ? `Reg: ${s.registration_number}` : '',
  ].filter(Boolean);
  regLines.forEach((l, i) => doc.text(l, W - M, 48 + i * 11, { align: 'right' }));

  y = 140;

  // ---- Invoice title / meta ----
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INVOICE', M, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  const metaRows: [string, string][] = [
    ['Invoice #', invoice.invoice_number],
    ['Issue Date', invoice.issue_date],
    ['Due Date', invoice.due_date || '—'],
    ['Payment Status', statusLabel(invoice.payment_status)],
  ];
  metaRows.forEach(([label, value], i) => {
    const ly = y - 12 + i * 13;
    doc.setTextColor(...GREY);
    doc.text(`${label}:`, W - M - 150, ly);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, W - M, ly, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  });

  y += 26;

  // ---- Bill To ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text('BILL TO', M, y);
  y += 14;
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(invoice.customer_name || 'Valued Customer', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  const custLines = [
    invoice.customer_email || '',
    invoice.customer_phone || '',
    invoice.delivery_address || '',
  ].filter(Boolean);
  custLines.forEach((l, i) => doc.text(l, M, y + 14 + i * 12));
  if (custLines.length) y += 14 + custLines.length * 12;
  y += 18;

  // ---- Items table ----
  const body = invoice.items.map((it, i) => [
    String(i + 1),
    it.name || 'Item',
    it.description || '',
    String(it.quantity ?? 1),
    money(it.unitPrice, invoice.currency),
    money((it.quantity ?? 1) * (it.unitPrice ?? 0), invoice.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: body.length ? body : [['1', '—', '', '1', money(0, invoice.currency), money(0, invoice.currency)]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: DARK, lineColor: [230, 230, 230], lineWidth: 0.5 },
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 90, halign: 'right' },
      5: { cellWidth: 100, halign: 'right' },
    },
    margin: { left: M, right: M },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  // ---- Totals ----
  const taxAmount = Math.round((invoice.subtotal * (invoice.tax_percent || 0)) / 100);
  const totals: [string, string, boolean][] = [
    ['Subtotal', money(invoice.subtotal, invoice.currency), false],
    ...(invoice.tax_percent > 0 ? ([['Tax', `${money(taxAmount, invoice.currency)}  (${invoice.tax_percent}%)`, false]] as [string, string, boolean][]) : []),
    ...(invoice.delivery_fee > 0 ? ([['Delivery', money(invoice.delivery_fee, invoice.currency), false]] as [string, string, boolean][]) : []),
    ...(invoice.discount_amount > 0 ? ([['Discount', `-${money(invoice.discount_amount, invoice.currency)}`, false]] as [string, string, boolean][]) : []),
    ['TOTAL', money(invoice.total_amount, invoice.currency), true],
  ];
  const tx = W - M - 220;
  totals.forEach(([label, value, bold]) => {
    if (bold) {
      doc.setFillColor(...DARK);
      doc.rect(tx - 10, y - 12, 220 + 20, 24, 'F');
      doc.setTextColor(...GOLD);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(label, tx, y + 4);
      doc.text(value, W - M, y + 4, { align: 'right' });
      y += 34;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setTextColor(...GREY);
      doc.text(label, tx, y);
      doc.setTextColor(...DARK);
      doc.text(value, W - M, y, { align: 'right' });
      y += 16;
    }
  });

  // ---- Bank / payment details ----
  const bankLines = [
    s.bank_name ? `Bank: ${s.bank_name}` : '',
    s.account_name ? `Account Name: ${s.account_name}` : '',
    s.account_number ? `Account Number: ${s.account_number}` : '',
    s.bank_branch ? `Branch: ${s.bank_branch}` : '',
    s.swift_code ? `Swift Code: ${s.swift_code}` : '',
  ].filter(Boolean) as string[];
  const instructionLine = s.payment_instructions || '';

  if (bankLines.length || instructionLine) {
    if (y > doc.internal.pageSize.getHeight() - 180) {
      doc.addPage();
      y = 60;
    }
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.roundedRect(M, y, W - M * 2, 24 + (bankLines.length + (instructionLine ? 2 : 0)) * 12, 6, 6, 'S');
    let by = y + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('PAYMENT DETAILS', M + 12, by);
    by += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    bankLines.forEach((l) => {
      doc.text(l, M + 12, by);
      by += 12;
    });
    if (instructionLine) {
      doc.setTextColor(...GREY);
      const lines = doc.splitTextToSize(instructionLine, W - M * 2 - 24);
      lines.forEach((l: string) => {
        doc.text(l, M + 12, by);
        by += 12;
      });
    }
    y += 24 + (bankLines.length + (instructionLine ? 2 : 0)) * 12 + 14;
  }

  // ---- Notes ----
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('NOTES', M, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(invoice.notes, W - M * 2);
    lines.forEach((l: string) => {
      doc.text(l, M, y);
      y += 12;
    });
  }

  // ---- Footer ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(M, H - 40, W - M, H - 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      s.footer_text || `${s.business_name || 'African Boy'} — Thank you for your business.`,
      W / 2,
      H - 26,
      { align: 'center' }
    );
  }

  const safeName = (fileName || invoice.invoice_number || 'invoice')
    .replace(/[^a-zA-Z0-9-_]/g, '-');
  doc.save(`${safeName}.pdf`);
}
