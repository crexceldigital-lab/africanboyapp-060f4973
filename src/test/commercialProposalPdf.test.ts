import { describe, it, expect } from 'vitest';
import { getProposalAmounts } from '@/lib/commercialProposalData';
import { generateCommercialProposalPdf } from '@/utils/generateCommercialProposalPdf';
import type { AgentCommercialOffer } from '@/types';

const offer: AgentCommercialOffer = {
  id: '580b80af-c791-43ec-8689-eaabdc010a83', offerReference: 'ABA-OFF-2026-NG05N7', applicationId: 'app',
  applicantName: 'Chinedu Okafor', businessName: 'Mainland Kicks & Apparel', partnershipLevel: 'Wholesale Reseller',
  destinationCountry: 'Nigeria', destinationCity: 'Lagos', territory: 'Lagos, Nigeria', isExclusive: false,
  currency: 'USD', proposedItems: [
    { productId: 'tee', name: 'AFB Panda Rider Tee Black', sku: 'AFB-TEE-PND-BLK', category: 'T-Shirt', quantity: 30, unitPrice: 13.30, lineTotal: 1, retailPrice: 0, appliedTierLabel: '', size: 'M' },
    { productId: 'cap', name: 'AFB Distressed Cap Cream', sku: 'AFB-CAP-DST-CRM', category: 'Caps', quantity: 20, unitPrice: 8.36, lineTotal: 1, retailPrice: 0, appliedTierLabel: '', size: 'Standard' },
  ], totalUnits: 1, merchandiseSubtotal: 1, confirmedShippingRate: 150,
  shippingTerms: '', shippingDisclaimer: '', paymentTerms: 'Pre-payment', marketingBenefits: [], artistDisclaimer: '',
  expiryDate: '2026-11-15', status: 'Draft', createdAt: '2026-10-16', updatedAt: '2026-10-16',
};

describe('Wholesale proposal calculations', () => {
  it('calculates real line totals, total quantity and USD goods value from the supplied sample items', () => {
    const result = getProposalAmounts(offer);
    expect(result.items.map(i => i.lineTotal)).toEqual([399, 167.20]);
    expect(result.totalUnits).toBe(50);
    expect(result.goodsValue).toBe(566.20);
  });
  it('excludes confirmed shipping from the goods value', () => {
    expect(getProposalAmounts({ ...offer, confirmedShippingRate: 999 }).goodsValue).toBe(566.20);
  });
  it('keeps the selected currency and prices without conversion', () => {
    const result = getProposalAmounts(offer);
    expect(result.currency).toBe('USD');
    expect(result.items[0].unitPrice).toBe(13.30);
  });
  it('rejects invalid quantities instead of inventing them', () => {
    expect(() => getProposalAmounts({ ...offer, proposedItems: [{ ...offer.proposedItems[0], quantity: -1 }] })).toThrow();
  });
  it('generates A4 documents with long product lists spanning multiple pages', () => {
    const doc = generateCommercialProposalPdf({ ...offer, proposedItems: Array.from({ length: 60 }, () => ({ ...offer.proposedItems[0], name: 'Long product description with detailed garment information and an extended colour name' })) });
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297, 0);
  });
});