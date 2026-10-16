import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AgentCommercialOffer, AgentApplication } from '@/types';
import { LEGAL_ARTIST_DISCLAIMER, SHIPPING_TAXES_DISCLAIMER } from '@/services/wholesaleProgramService';

export function generateCommercialProposalPdf(
  offer: AgentCommercialOffer,
  application?: AgentApplication | null
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const goldColor: [number, number, number] = [212, 175, 55]; // #D4AF37
  const darkBgColor: [number, number, number] = [18, 18, 20];
  const charcoalColor: [number, number, number] = [40, 40, 44];
  const textColor: [number, number, number] = [240, 240, 240];
  const mutedText: [number, number, number] = [150, 150, 155];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Background Banner
  doc.setFillColor(...darkBgColor);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 41, pageWidth, 2, 'F');

  // Brand Header
  doc.setTextColor(...goldColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('AFRICAN BOY', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedText);
  doc.text('BY JUX · LUXURY STREETWEAR WORLDWIDE', margin, 24);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 205);
  doc.text('Commercial Operations HQ · Dar es Salaam, Tanzania', margin, 31);
  doc.text('Email: partners@africanboy.africa · Tel: +255 627 997 928 · Web: www.africanboy.africa', margin, 36);

  // Proposal Meta on the right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...goldColor);
  doc.text('WHOLESALE COMMERCIAL PROPOSAL', pageWidth - margin, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textColor);
  doc.text(`Ref: ${offer.offerReference}`, pageWidth - margin, 22, { align: 'right' });
  doc.text(`App Ref: ${application?.application_reference || 'ABA-INTL-2026'}`, pageWidth - margin, 27, { align: 'right' });
  doc.text(`Date: ${new Date(offer.createdAt || Date.now()).toLocaleDateString()}`, pageWidth - margin, 32, { align: 'right' });
  doc.text(`Valid Until: ${offer.expiryDate}`, pageWidth - margin, 37, { align: 'right' });

  let y = 50;

  // 2. Recipient & Partnership Classification Box
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'F');
  doc.setDrawColor(225, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'S');

  // Left column: Applicant info
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 110);
  doc.text('PREPARED FOR / PROPOSED PARTNER:', margin + 4, y + 6);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text(offer.applicantName, margin + 4, y + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 68);
  if (offer.businessName) {
    doc.text(`Business Entity: ${offer.businessName}`, margin + 4, y + 17);
  }
  doc.text(`Destination: ${offer.destinationCity}, ${offer.destinationCountry}`, margin + 4, y + 22);
  if (application?.email || application?.phone_number) {
    doc.text(`Contact: ${application.email || ''} | ${application.phone_number || ''}`, margin + 4, y + 27);
  }

  // Right column: Partnership Tier
  const midX = margin + contentWidth * 0.55;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 110);
  doc.text('PARTNERSHIP CLASSIFICATION:', midX, y + 6);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 140, 20); // Deep gold
  doc.text(offer.partnershipLevel.toUpperCase(), midX, y + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 48);
  doc.text(`Assigned Territory: ${offer.territory}`, midX, y + 17);
  doc.text(`Exclusivity: ${offer.isExclusive ? 'TERRITORY EXCLUSIVE' : 'Non-Exclusive Territory'}`, midX, y + 22);
  doc.text(`Operating Currency: ${offer.currency}`, midX, y + 27);

  y += 37;

  // 3. Section Title: Opening Order Schedule
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text('1. PROPOSED OPENING WHOLESALE ORDER SCHEDULE', margin, y);
  y += 3;

  // 4. Products Table using autoTable
  const tableRows = offer.proposedItems.map((item, idx) => [
    idx + 1,
    item.name,
    item.category,
    item.sku || '-',
    item.size || 'STD',
    `${item.quantity} units`,
    `${Number(item.unitPrice).toLocaleString()} ${offer.currency}`,
    `${Number(item.lineTotal).toLocaleString()} ${offer.currency}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Product Description', 'Line', 'SKU', 'Size', 'Qty', 'Unit Price', 'Line Total']],
    body: tableRows,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [18, 18, 20],
      textColor: [212, 175, 55],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 35],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 20 },
      3: { cellWidth: 24 },
      4: { cellWidth: 14 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' },
    },
    didDrawPage: (data) => {
      y = data.cursor?.y || y + 30;
    },
  });

  // Calculate table end position
  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : y + 30;

  // 5. Commercial Quotation Summary Box
  const summaryWidth = 90;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(248, 248, 250);
  doc.roundedRect(summaryX, y, summaryWidth, 24, 2, 2, 'F');
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(summaryX, y, summaryWidth, 24, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text('Total Opening Order Quantity:', summaryX + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text(`${offer.totalUnits} Units`, summaryX + summaryWidth - 4, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text('Merchandise Wholesale Subtotal:', summaryX + 4, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text(`${Number(offer.merchandiseSubtotal).toLocaleString()} ${offer.currency}`, summaryX + summaryWidth - 4, y + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text('International Freight & Cargo:', summaryX + 4, y + 16);
  doc.setFont('helvetica', 'bold');
  if (offer.confirmedShippingRate && offer.confirmedShippingRate > 0) {
    doc.setTextColor(20, 120, 40);
    doc.text(`${Number(offer.confirmedShippingRate).toLocaleString()} ${offer.currency}`, summaryX + summaryWidth - 4, y + 16, { align: 'right' });
  } else {
    doc.setTextColor(180, 60, 20);
    doc.text('EXCLUDED / EX-WORKS', summaryX + summaryWidth - 4, y + 16, { align: 'right' });
  }

  const grandTotal = offer.merchandiseSubtotal + (offer.confirmedShippingRate || 0);
  doc.setFillColor(18, 18, 20);
  doc.rect(summaryX, y + 18, summaryWidth, 6, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...goldColor);
  doc.text('TOTAL QUOTATION VALUE:', summaryX + 4, y + 22.5);
  doc.text(`${Number(grandTotal).toLocaleString()} ${offer.currency}`, summaryX + summaryWidth - 4, y + 22.5, { align: 'right' });

  y += 28;

  // 6. Delivery & Shipping Disclaimer (Required: clear exclusion)
  doc.setFillColor(254, 248, 242);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(240, 190, 140);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'S');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 70, 20);
  doc.text('DELIVERY TERMS & IMPORT TARIFF DISCLAIMER:', margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 50, 40);
  const splitDisclaimer = doc.splitTextToSize(
    `${offer.shippingDisclaimer} Delivery terms: ${offer.shippingTerms}. Excludes local import clearance, destination VAT, customs taxes, and inland delivery unless confirmed above in writing.`,
    contentWidth - 6
  );
  doc.text(splitDisclaimer, margin + 3, y + 8.5);

  y += 18;

  // 7. Commercial & Payment Terms
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text('2. COMMERCIAL TERMS & LOGISTICS CONDITIONS', margin, y);
  y += 4.5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 55);

  const termLines = [
    `• Payment Terms: ${offer.paymentTerms}`,
    `• Shipping & Freight Responsibility: ${offer.shippingTerms} (${offer.destinationCity}, ${offer.destinationCountry})`,
    `• Minimum Subsequent Replenishment Order: ${offer.partnershipLevel === 'Country Distributor' ? '100 units' : offer.partnershipLevel === 'Premium Market Agent' ? '50 units' : '30 units'} per order`,
    `• Production & Dispatch Lead Time: Estimated 7 to 14 business days from cleared payment confirmation`,
  ];
  if (offer.isExclusive && offer.exclusivityTerms) {
    termLines.push(`• Territory Exclusivity Stipulation: ${offer.exclusivityTerms}`);
  }

  termLines.forEach(tl => {
    doc.text(tl, margin + 2, y);
    y += 4;
  });

  y += 2;

  // 8. Approved Marketing Support & Benefits
  if (offer.marketingBenefits && offer.marketingBenefits.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 24);
    doc.text('3. AUTHORIZED MARKETING SUPPORT PACKAGE', margin, y);
    y += 4.5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 55);
    offer.marketingBenefits.slice(0, 4).forEach(mb => {
      doc.text(`✓ ${mb}`, margin + 2, y);
      y += 3.8;
    });
    y += 2;
  }

  // 9. Mandatory Artist Appearance Legal Disclaimer
  doc.setFillColor(252, 252, 253);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'S');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(18, 18, 20);
  doc.text('LEGAL NOTICE REGARDING ARTIST APPEARANCES & PROMOTIONAL ENGAGEMENTS:', margin + 3, y + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  const artistText = doc.splitTextToSize(LEGAL_ARTIST_DISCLAIMER, contentWidth - 6);
  doc.text(artistText, margin + 3, y + 8);

  y += 16;

  // Check if we need to add a page or if space fits signature block
  if (y > pageHeight - 38) {
    doc.addPage();
    y = 20;
  }

  // 10. Acceptance & Signature Block
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text('4. COMMERCIAL ACCEPTANCE & AUTHORIZATION SIGNATURES', margin, y);
  y += 5;

  const colWidth = (contentWidth - 10) / 2;

  // Left Signatory (African Boy HQ)
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, y, colWidth, 24, 2, 2, 'F');
  doc.setDrawColor(210, 210, 215);
  doc.roundedRect(margin, y, colWidth, 24, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text('For: AFRICAN BOY WORLDWIDE (HQ)', margin + 3, y + 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text('Authorized Commercial Director:', margin + 3, y + 10);
  doc.text('Juma Mussa Mkambala (Jux) / Commercial Operations Desk', margin + 3, y + 14);
  doc.text('Official Seal: Verified Commercial Quotation', margin + 3, y + 18);
  doc.text(`Date of Issue: ${new Date().toISOString().split('T')[0]}`, margin + 3, y + 22);

  // Right Signatory (Applicant / Agent)
  const rightX = margin + colWidth + 10;
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(rightX, y, colWidth, 24, 2, 2, 'F');
  doc.setDrawColor(210, 210, 215);
  doc.roundedRect(rightX, y, colWidth, 24, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 24);
  doc.text(`For: ${offer.applicantName}`, rightX + 3, y + 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text('Authorized Partner Representative:', rightX + 3, y + 10);
  if (offer.status === 'Accepted' && offer.acceptedBySignature) {
    doc.setTextColor(20, 120, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(`Signed & Accepted: ${offer.acceptedBySignature}`, rightX + 3, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Acceptance Date: ${offer.acceptedAt ? new Date(offer.acceptedAt).toLocaleDateString() : 'Verified'}`, rightX + 3, y + 18);
    doc.text('Status: COMMERCIALLY BINDING AGREEMENT', rightX + 3, y + 22);
  } else {
    doc.text('Signature: ____________________________________', rightX + 3, y + 14);
    doc.text('Title: _________________________________________', rightX + 3, y + 18);
    doc.text(`Valid Until: ${offer.expiryDate} (Subject to acceptance)`, rightX + 3, y + 22);
  }

  // 11. Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 170);
    doc.text(
      `African Boy Wholesale Proposal · ${offer.offerReference} · Page ${p} of ${totalPages} · Confidential Commercial Document`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadCommercialProposalPdf(
  offer: AgentCommercialOffer,
  application?: AgentApplication | null
): void {
  const doc = generateCommercialProposalPdf(offer, application);
  const cleanRef = offer.offerReference.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`African_Boy_Wholesale_Proposal_${cleanRef}.pdf`);
}
