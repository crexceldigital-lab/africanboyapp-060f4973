import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the backend client so application inserts succeed in tests
vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
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
  DEFAULT_PARTNERSHIP_LEVELS,
  DEFAULT_PRICING_TIERS,
  DEFAULT_MARKETING_BENEFITS,
  DEFAULT_CURRENCY_RATES,
  LEGAL_ARTIST_DISCLAIMER,
  SHIPPING_TAXES_DISCLAIMER,
} from '@/services/wholesaleProgramService';
import { agentService } from '@/services/agentService';
import type { AgentProfile, Product, WholesaleProgramSettings } from '@/types';

describe('AFRICAN BOY INTERNATIONAL AGENT WHOLESALE PROGRAMME', () => {
  let mockProducts: Product[];
  let mockAgentProfile: AgentProfile;

  beforeEach(() => {
    localStorage.clear();

    mockProducts = [
      {
        id: 'p-tee-1',
        name: 'African Boy Signature T-Shirt Black',
        description: 'Classic heavy cotton tee featuring gold cheetah motif.',
        price: 45000,
        cost_price: 18000, // Confidential cost price - MUST NOT BE LEAKED TO AGENTS
        category: 'T-Shirt',
        stock_quantity: 400,
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        sku: 'AFB-TSHIRT-BLK-01',
        sizes: ['M', 'L', 'XL', 'XXL'],
        colors: [{ name: 'Black', hex: '#000000' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-cap-1',
        name: 'African Boy Gold Crest Cap',
        description: 'Premium curved brim distressed cap with 3D metallic embroidery.',
        price: 35000,
        cost_price: 12000, // Confidential cost price
        category: 'Caps',
        stock_quantity: 250,
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
        sku: 'AFB-CAP-GLD-01',
        sizes: ['FREE SIZE'],
        colors: [{ name: 'Gold/Black', hex: '#D4AF37' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-sock-1',
        name: 'African Boy Jacquard Socks',
        description: 'Luxury combed cotton jacquard socks.',
        price: 20000,
        cost_price: 6000,
        category: 'Socks',
        stock_quantity: 150,
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=400',
        sku: 'AFB-SOCK-01',
        sizes: ['Standard'],
        colors: [{ name: 'Black/Gold', hex: '#000000' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockAgentProfile = {
      id: 'agent-tz-reseller-01',
      user_id: 'user-agent-tz-01',
      application_id: 'app-tz-01',
      agent_code: 'AFB-TZ-801',
      full_name: 'Zuberi Bakari',
      email: 'zuberi@africanboutique.co.tz',
      phone_number: '+255 754 112 233',
      business_name: 'Kilimanjaro Apparel Boutique',
      business_model: 'Wholesale Reseller',
      assigned_country_code: 'TZ',
      assigned_country_name: 'Tanzania',
      assigned_territory: 'Arusha Region',
      is_exclusive: false,
      approved_categories: ['T-Shirt', 'Caps'],
      commission_rate: 0,
      wholesale_discount_percent: 30,
      minimum_order_quantity: 30,
      minimum_initial_purchase: 1000000,
      currency: 'TZS',
      payment_terms: '100% Pre-payment via Bank Wire Transfer prior to dispatch',
      status: 'active',
      agreement_reference: 'AGR-TZ-801-2026',
      agreement_status: 'Active',
      agreement_start_date: '2026-01-01',
      agreement_end_date: '2026-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // ============================================================================
  // 1. PARTNERSHIP LEVELS
  // ============================================================================
  describe('1. Agent Partnership Levels', () => {
    it('supports exactly three configurable partnership levels: Wholesale Reseller, Premium Market Agent, Country Distributor', async () => {
      const settings = await wholesaleProgramService.getSettings();
      expect(settings.partnershipLevels).toHaveLength(3);

      const levelNames = settings.partnershipLevels.map(l => l.name);
      expect(levelNames).toContain('Wholesale Reseller');
      expect(levelNames).toContain('Premium Market Agent');
      expect(levelNames).toContain('Country Distributor');
    });

    it('has configurable default minimum order quantities, discounts, and currencies for each tier', async () => {
      const settings = await wholesaleProgramService.getSettings();

      const reseller = settings.partnershipLevels.find(l => l.name === 'Wholesale Reseller');
      expect(reseller).toBeDefined();
      expect(reseller?.defaultMoq).toBe(30);
      expect(reseller?.supportedCurrencies).toContain('TZS');
      expect(reseller?.supportedCurrencies).toContain('USD');
      expect(reseller?.eligibilityRules.length).toBeGreaterThan(0);
      expect(reseller?.benefits.length).toBeGreaterThan(0);

      const premium = settings.partnershipLevels.find(l => l.name === 'Premium Market Agent');
      expect(premium).toBeDefined();
      expect(premium?.defaultMoq).toBe(50);
      expect(premium?.exclusivityAllowed).toBe(true);

      const distributor = settings.partnershipLevels.find(l => l.name === 'Country Distributor');
      expect(distributor).toBeDefined();
      expect(distributor?.defaultMoq).toBe(100);
      expect(distributor?.exclusivityAllowed).toBe(true);
    });

    it('allows admin to edit partnership levels and saves them persistently', async () => {
      const settings = await wholesaleProgramService.getSettings();
      const updatedLevels = settings.partnershipLevels.map(l => {
        if (l.name === 'Wholesale Reseller') {
          return { ...l, defaultMoq: 35, defaultWholesaleDiscountPercent: 28 };
        }
        return l;
      });

      await wholesaleProgramService.saveSettings({
        ...settings,
        partnershipLevels: updatedLevels,
      });

      const reloaded = await wholesaleProgramService.getSettings();
      const reloadedReseller = reloaded.partnershipLevels.find(l => l.name === 'Wholesale Reseller');
      expect(reloadedReseller?.defaultMoq).toBe(35);
      expect(reloadedReseller?.defaultWholesaleDiscountPercent).toBe(28);
    });
  });

  // ============================================================================
  // 2. INITIAL PRODUCT CATALOGUE & CONFIDENTIALITY
  // ============================================================================
  describe('2. Initial Product Catalogue & Data Security', () => {
    it('initially enables only African Boy T-shirts and African Boy Caps by default', async () => {
      const settings = await wholesaleProgramService.getSettings();
      expect(settings.enabledCategories).toEqual(['T-Shirt', 'Caps']);
    });

    it('allows additional product categories to be enabled dynamically without restructuring', async () => {
      const settings = await wholesaleProgramService.getSettings();
      const updated = {
        ...settings,
        enabledCategories: ['T-Shirt', 'Caps', 'Socks', 'Jackets'],
      };

      await wholesaleProgramService.saveSettings(updated);
      const reloaded = await wholesaleProgramService.getSettings();
      expect(reloaded.enabledCategories).toContain('Socks');
      expect(reloaded.enabledCategories).toContain('Jackets');
    });

    it('uses existing product database as source of truth and NEVER exposes internal cost_price to agents', () => {
      const agentProducts = agentService.getAgentProducts(mockProducts, mockAgentProfile);

      expect(agentProducts).toHaveLength(3);
      agentProducts.forEach(product => {
        expect((product as any).cost_price).toBeUndefined();
        expect(product.price).toBeGreaterThan(0);
        expect(product.agentWholesalePrice).toBeDefined();
        expect(product.agentMarginPercent).toBeDefined();
      });
    });
  });

  // ============================================================================
  // 3. WHOLESALE PRICING ENGINE & TIER QUALIFICATION
  // ============================================================================
  describe('3. Wholesale Pricing Engine & Quantity Tiers', () => {
    it('correctly calculates initial T-shirt quantity tiers (30–49: 35k, 50–99: 32k, 100+: 30k TZS)', async () => {
      const settings = await wholesaleProgramService.getSettings();

      // 30-49 units
      const tier1 = wholesaleProgramService.getTierForCategory('T-Shirt', 35, settings);
      expect(tier1.unitPriceTZS).toBe(35000);

      // 50-99 units
      const tier2 = wholesaleProgramService.getTierForCategory('T-Shirt', 60, settings);
      expect(tier2.unitPriceTZS).toBe(32000);

      // 100+ units
      const tier3 = wholesaleProgramService.getTierForCategory('T-Shirt', 150, settings);
      expect(tier3.unitPriceTZS).toBe(30000);
    });

    it('correctly calculates initial Cap quantity tiers (30–49: 22k, 50–99: 20k, 100+: 18k TZS)', async () => {
      const settings = await wholesaleProgramService.getSettings();

      // 30-49 units
      const capTier1 = wholesaleProgramService.getTierForCategory('Caps', 40, settings);
      expect(capTier1.unitPriceTZS).toBe(22000);

      // 50-99 units
      const capTier2 = wholesaleProgramService.getTierForCategory('Caps', 75, settings);
      expect(capTier2.unitPriceTZS).toBe(20000);

      // 100+ units
      const capTier3 = wholesaleProgramService.getTierForCategory('Caps', 120, settings);
      expect(capTier3.unitPriceTZS).toBe(18000);
    });

    it('mixed-product orders: does not combine quantities across different categories when combineMixedQuantitiesForTiers is false', async () => {
      const settings = await wholesaleProgramService.getSettings();
      expect(settings.combineMixedQuantitiesForTiers).toBe(false);

      // Order with 30 T-shirts and 30 Caps (Total 60 units)
      const quotation = wholesaleProgramService.calculateQuotation(
        [
          {
            productId: 'p-tee-1',
            name: 'African Boy Signature Tee',
            category: 'T-Shirt',
            quantity: 30,
            retailPrice: 45000,
          },
          {
            productId: 'p-cap-1',
            name: 'African Boy Gold Crest Cap',
            category: 'Caps',
            quantity: 30,
            retailPrice: 35000,
          },
        ],
        {
          targetCurrency: 'TZS',
          settings,
          combineMixedQuantities: false,
        }
      );

      expect(quotation.totalUnits).toBe(60);
      // T-shirts: 30 units should qualify for 30-49 tier (35,000 TZS), NOT 50-99 tier (32,000 TZS)
      const tshirtItem = quotation.proposalItems.find(i => i.category === 'T-Shirt');
      expect(tshirtItem?.unitPrice).toBe(35000);
      expect(tshirtItem?.lineTotal).toBe(30 * 35000);

      // Caps: 30 units should qualify for 30-49 tier (22,000 TZS)
      const capItem = quotation.proposalItems.find(i => i.category === 'Caps');
      expect(capItem?.unitPrice).toBe(22000);
      expect(capItem?.lineTotal).toBe(30 * 22000);

      expect(quotation.merchandiseSubtotalTZS).toBe(30 * 35000 + 30 * 22000);
    });

    it('mixed-product orders: combines total order volume when combineMixedQuantitiesForTiers is explicitly true', async () => {
      const settings = await wholesaleProgramService.getSettings();

      // Order with 30 T-shirts and 30 Caps (Total 60 units) with combineMixedQuantities = true
      const quotation = wholesaleProgramService.calculateQuotation(
        [
          {
            productId: 'p-tee-1',
            name: 'African Boy Signature Tee',
            category: 'T-Shirt',
            quantity: 30,
            retailPrice: 45000,
          },
          {
            productId: 'p-cap-1',
            name: 'African Boy Gold Crest Cap',
            category: 'Caps',
            quantity: 30,
            retailPrice: 35000,
          },
        ],
        {
          targetCurrency: 'TZS',
          settings,
          combineMixedQuantities: true,
        }
      );

      expect(quotation.totalUnits).toBe(60);
      // Because combined volume is 60, both items qualify for the 50-99 tier!
      const tshirtItem = quotation.proposalItems.find(i => i.category === 'T-Shirt');
      expect(tshirtItem?.unitPrice).toBe(32000); // 50-99 tier price
      expect(tshirtItem?.lineTotal).toBe(30 * 32000);

      const capItem = quotation.proposalItems.find(i => i.category === 'Caps');
      expect(capItem?.unitPrice).toBe(20000); // 50-99 tier price
      expect(capItem?.lineTotal).toBe(30 * 20000);

      expect(quotation.merchandiseSubtotalTZS).toBe(30 * 32000 + 30 * 20000);
    });

    it('never calculates international shipping charges unless a confirmed rate has been entered', () => {
      // 1. Without confirmed rate
      const quotationExWorks = wholesaleProgramService.calculateQuotation(
        [
          {
            productId: 'p-tee-1',
            name: 'African Boy Signature Tee',
            category: 'T-Shirt',
            quantity: 50,
            retailPrice: 45000,
          },
        ],
        {
          targetCurrency: 'USD',
          confirmedShippingRate: null, // No confirmed rate entered
        }
      );

      expect(quotationExWorks.confirmedShippingRate).toBeNull();
      expect(quotationExWorks.grandTotalConverted).toBe(quotationExWorks.merchandiseSubtotalConverted);
      expect(quotationExWorks.shippingDisclaimer).toContain('EX-WORKS');

      // 2. With confirmed rate
      const quotationWithShipping = wholesaleProgramService.calculateQuotation(
        [
          {
            productId: 'p-tee-1',
            name: 'African Boy Signature Tee',
            category: 'T-Shirt',
            quantity: 50,
            retailPrice: 45000,
          },
        ],
        {
          targetCurrency: 'USD',
          confirmedShippingRate: 150, // Confirmed shipping charge entered
        }
      );

      expect(quotationWithShipping.confirmedShippingRate).toBe(150);
      expect(quotationWithShipping.grandTotalConverted).toBe(
        Math.round((quotationWithShipping.merchandiseSubtotalConverted + 150) * 100) / 100
      );
    });

    it('accurately converts currency using configured exchange rates', () => {
      // 1,000,000 TZS converted to USD with rate 0.00038
      const inUSD = wholesaleProgramService.convertCurrency(1000000, 'USD', DEFAULT_CURRENCY_RATES);
      expect(inUSD).toBe(380);

      // In KES with rate 0.05
      const inKES = wholesaleProgramService.convertCurrency(1000000, 'KES', DEFAULT_CURRENCY_RATES);
      expect(inKES).toBe(50000);

      // In TZS
      const inTZS = wholesaleProgramService.convertCurrency(1000000, 'TZS', DEFAULT_CURRENCY_RATES);
      expect(inTZS).toBe(1000000);
    });
  });

  // ============================================================================
  // 4. ADMIN APPLICATION REVIEW & COMMERCIAL OFFERS
  // ============================================================================
  describe('4. Admin Application Review & Commercial Offers', () => {
    it('creates, saves, and retrieves persistent commercial offers for an application', async () => {
      const offer = await wholesaleProgramService.saveOffer({
        applicationId: 'app-ke-001',
        applicantName: 'Amina Odhiambo',
        businessName: 'Nairobi Luxury Collective',
        partnershipLevel: 'Premium Market Agent',
        destinationCountry: 'Kenya',
        destinationCity: 'Nairobi',
        territory: 'Nairobi Central & Westlands',
        isExclusive: true,
        exclusivityTerms: 'Exclusive stockist rights for Nairobi Westlands zone.',
        currency: 'USD',
        proposedItems: [
          {
            productId: 'p-tee-1',
            name: 'African Boy Signature Tee',
            sku: 'AFB-TEE-01',
            category: 'T-Shirt',
            quantity: 50,
            unitPrice: 12.16,
            retailPrice: 17.1,
            lineTotal: 608,
            appliedTierLabel: '50–99 Units Tier',
          },
        ],
        totalUnits: 50,
        merchandiseSubtotal: 608,
        confirmedShippingRate: null,
        shippingTerms: 'Ex Works Dar es Salaam',
        shippingDisclaimer: SHIPPING_TAXES_DISCLAIMER,
        paymentTerms: '100% Pre-payment via Bank Wire Transfer prior to dispatch',
        marketingBenefits: [
          'Access to African Boy Master Asset Cloud',
          'Official stockist listing on website',
        ],
        artistDisclaimer: LEGAL_ARTIST_DISCLAIMER,
        internalNotes: 'Applicant has 3 luxury stores in Nairobi malls.',
        expiryDate: '2026-11-30',
        status: 'Draft',
      });

      expect(offer.id).toBeDefined();
      expect(offer.offerReference).toMatch(/^AB-OFFER-/);
      expect(offer.status).toBe('Draft');

      const retrieved = await wholesaleProgramService.getOfferByApplicationId('app-ke-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.applicantName).toBe('Amina Odhiambo');
      expect(retrieved?.partnershipLevel).toBe('Premium Market Agent');
      expect(retrieved?.isExclusive).toBe(true);
    });

    it('supports recording applicant acceptance with signatory details', async () => {
      const offer = await wholesaleProgramService.saveOffer({
        applicationId: 'app-ug-002',
        applicantName: 'David Mukasa',
        businessName: 'Kampala Trends Ltd',
        partnershipLevel: 'Wholesale Reseller',
        destinationCountry: 'Uganda',
        destinationCity: 'Kampala',
        territory: 'Kampala',
        isExclusive: false,
        currency: 'TZS',
        proposedItems: [],
        totalUnits: 30,
        merchandiseSubtotal: 1050000,
        confirmedShippingRate: null,
        shippingTerms: 'Ex Works Dar es Salaam',
        shippingDisclaimer: SHIPPING_TAXES_DISCLAIMER,
        paymentTerms: 'Pre-payment',
        marketingBenefits: [],
        artistDisclaimer: LEGAL_ARTIST_DISCLAIMER,
        expiryDate: '2026-12-31',
        status: 'Draft',
      });

      const acceptRes = await wholesaleProgramService.recordOfferAcceptance(
        offer.id,
        'David Mukasa (Managing Director)',
        'Signed commercial proposal countersigned via email scan on Oct 16.'
      );

      expect(acceptRes.success).toBe(true);

      const updatedOffer = await wholesaleProgramService.getOfferByApplicationId(offer.applicationId);
      expect(updatedOffer?.status).toBe('Accepted');
      expect(updatedOffer?.acceptedBySignature).toBe('David Mukasa (Managing Director)');
      expect(updatedOffer?.acceptedAt).toBeDefined();
    });

    it('keeps application review, recording acceptance, and agent activation as distinct sequential steps', async () => {
      // Step 1: Submit application
      const appRes = await agentService.submitApplication({
        full_name: 'Grace Mutua',
        email: 'grace@mombasafashion.co.ke',
        phone_number: '+254 722 998877',
        country_code: 'KE',
        country_name: 'Kenya',
        city: 'Mombasa',
        proposed_territory_details: 'Coast Province',
        preferred_business_model: 'Wholesale Reseller',
        requested_categories: ['T-Shirt', 'Caps'],
        terms_accepted: true,
        privacy_accepted: true,
      });

      expect(appRes.success).toBe(true);
      const appId = 'app-ke-901';

      // Step 2: Generate Commercial Offer (Draft)
      const offer = await wholesaleProgramService.saveOffer({
        applicationId: appId,
        applicantName: 'Grace Mutua',
        businessName: 'Mombasa Coastal Boutique',
        partnershipLevel: 'Wholesale Reseller',
        destinationCountry: 'Kenya',
        destinationCity: 'Mombasa',
        territory: 'Coast Province',
        isExclusive: false,
        currency: 'USD',
        proposedItems: [],
        totalUnits: 30,
        merchandiseSubtotal: 390,
        confirmedShippingRate: null,
        shippingTerms: 'Ex Works Dar es Salaam',
        shippingDisclaimer: SHIPPING_TAXES_DISCLAIMER,
        paymentTerms: 'Bank wire prior to dispatch',
        marketingBenefits: ['Lookbook asset pack'],
        artistDisclaimer: LEGAL_ARTIST_DISCLAIMER,
        expiryDate: '2026-12-15',
        status: 'Sent',
      });

      expect(offer.status).toBe('Sent');

      // Step 3: Record Acceptance
      await wholesaleProgramService.recordOfferAcceptance(offer.id, 'Grace Mutua (Owner)');
      const acceptedOffer = await wholesaleProgramService.getOfferByApplicationId(offer.applicationId);
      expect(acceptedOffer?.status).toBe('Accepted');

      // Step 4: Approve and Activate Agent Profile
      const approveRes = await agentService.approveApplication(appId, {
        agentCode: 'AFB-KE-901',
        businessModel: 'Wholesale Reseller',
        assignedTerritory: 'Mombasa Coastal Zone',
        isExclusive: false,
        approvedCategories: ['T-Shirt', 'Caps'],
        wholesaleDiscountPercent: 30,
        commissionRate: 0,
        moq: 30,
        currency: 'USD',
        paymentTerms: 'Bank wire prior to dispatch',
      });

      expect(approveRes.success).toBe(true);
      expect(approveRes.agentProfile?.status).toBe('active');

      // Verify offer is activated and linked to the new agent profile
      const activatedOffer = await wholesaleProgramService.getOfferByApplicationId(offer.applicationId);
      expect(activatedOffer?.status).toBe('Activated');
      expect(activatedOffer?.agentId).toBe(approveRes.agentProfile?.id);
    });
  });

  // ============================================================================
  // 5. MARKETING BENEFITS & MANDATORY ARTIST LEGAL NOTICE
  // ============================================================================
  describe('5. Marketing Benefits & Artist Appearance Legal Terms', () => {
    it('provides editable marketing benefit tiers across digital assets, campaigns, brand pages, and activations', () => {
      const benefits = DEFAULT_MARKETING_BENEFITS;
      expect(benefits['Digital Marketing Assets']).toBeDefined();
      expect(benefits['Campaign Coordination']).toBeDefined();
      expect(benefits['Brand-Page Features']).toBeDefined();
      expect(benefits['Local Activations']).toBeDefined();
      expect(benefits['Artist-Led Promotional Opportunities']).toBeDefined();
    });

    it('enforces that artist visits and appearances strictly require explicit approval and a separate written agreement', () => {
      expect(LEGAL_ARTIST_DISCLAIMER).toContain('not guaranteed');
      expect(LEGAL_ARTIST_DISCLAIMER).toContain('separate written agreement');
      expect(LEGAL_ARTIST_DISCLAIMER).toContain('talent management approval');
    });
  });
});
