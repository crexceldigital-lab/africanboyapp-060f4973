import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  let savedRow: any;
  const chain: any = {
    upsert: vi.fn((row: any) => { savedRow = row; return chain; }),
    single: vi.fn(async () => ({ data: savedRow, error: null })),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    supabase: {
      from: vi.fn(() => chain),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'not available in tests' } }),
    },
  };
});

import {
  wholesaleProgramService,
  DEFAULT_COLLECTION_SCHEDULE,
  DEFAULT_PARTNERSHIP_LEVELS,
} from '@/services/wholesaleProgramService';
import { agentService } from '@/services/agentService';
import { generateCommercialProposalPdf } from '@/utils/generateCommercialProposalPdf';
import type { AgentCommercialOffer, DistributorCollectionOrderRecord } from '@/types';

describe('Country Distributor 4-Collection Commitment (Authoritative Policy)', () => {
  beforeEach(async () => {
    localStorage.clear();
  });

  // TEST CRITERION 1: Programme pages & settings display 1,000 pieces per collection and four collections annually
  it('Criterion 1: Configures 4 collections annually with 1,000 pieces MOQ per collection and authoritative statement', async () => {
    const settings = await wholesaleProgramService.getSettings();

    expect(settings.annualCollectionsCount).toBe(4);
    expect(settings.collectionMinimumPieces).toBe(1000);
    expect(settings.plannedAnnualMinimumPieces).toBe(4000);

    const countryDistributorLevel = settings.partnershipLevels.find(
      l => l.id === 'country-distributor' || l.name === 'Country Distributor'
    );
    expect(countryDistributorLevel).toBeDefined();
    expect(countryDistributorLevel?.collectionsPerYear).toBe(4);
    expect(countryDistributorLevel?.minimumOrderPerCollection).toBe(1000);
    expect(countryDistributorLevel?.plannedAnnualMinimum).toBe(4000);

    // Verify exact authoritative commitment statement
    const expectedStatement =
      'Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.';
    expect(countryDistributorLevel?.annualCollectionCommitmentStatement).toBe(expectedStatement);
  });

  // TEST CRITERION 2: The annual commitment is calculated correctly as 4,000 pieces
  it('Criterion 2: Calculates annual commitment correctly as 4,000 pieces (sum of 4 collections × 1,000 pcs)', () => {
    expect(DEFAULT_COLLECTION_SCHEDULE).toHaveLength(4);

    const calculatedTotalPieces = DEFAULT_COLLECTION_SCHEDULE.reduce(
      (sum, drop) => sum + drop.minimumOrderPieces,
      0
    );
    expect(calculatedTotalPieces).toBe(4000);

    DEFAULT_COLLECTION_SCHEDULE.forEach(drop => {
      expect(drop.minimumOrderPieces).toBe(1000);
    });
  });

  // TEST CRITERION 3: Each collection is tracked separately
  it('Criterion 3: Tracks each of the 4 annual collections as a separate record with individual targets', async () => {
    const distributorRecords = await wholesaleProgramService.getCollectionTrackingForDistributor('app-sample-1');

    expect(distributorRecords).toHaveLength(4);

    const dropNumbers = distributorRecords.map(r => r.collectionNumber);
    expect(dropNumbers).toEqual([1, 2, 3, 4]);

    distributorRecords.forEach((rec, idx) => {
      expect(rec.collectionNumber).toBe(idx + 1);
      expect(rec.minimumCommitment).toBe(1000);
      expect(rec.collectionName).toBeTruthy();
    });
  });

  // TEST CRITERION 4: Opening order is not confused with subsequent collection commitments
  it('Criterion 4: Distinguishes opening order from subsequent drops; placing Drop 1 does NOT mark subsequent drops compliant', async () => {
    const distributorRecords = await wholesaleProgramService.getCollectionTrackingForDistributor('app-sample-1');

    const drop1 = distributorRecords.find(r => r.collectionNumber === 1);
    const drop2 = distributorRecords.find(r => r.collectionNumber === 2);
    const drop3 = distributorRecords.find(r => r.collectionNumber === 3);
    const drop4 = distributorRecords.find(r => r.collectionNumber === 4);

    // Drop 1 is the opening order
    expect(drop1?.isOpeningOrder).toBe(true);
    expect(drop1?.quantityOrdered).toBe(1000);
    expect(drop1?.outstandingCommitment).toBe(0);
    expect(drop1?.status).toBe('Order Placed');

    // Subsequent drops are not opening orders
    expect(drop2?.isOpeningOrder).toBe(false);
    expect(drop3?.isOpeningOrder).toBe(false);
    expect(drop4?.isOpeningOrder).toBe(false);

    // Subsequent drops remain unfulfilled commitments with 1,000 pieces outstanding each
    expect(drop2?.quantityOrdered).toBe(0);
    expect(drop2?.outstandingCommitment).toBe(1000);
    expect(drop2?.status).toBe('Pending Commitment');

    expect(drop3?.quantityOrdered).toBe(0);
    expect(drop3?.outstandingCommitment).toBe(1000);
    expect(drop3?.status).toBe('Pending Commitment');

    expect(drop4?.quantityOrdered).toBe(0);
    expect(drop4?.outstandingCommitment).toBe(1000);
    expect(drop4?.status).toBe('Pending Commitment');

    // Total ordered so far is only 1,000 / 4,000 pieces
    const totalOrdered = distributorRecords.reduce((sum, r) => sum + r.quantityOrdered, 0);
    const totalOutstanding = distributorRecords.reduce((sum, r) => sum + r.outstandingCommitment, 0);
    expect(totalOrdered).toBe(1000);
    expect(totalOutstanding).toBe(3000);
  });

  // TEST CRITERION 5: New commercial proposals and PDFs display updated collection commitment terms
  it('Criterion 5: New commercial offers and generated PDFs document the Annual Collection Commitment section', async () => {
    const newOfferPayload: Partial<AgentCommercialOffer> & { applicationId: string } = {
      applicationId: 'app-sample-2',
      applicantName: 'Chinedu Okafor',
      partnershipLevel: 'Country Distributor',
      destinationCountry: 'Nigeria',
      currency: 'USD',
      status: 'Sent',
      proposedItems: [
        {
          productId: 'line-1',
          category: 'T-Shirt',
          name: 'African Boy Classic T-Shirt',
          sku: 'AFB-TEE-CLASSIC',
          quantity: 1000,
          unitPrice: 11.5,
          retailPrice: 17.25,
          lineTotal: 11500,
          appliedTierLabel: 'Collection 1 Opening Allocation',
        },
      ],
      totalUnits: 1000,
      merchandiseSubtotal: 11500,
    };

    const savedOffer = await wholesaleProgramService.saveOffer(newOfferPayload);

    // Verify annualCollectionCommitment populated automatically
    expect(savedOffer.annualCollectionCommitment).toBeDefined();
    expect(savedOffer.annualCollectionCommitment?.contractTermMonths).toBe(12);
    expect(savedOffer.annualCollectionCommitment?.collectionsPerYear).toBe(4);
    expect(savedOffer.annualCollectionCommitment?.minimumOrderPerCollection).toBe(1000);
    expect(savedOffer.annualCollectionCommitment?.plannedAnnualMinimum).toBe(4000);

    // Generate Proposal PDF
    const pdfDoc = generateCommercialProposalPdf(savedOffer);
    expect(pdfDoc).toBeDefined();
    const pdfBlob = pdfDoc.output('blob');
    expect(pdfBlob.size).toBeGreaterThan(1000);
  });

  // TEST CRITERION 6: Existing commercial offers retain their original values and history
  it('Criterion 6: Existing commercial offers retain original values without overwrite or automatic regeneration', async () => {
    const allOffers = await wholesaleProgramService.getAllOffers();
    const kenyaOffer = allOffers.find(o => o.offerReference === 'ABA-OFF-2026-KEX97J');

    expect(kenyaOffer).toBeDefined();
    expect(kenyaOffer?.applicantName).toBe('David Mwangi');
    expect(kenyaOffer?.offerReference).toBe('ABA-OFF-2026-KEX97J');
    expect(kenyaOffer?.totalUnits).toBe(1000);

    // Original replenishment order value preserved in historical terms
    expect(kenyaOffer?.commercialTerms?.minimumReplenishmentOrder).toBe('100 units per quarter');
  });

  // TEST CRITERION 7: Kenya proposal flagged for review without being silently changed; revised offer uses new reference
  it('Criterion 7: Kenya proposal (ABA-OFF-2026-KEX97J) is flagged for review; revisions receive new reference', async () => {
    const originalOffer = await wholesaleProgramService.getOfferByReference('ABA-OFF-2026-KEX97J');
    expect(originalOffer).toBeDefined();
    expect(originalOffer?.flaggedForReview).toBe(true);
    expect(originalOffer?.isHistoricalBaseline).toBe(true);
    expect(originalOffer?.reviewRequiredReason).toBeTruthy();

    // Issue revised offer via admin-controlled workflow
    const revisedOffer = await wholesaleProgramService.issueRevisedProposal('ABA-OFF-2026-KEX97J');

    // Verify new version reference
    expect(revisedOffer.offerReference).toBe('ABA-OFF-2026-KEX97J-REV1');
    expect(revisedOffer.version).toBe(2);
    expect(revisedOffer.parentOfferReference).toBe('ABA-OFF-2026-KEX97J');
    expect(revisedOffer.status).toBe('Draft'); // Requires partner review and acceptance
    expect(revisedOffer.flaggedForReview).toBe(false);

    // Verify revised offer has new collection commitment
    expect(revisedOffer.annualCollectionCommitment).toBeDefined();
    expect(revisedOffer.annualCollectionCommitment?.collectionsPerYear).toBe(4);
    expect(revisedOffer.annualCollectionCommitment?.minimumOrderPerCollection).toBe(1000);
    expect(revisedOffer.annualCollectionCommitment?.plannedAnnualMinimum).toBe(4000);
    expect(revisedOffer.commercialTerms?.minimumReplenishmentOrder).toContain('1,000 pieces from each of the 4 annual collections');

    // Verify parent offer remains accessible in historical baseline state
    const reFetchedParent = await wholesaleProgramService.getOfferByReference('ABA-OFF-2026-KEX97J');
    expect(reFetchedParent).toBeDefined();
    expect(reFetchedParent?.offerReference).toBe('ABA-OFF-2026-KEX97J');
    expect(reFetchedParent?.supersededByOfferRef).toBe('ABA-OFF-2026-KEX97J-REV1');
    expect(reFetchedParent?.commercialTerms?.minimumReplenishmentOrder).toBe('100 units per quarter');
  });

  // TEST CRITERION 8: Existing application and shipping workflows continue to work seamlessly
  it('Criterion 8: Existing application records and shipping quotation workflows remain functional', async () => {
    const applications = await agentService.getApplications();
    expect(applications.length).toBeGreaterThanOrEqual(3);

    const applicants = applications.map(a => a.full_name);
    expect(applicants).toContain('David Mwangi');
    expect(applicants).toContain('Chinedu Okafor');
    expect(applicants).toContain('Amina Touré');

    // Separate shipping quotes remain accessible
    const shippingQuotes = await agentService.getAllShippingQuotes();
    expect(shippingQuotes.length).toBeGreaterThanOrEqual(1);

    const sampleQuote = shippingQuotes[0];
    expect(sampleQuote.order_id).toBeTruthy();
    expect(['Tanzania', 'China']).toContain(sampleQuote.shipping_origin);
  });
});
