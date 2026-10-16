import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { agentService } from '../services/agentService';
import { getCountryByCode, getAllCountries } from '../data/internationalCountries';
import type { AgentProfile, Product, OrderItem } from '../types';

describe('AFRICAN BOY GLOBAL AGENT PROGRAM - Comprehensive Unit & Workflow Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. International Country & Territory Architecture', () => {
    it('provides reusable country dataset covering key African and global markets', () => {
      const countries = getAllCountries();
      expect(countries.length).toBeGreaterThanOrEqual(15);

      const tanzania = getCountryByCode('TZ');
      expect(tanzania).toBeDefined();
      expect(tanzania?.currencyCode).toBe('TZS');
      expect(tanzania?.dialCode).toBe('+255');
      expect(tanzania?.regions.length).toBeGreaterThan(0);

      const kenya = getCountryByCode('KE');
      expect(kenya?.currencyCode).toBe('KES');
      expect(kenya?.dialCode).toBe('+254');

      const nigeria = getCountryByCode('NG');
      expect(nigeria?.currencyCode).toBe('NGN');
      expect(nigeria?.dialCode).toBe('+234');

      const uk = getCountryByCode('GB');
      expect(uk?.currencyCode).toBe('GBP');
    });
  });

  describe('2. Agent Application Workflow & Storage', () => {
    it('submits an application securely, generates unique reference with country prefix, and stores status Submitted', async () => {
      const result = await agentService.submitApplication({
        user_id: 'test-user-123',
        full_name: 'Juma Hassan',
        email: 'juma@streetweartz.com',
        phone_number: '+255711223344',
        country_code: 'TZ',
        country_name: 'Tanzania',
        city: 'Mwanza',
        preferred_language: 'sw',
        business_name: 'Lake Zone Drip Store',
        business_type: 'Retail Store',
        years_of_experience: '3-5 years',
        requested_categories: ['T-Shirt', 'Caps', 'Footwear'],
        preferred_business_model: 'Wholesale Reseller',
        proposed_territory_details: 'Lake Zone (Mwanza, Bukoba)',
        expected_monthly_sales: '150 - 300 units',
        estimated_initial_investment: '$5,000 USD',
        preferred_sales_channels: ['Retail Storefront'],
        terms_accepted: true,
        privacy_accepted: true,
      });

      expect(result.success).toBe(true);
      expect(result.applicationReference).toMatch(/^ABA-2026-TZ[A-Z0-9]+$/);

      const applications = await agentService.getApplications();
      const submitted = applications.find(a => a.application_reference === result.applicationReference);
      expect(submitted).toBeDefined();
      expect(submitted?.status).toBe('Submitted');
      expect(submitted?.requested_categories).toEqual(['T-Shirt', 'Caps', 'Footwear']);
      expect(submitted?.preferred_business_model).toBe('Wholesale Reseller');
    });

    it('filters applications by status, country, and search query', async () => {
      const apps = await agentService.getApplications();
      expect(apps.length).toBeGreaterThan(0);

      // Search by country
      const kenyaApps = await agentService.getApplications({ countryCode: 'KE' });
      expect(kenyaApps.every(a => a.country_code === 'KE')).toBe(true);

      // Search by text
      const searchRes = await agentService.getApplications({ searchQuery: 'David Mwangi' });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0].full_name).toBe('David Mwangi');
    });

    it('updates application status with internal administrative notes', async () => {
      const apps = await agentService.getApplications();
      const target = apps[0];

      await agentService.updateApplicationStatus(
        target.id,
        'Under Review',
        'Vetting background verified through Westlands Chamber of Commerce.'
      );

      const updatedApps = await agentService.getApplications();
      const updated = updatedApps.find(a => a.id === target.id);
      expect(updated?.status).toBe('Under Review');
      expect(updated?.internal_notes).toContain('Vetting background verified');
    });

    it('handles requesting additional information from applicant', async () => {
      const apps = await agentService.getApplications();
      const target = apps[0];

      await agentService.updateApplicationStatus(
        target.id,
        'More Information Required',
        'Awaiting tax identification and lease agreement.',
        'Please upload your business registration and physical lease agreement.'
      );

      const updatedApps = await agentService.getApplications();
      const updated = updatedApps.find(a => a.id === target.id);
      expect(updated?.status).toBe('More Information Required');
      expect(updated?.admin_feedback_to_applicant).toBe('Please upload your business registration and physical lease agreement.');
    });
  });

  describe('3. Admin Approval & Commercial Configuration', () => {
    it('approves application and provisions agent profile with commercial terms', async () => {
      const apps = await agentService.getApplications();
      const target = apps[0];

      const approval = await agentService.approveApplication(target.id, {
        agentCode: 'AG-KE-009',
        businessModel: 'Wholesale Reseller',
        assignedTerritory: 'Nairobi & Coast Region',
        isExclusive: true,
        approvedCategories: ['T-Shirt', 'Caps'],
        wholesaleDiscountPercent: 30,
        commissionRate: 0,
        moq: 20,
        currency: 'KES',
        paymentTerms: 'Pre-payment',
      });

      expect(approval.success).toBe(true);
      expect(approval.agentProfile).toBeDefined();
      expect(approval.agentProfile?.agent_code).toBe('AG-KE-009');
      expect(approval.agentProfile?.is_exclusive).toBe(true);
      expect(approval.agentProfile?.wholesale_discount_percent).toBe(30);
      expect(approval.agentProfile?.minimum_order_quantity).toBe(20);

      // Verify application status updated to Approved
      const updatedApps = await agentService.getApplications();
      const appRecord = updatedApps.find(a => a.id === target.id);
      expect(appRecord?.status).toBe('Approved');
    });

    it('updates commercial terms for existing agent profile', async () => {
      const profiles = await agentService.getAllAgentProfiles();
      const targetAgent = profiles[0];

      await agentService.updateCommercialTerms(targetAgent.id, {
        wholesale_discount_percent: 35,
        minimum_order_quantity: 25,
        assigned_territory: 'Northern & Central Zone',
      });

      const updatedProfiles = await agentService.getAllAgentProfiles();
      const updated = updatedProfiles.find(p => p.id === targetAgent.id);
      expect(updated?.wholesale_discount_percent).toBe(35);
      expect(updated?.minimum_order_quantity).toBe(25);
      expect(updated?.assigned_territory).toBe('Northern & Central Zone');
    });
  });

  describe('4. Agent Catalogue & Price Computation', () => {
    const mockProducts: Product[] = [
      {
        id: 'prod-tee-1',
        name: 'AFB Heavyweight T-Shirt',
        price: 50000,
        category: 'T-Shirt',
        image_url: 'https://example.com/tee.jpg',
        description: 'Cotton tee',
        stock_quantity: 100,
        sizes: ['M', 'L', 'XL'],
        colors: [{ name: 'Black', hex: '#000' }],
      },
      {
        id: 'prod-hood-1',
        name: 'African Boy Luxury Hoodie',
        price: 120000,
        category: 'Hoods',
        image_url: 'https://example.com/hoodie.jpg',
        description: 'Luxury hoodie',
        stock_quantity: 40,
        sizes: ['M', 'L'],
        colors: [{ name: 'Black', hex: '#000' }],
      },
    ];

    it('correctly calculates wholesale prices and category permissions', () => {
      const testProfile: AgentProfile = {
        id: 'agent-calc-1',
        user_id: 'user-1',
        agent_code: 'AG-TZ-050',
        full_name: 'Test Agent',
        email: 'test@agent.com',
        phone_number: '+255700000000',
        business_model: 'Wholesale Reseller',
        assigned_country_code: 'TZ',
        assigned_country_name: 'Tanzania',
        assigned_territory: 'Dar es Salaam',
        is_exclusive: false,
        approved_categories: ['T-Shirt'], // Only T-Shirt approved
        commission_rate: 0,
        wholesale_discount_percent: 30, // 30% discount
        minimum_order_quantity: 10,
        minimum_initial_purchase: 0,
        currency: 'TZS',
        payment_terms: 'Pre-payment',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const enriched = agentService.getAgentProducts(mockProducts, testProfile);
      expect(enriched.length).toBe(2);

      const tee = enriched.find(p => p.id === 'prod-tee-1')!;
      expect(tee.isCategoryApproved).toBe(true);
      expect(tee.agentWholesalePrice).toBe(35000); // 50,000 * 0.70 = 35,000
      expect(tee.agentMarginPercent).toBe(30);

      const hoodie = enriched.find(p => p.id === 'prod-hood-1')!;
      expect(hoodie.isCategoryApproved).toBe(false); // Not approved category
    });

    it('correctly calculates commission amounts for Commission-Based Agents', () => {
      const commissionProfile: AgentProfile = {
        id: 'agent-comm-1',
        user_id: 'user-2',
        agent_code: 'AG-UG-010',
        full_name: 'Uganda Agent',
        email: 'ug@agent.com',
        phone_number: '+256700000000',
        business_model: 'Commission-Based Agent',
        assigned_country_code: 'UG',
        assigned_country_name: 'Uganda',
        assigned_territory: 'Kampala',
        is_exclusive: false,
        approved_categories: ['T-Shirt', 'Hoods'],
        commission_rate: 15, // 15% commission
        wholesale_discount_percent: 0,
        minimum_order_quantity: 5,
        minimum_initial_purchase: 0,
        currency: 'UGX',
        payment_terms: 'Commission Payout',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const enriched = agentService.getAgentProducts(mockProducts, commissionProfile);
      const tee = enriched.find(p => p.id === 'prod-tee-1')!;
      expect(tee.agentCommissionAmount).toBe(7500); // 50,000 * 0.15 = 7,500
    });
  });

  describe('5. Stock Replenishment Orders & MOQ Enforcement', () => {
    it('enforces Minimum Order Quantity (MOQ) on replenishment creation', async () => {
      const testProfile: AgentProfile = {
        id: 'agent-moq-1',
        user_id: 'user-1',
        agent_code: 'AG-TZ-050',
        full_name: 'Test Agent',
        email: 'test@agent.com',
        phone_number: '+255700000000',
        business_model: 'Wholesale Reseller',
        assigned_country_code: 'TZ',
        assigned_country_name: 'Tanzania',
        assigned_territory: 'Dar es Salaam',
        is_exclusive: false,
        approved_categories: ['T-Shirt'],
        commission_rate: 0,
        wholesale_discount_percent: 30,
        minimum_order_quantity: 20, // MOQ is 20
        minimum_initial_purchase: 0,
        currency: 'TZS',
        payment_terms: 'Pre-payment',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const itemsUnderMOQ: OrderItem[] = [
        { product_id: '1', name: 'AFB Tee', price: 35000, quantity: 5 }, // Only 5 units
      ];

      const failResult = await agentService.createReplenishmentOrder(
        testProfile,
        itemsUnderMOQ,
        'Test Address'
      );
      expect(failResult.success).toBe(false);
      expect(failResult.error).toContain('is below the minimum order quantity of 20 units');

      // Now with 20 units
      const validItems: OrderItem[] = [
        { product_id: '1', name: 'AFB Tee', price: 35000, quantity: 20 },
      ];
      const successResult = await agentService.createReplenishmentOrder(
        testProfile,
        validItems,
        'Kariakoo Store Hub, Dar es Salaam',
        'Deliver via priority freight'
      );
      expect(successResult.success).toBe(true);
      expect(successResult.order?.order_number).toMatch(/^ARO-2026-[A-Z0-9]+$/);
      expect(successResult.order?.total_amount).toBe(35000 * 20); // strictly excludes shipping
      expect(successResult.order?.shipping_fee).toBe(0);
      expect(successResult.order?.notes).toContain('Shipping is not included and will be arranged and charged separately.');
    });
  });

  describe('6. Reports and Summary Analytics', () => {
    it('generates non-fabricated reports from stored transactions', async () => {
      const reports = await agentService.getReportsSummary();
      expect(reports.totalApplications).toBeGreaterThanOrEqual(1);
      expect(reports.applicationsByStatus).toBeDefined();
      expect(reports.approvedAgentsByCountry).toBeDefined();
      expect(reports.agentsByBusinessModel).toBeDefined();
      expect(reports.totalReplenishmentOrders).toBeGreaterThanOrEqual(0);
      expect(typeof reports.replenishmentOrderValue).toBe('number');
      expect(typeof reports.outstandingBalance).toBe('number');
    });
  });
});
