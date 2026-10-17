import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AgentCommercialOffer, AgentApplication } from '@/types';
import { getProposalAmounts, PROPOSAL_ARTIST_NOTICE, PROPOSAL_SHIPPING_NOTICE, type ProposalBusinessDetails } from '@/lib/commercialProposalData';
import { regularFont, boldFont } from '@/lib/proposalFonts';

const INK: [number, number, number] = [18, 18, 20];
const GOLD: [number, number, number] = [212, 175, 55];
const GREY: [number, number, number] = [95, 95, 100];
const PAPER: [number, number, number] = [255, 255, 255];
const LIGHT: [number, number, number] = [247, 247, 248];
const RULE: [number, number, number] = [220, 220, 223];
const clean = (value?: string | null) => value?.trim() || '';
const date = (value?: string | null) => {
  if (!value) return 'Not specified';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not specified' : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export function generateCommercialProposalPdf(
  offer: AgentCommercialOffer,
  application?: AgentApplication | null,
  business: ProposalBusinessDetails = {}
): jsPDF {
  const amounts = getProposalAmounts(offer);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Proposal-Regular.ttf', regularFont);
  doc.addFileToVFS('Proposal-Bold.ttf', boldFont);
  doc.addFont('Proposal-Regular.ttf', 'Proposal', 'normal');
  doc.addFont('Proposal-Bold.ttf', 'Proposal', 'bold');
  doc.setFont('Proposal', 'normal');
  const W = 210, H = 297, M = 14, CW = W - M * 2, bottom = H - 20;
  let y = 14;
  const text = (content: string, x: number, top: number, width: number, size = 9, bold = false, color = INK) => {
    doc.setFont('Proposal', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines: string[] = doc.splitTextToSize(content, width);
    doc.text(lines, x, top, { baseline: 'top', lineHeightFactor: 1.35 });
    return lines.length * size * 0.3528 * 1.35;
  };
  const continuation = () => {
    doc.setDrawColor(...GOLD);
    doc.line(M, 21, W - M, 21);
    text('AFRICAN BOY', M, 11, 65, 10, true);
    text(clean(offer.offerReference), W - M - 105, 11, 105, 8, false, GREY);
  };
  const ensure = (height: number) => {
    if (y + height > bottom) { doc.addPage(); continuation(); y = 28; }
  };
  const heading = (title: string, following = 18) => {
    ensure(10 + following);
    y += text(title, M, y, CW, 9.5, true) + 4;
  };
  const table = (body: string[][], columns?: Record<number, { cellWidth?: number; fontStyle?: 'bold'; textColor?: [number, number, number] }>) => {
    autoTable(doc, {
      startY: y, body, theme: 'plain',
      margin: { left: M, right: M, top: 28, bottom: 20 },
      styles: { font: 'Proposal', fontStyle: 'normal', fontSize: 8.5, cellPadding: 2, textColor: INK, overflow: 'linebreak', valign: 'top', lineWidth: 0.2, lineColor: RULE },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: columns,
      rowPageBreak: 'avoid',
      willDrawPage: () => { if (doc.getCurrentPageInfo().pageNumber > 1) continuation(); },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 5;
  };
  const notice = (title: string, content: string) => {
    doc.setFont('Proposal', 'normal'); doc.setFontSize(8.5);
    const lines: string[] = doc.splitTextToSize(content, CW - 10);
    const height = 13 + lines.length * 4.05;
    if (height <= bottom - 28) {
      ensure(height + 6);
      doc.setFillColor(...LIGHT); doc.setDrawColor(...RULE);
      doc.rect(M, y, CW, height, 'FD');
      const titleHeight = text(title, M + 5, y + 4, CW - 10, 8.5, true);
      text(content, M + 5, y + 6 + titleHeight, CW - 10, 8.5, false, GREY);
      y += height + 6;
    } else { heading(title); table([[content]]); }
  };

  // Full-width masthead and a separate, balanced reference/date row.
  doc.setFillColor(...INK); doc.rect(0, 0, W, 35, 'F');
  text('AFRICAN BOY', M, 9, CW, 22, true, GOLD);
  text('BY JUX · LUXURY STREETWEAR WORLDWIDE', M, 23, CW, 8, false, PAPER);
  doc.setFillColor(...GOLD); doc.rect(0, 35, W, 1.2, 'F');
  y = 43;
  y += text('Wholesale Commercial Proposal', M, y, CW, 17, true) + 6;
  table([
    [`Offer reference\n${clean(offer.offerReference) || 'Not specified'}`, `Issue date\n${date(offer.createdAt)}`, `Valid until\n${date(offer.expiryDate)}`],
    ...(application?.application_reference ? [[`Application reference\n${application.application_reference}`, '', '']] : []),
  ], { 0: { cellWidth: 88 }, 1: { cellWidth: 47 }, 2: { cellWidth: 47 } });
  const contacts = [business.business_name, business.business_address, [business.city, business.country].filter(Boolean).join(', '), business.email, business.phone, business.website].map(v => clean(v)).filter(Boolean);
  if (contacts.length) { y += text(contacts.join(' · '), M, y, CW, 8, false, GREY) + 7; }

  heading('PROPOSED PARTNER', 30);
  const partner = [clean(offer.applicantName), clean(offer.businessName), [clean(offer.destinationCity), clean(offer.destinationCountry)].filter(Boolean).join(', '), clean(application?.email), clean(application?.phone_number)].filter(Boolean).join('\n');
  const classification = [clean(offer.partnershipLevel), clean(offer.territory) ? `Territory: ${offer.territory}` : '', `Exclusivity: ${offer.isExclusive ? 'Territory exclusive' : 'Non-exclusive'}`, `Operating currency: ${amounts.currency}`].filter(Boolean).join('\n');
  table([[partner, classification]], { 0: { cellWidth: CW / 2 }, 1: { cellWidth: CW / 2 } });

  heading('PRODUCT ORDER SCHEDULE', 22);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Product description', 'Category', 'SKU', 'Size', 'Qty', 'Unit price', 'Line total']],
    body: amounts.items.map((item, i) => [String(i + 1), clean(item.name) || 'Not specified', clean(item.category) || '—', clean(item.sku) || '—', clean(item.size) || '—', String(item.quantity), amounts.money(item.unitPrice), amounts.money(item.lineTotal)]),
    theme: 'striped',
    styles: { font: 'Proposal', fontSize: 8, cellPadding: { top: 3, right: 2, bottom: 3, left: 2 }, textColor: INK, valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: INK, textColor: GOLD, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 38 }, 2: { cellWidth: 20 },
      3: { cellWidth: 34 }, 4: { cellWidth: 19, halign: 'center' }, 5: { cellWidth: 10, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' }, 7: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: M, right: M, top: 28, bottom: 20 },
    rowPageBreak: 'avoid', showHead: 'everyPage',
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === 3) {
        const sku = String(data.cell.raw || '—');
        // Fit the entire identifier on one line, rather than inserting arbitrary breaks.
        doc.setFont('Proposal', 'normal'); doc.setFontSize(8);
        const measured = doc.getTextWidth(sku);
        data.cell.styles.fontSize = measured > 30 ? 8 * 30 / measured : 8;
        data.cell.styles.overflow = 'visible';
      }
    },
    willDrawPage: () => { if (doc.getCurrentPageInfo().pageNumber > 1) continuation(); },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 6;
  ensure(42);
  table([
    ['Total order quantity', `${amounts.totalUnits.toLocaleString('en-US')} units`],
    ['Merchandise wholesale subtotal', amounts.money(amounts.goodsValue)],
    ['Shipping and freight', 'EXCLUDED — QUOTED SEPARATELY'],
    ['TOTAL GOODS VALUE', amounts.money(amounts.goodsValue)],
  ], { 0: { cellWidth: 98 }, 1: { cellWidth: 84, fontStyle: 'bold' } });

  notice('SHIPPING & IMPORT COSTS — QUOTED SEPARATELY', PROPOSAL_SHIPPING_NOTICE);
  heading('COMMERCIAL TERMS & LOGISTICS', 22);
  const terms = offer.commercialTerms;
  const rows = [
    ['Payment terms', clean(offer.paymentTerms) || 'Not specified in this offer'],
    ['Shipping responsibility', clean(offer.shippingTerms) || 'Shipping quotation to be agreed separately'],
    ['Potential shipping origins', terms?.potentialShippingOrigins?.filter(Boolean).join(', ') || 'See separate shipping arrangement above'],
    ['Minimum replenishment order', clean(terms?.minimumReplenishmentOrder) || 'Not specified in this offer'],
    ['Processing and dispatch estimate', clean(terms?.processingDispatchTime) || 'To be confirmed'],
    ...(offer.isExclusive && clean(offer.exclusivityTerms) ? [['Exclusivity terms', clean(offer.exclusivityTerms)]] : []),
  ];
  table(rows, { 0: { cellWidth: 58, fontStyle: 'bold' }, 1: { cellWidth: CW - 58 } });
  ensure(14);
  y += text('Dispatch estimates are subject to stock availability, payment confirmation and order confirmation.', M, y, CW, 8.5, false, GREY) + 8;

  const benefits = (offer.marketingBenefits || []).map(v => clean(v)).filter(Boolean);
  if (benefits.length) {
    heading('INCLUDED MARKETING SUPPORT', 15);
    table(benefits.map(benefit => ['•', benefit]), { 0: { cellWidth: 7 }, 1: { cellWidth: CW - 7 } });
  }
  notice('ARTIST APPEARANCES & PROMOTIONAL ENGAGEMENTS', PROPOSAL_ARTIST_NOTICE);

  // Keep both panels, title and usable signing space together on one page.
  doc.setFont('Proposal', 'bold'); doc.setFontSize(9);
  const partnerName = clean(offer.businessName) || clean(offer.applicantName) || 'Partner';
  const companyName = clean(business.business_name) || 'African Boy';
  const nameHeight = Math.max(doc.splitTextToSize(partnerName, 79).length, doc.splitTextToSize(companyName, 79).length) * 4.5;
  doc.setFont('Proposal', 'normal'); doc.setFontSize(8);
  const representativeHeight = Math.max(
    doc.splitTextToSize(clean(business.contact_person), 77).length,
    doc.splitTextToSize(clean(offer.acceptedBySignature), 77).length,
    1
  ) * 4;
  const signatureHeight = 62 + nameHeight + Math.max(0, representativeHeight - 4);
  ensure(signatureHeight + 16);
  heading('SIGNATURE & ACCEPTANCE', signatureHeight);
  const panelWidth = (CW - 8) / 2;
  const panel = (x: number, label: string, name: string, partnerPanel: boolean) => {
    doc.setDrawColor(...RULE); doc.rect(x, y, panelWidth, signatureHeight);
    text(label, x + 5, y + 5, panelWidth - 10, 8, true, GREY);
    text(name, x + 5, y + 12, panelWidth - 10, 9, true);
    let sy = y + 15 + nameHeight;
    const accepted = partnerPanel && (offer.status === 'Accepted' || offer.status === 'Activated') && clean(offer.acceptedBySignature) && offer.acceptedAt;
    const representative = partnerPanel ? (accepted ? clean(offer.acceptedBySignature) : '') : clean(business.contact_person);
    text('Authorised representative', x + 5, sy, panelWidth - 10, 8, false, GREY);
    sy += 5;
    if (representative) { text(representative, x + 5, sy, panelWidth - 10, 8); } else { doc.line(x + 5, sy + 4, x + panelWidth - 5, sy + 4); }
    sy += 11 + Math.max(0, representativeHeight - 4);
    text('Title', x + 5, sy, panelWidth - 10, 8, false, GREY);
    doc.line(x + 17, sy + 4, x + panelWidth - 5, sy + 4);
    sy += 10;
    text('Signature', x + 5, sy, panelWidth - 10, 8, false, GREY);
    doc.line(x + 5, sy + 10, x + panelWidth - 5, sy + 10);
    sy += 15;
    text('Date', x + 5, sy, panelWidth - 10, 8, false, GREY);
    doc.line(x + 17, sy + 4, x + panelWidth - 5, sy + 4);
  };
  panel(M, 'AFRICAN BOY', companyName, false);
  panel(M + panelWidth + 8, 'PARTNER', partnerName, true);
  y += signatureHeight + 5;
  if ((offer.status === 'Accepted' || offer.status === 'Activated') && clean(offer.acceptedBySignature) && offer.acceptedAt) {
    ensure(15);
    text(`Recorded partner acceptance: ${offer.acceptedBySignature} · ${date(offer.acceptedAt)}. Signature fields above remain available for execution.`, M, y, CW, 8, false, GREY);
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setDrawColor(...RULE); doc.line(M, H - 15, W - M, H - 15);
    text(`African Boy · ${clean(offer.offerReference)} · Confidential commercial document`, M, H - 12, CW - 25, 7, false, GREY);
    text(`${p} / ${pages}`, W - M - 20, H - 12, 20, 7, false, GREY);
  }
  doc.setProperties({ title: `African Boy Wholesale Proposal ${offer.offerReference}`, subject: 'Goods-only wholesale commercial proposal', author: 'African Boy' });
  return doc;
}

export function downloadCommercialProposalPdf(
  offer: AgentCommercialOffer,
  application?: AgentApplication | null,
  business?: ProposalBusinessDetails
): void {
  const doc = generateCommercialProposalPdf(offer, application, business);
  const cleanRef = offer.offerReference.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`African_Boy_Wholesale_Proposal_${cleanRef}.pdf`);
}
