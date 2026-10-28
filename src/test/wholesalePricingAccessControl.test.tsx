import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BecomeAnAgent from '../pages/BecomeAnAgent';
import WholesalePricingPage from '../pages/WholesalePricingPage';
import WholesalePricingEnquiryModal from '../components/agent/WholesalePricingEnquiryModal';
import AgentManager from '../components/admin/AgentManager';
import { wholesaleProgramService } from '../services/wholesaleProgramService';
import { agentService } from '../services/agentService';
import { CountryProvider } from '../context/CountryContext';
import { CartProvider } from '../context/CartContext';
import type { WholesalePricingEnquiry } from '../types';
import { supabase } from '../integrations/supabase/client';

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <CountryProvider>
      <CartProvider>{ui}</CartProvider>
    </CountryProvider>
  );
};

describe('AFRICAN BOY — WHOLESALE PRICING ACCESS CONTROL & AGENT QUALIFICATION', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: null }, error: null } as any);
    vi.spyOn(supabase, 'rpc').mockImplementation(((fn: string) => {
      if (fn === 'submit_wholesale_pricing_enquiry') {
        return Promise.resolve({ data: { access_token: '11111111-1111-4111-8111-111111111111', enquiry_reference: 'WPE-2026-10001', access_token_expires_at: new Date(Date.now() + 864e5).toISOString(), status: 'New Enquiry' }, error: null });
      }
      return Promise.resolve({ data: { valid: false }, error: null });
    }) as any);
  });

  describe('1. Public Wholesale Landing Page (/become-an-agent)', () => {
    it('restricts public access to detailed wholesale unit prices', () => {
      renderWithProviders(<BecomeAnAgent />);

      // Verify raw unit prices are NOT exposed to unauthenticated public visitors
      expect(screen.queryByText(/TZS 35,000 per unit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/TZS 30,000 per unit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/TZS 18,000 per unit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/35,000 TZS/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/30,000 TZS/i)).not.toBeInTheDocument();
    });

    it('renders distributor expansion highlights and required qualification CTAs', () => {
      renderWithProviders(<BecomeAnAgent />);

      // Required headline / expansion focus
      expect(screen.getByRole('heading', { name: /COUNTRY DISTRIBUTOR PROGRAMME/i })).toBeInTheDocument();

      // Commercial overview and logistics pillars
      expect(screen.getByText(/Commercial Wholesale Price Overview/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Dual Fulfillment Channels/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/African Boy Caps/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Enquiry Required/i).length).toBeGreaterThanOrEqual(1);

      // Two primary actions required:
      // 1. BECOME AN AGENT (or APPLY AS COUNTRY DISTRIBUTOR)
      expect(screen.getByRole('button', { name: /BECOME AN AGENT · APPLY AS COUNTRY DISTRIBUTOR/i })).toBeInTheDocument();
      // 2. REQUEST WHOLESALE PRICING
      const requestButtons = screen.getAllByRole('button', { name: /REQUEST WHOLESALE PRICING/i });
      expect(requestButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('opens the enquiry modal when clicking REQUEST WHOLESALE PRICING', async () => {
      renderWithProviders(<BecomeAnAgent />);

      const requestButton = screen.getAllByRole('button', { name: /REQUEST WHOLESALE PRICING/i })[0];
      fireEvent.click(requestButton);

      expect(screen.getByRole('heading', { name: /REQUEST WHOLESALE PRICING/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Unlock African Boy Wholesale Pricing/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Request Wholesale Pricing Enquiry Form', () => {
    it('renders all required form fields, options, and consent checkbox', () => {
      renderWithProviders(
        <WholesalePricingEnquiryModal isOpen={true} onClose={vi.fn()} />
      );

      // Required fields
      expect(screen.getByPlaceholderText(/e\.g\. David Mwangi/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/partner@boutique\.co\.tz/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/712 345 678/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Serengeti Streetwear Ltd/i)).toBeInTheDocument();

      // Consent checkbox
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText(/I acknowledge and agree that the submitted information may be used by African Boy/i)).toBeInTheDocument();
    });

    it('validates required fields and consent before submitting', async () => {
      renderWithProviders(
        <WholesalePricingEnquiryModal isOpen={true} onClose={vi.fn()} />
      );

      // Try submitting empty
      const submitBtn = screen.getByRole('button', { name: /UNLOCK WHOLESALE PRICING/i });
      fireEvent.click(submitBtn);

      // Should prompt for full name
      expect(screen.getByText(/Full legal name is required/i)).toBeInTheDocument();
    });

    it('successfully submits enquiry, saves lead record, and displays post-submission confirmation', async () => {
      const handleSuccess = vi.fn();
      renderWithProviders(
        <WholesalePricingEnquiryModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={handleSuccess}
        />
      );

      // Fill valid information
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. David Mwangi/i), {
        target: { value: 'Fatima Al-Mansoor' },
      });
      fireEvent.change(screen.getByPlaceholderText(/partner@boutique\.co\.tz/i), {
        target: { value: 'fatima@uae-streetwear.ae' },
      });
      fireEvent.change(screen.getByPlaceholderText(/712 345 678/i), {
        target: { value: '501234567' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Serengeti Streetwear Ltd/i), {
        target: { value: 'Dubai Urban Fashion LLC' },
      });

      // Consent
      fireEvent.click(screen.getByRole('checkbox'));

      // Submit
      const submitBtn = screen.getByRole('button', { name: /UNLOCK WHOLESALE PRICING/i });
      fireEvent.click(submitBtn);

      // Wait for success screen
      await waitFor(() => {
        expect(screen.getByText(/YOUR WHOLESALE ENQUIRY HAS BEEN RECEIVED/i)).toBeInTheDocument();
      });

      // Verify required confirmation copy
      expect(
        screen.getByText(/Thank you for your interest in African Boy\. You can now access our standard wholesale pricing schedule/i)
      ).toBeInTheDocument();

      // Verify "VIEW WHOLESALE PRICES" button
      expect(screen.getByRole('button', { name: /VIEW WHOLESALE PRICES/i })).toBeInTheDocument();
    });
  });

  describe('3. Controlled Wholesale Pricing Access Flow & Token Verification', () => {
    it('denies access to unauthenticated visitors without an enquiry token', async () => {
      // Clear token
      wholesaleProgramService.clearActivePricingToken();

      renderWithProviders(
        <WholesalePricingPage />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /WHOLESALE PRICING ACCESS REQUIRED/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/Commercial wholesale unit prices and volume discount schedules are reserved for qualified retailers/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /REQUEST PRICING ACCESS/i })).toBeInTheDocument();
    });

    it('grants access when visitor has a valid unexpired access token', async () => {
      // Submit a lead first
      const submitResult = await wholesaleProgramService.submitPricingEnquiry({
        fullName: 'Kofi Mensah',
        businessEmail: 'kofi@accra-lux.gh',
        phoneNumber: '+233241234567',
        country: 'Ghana',
        businessName: 'Accra Streetwear Boutique',
        businessType: 'Retailer',
        estimatedOrderQuantity: '1,000 - 2,499 pieces (Distributor Opening MOQ)',
        consentAcknowledged: true,
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.accessToken).toBeDefined();

      // Store active token
      wholesaleProgramService.setActivePricingToken(submitResult.accessToken);

      renderWithProviders(
        <WholesalePricingPage />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /STANDARD WHOLESALE PRICE SCHEDULE/i })).toBeInTheDocument();
      });

      // Authorized schedule shows authoritative pricing rules
      expect(screen.getByText(/African Boy Heavyweight T-Shirts/i)).toBeInTheDocument();
      expect(screen.getByText(/TZS 35,000/i)).toBeInTheDocument();
      expect(screen.getByText(/TZS 30,000/i)).toBeInTheDocument();
      expect(screen.getByText(/African Boy Signature Caps/i)).toBeInTheDocument();
      expect(screen.getByText(/TZS 18,000/i)).toBeInTheDocument();

      // Access audit count increased
      const enquiries = await wholesaleProgramService.getWholesaleEnquiries();
      const updated = enquiries.find(e => e.enquiryReference === submitResult.enquiryReference);
      expect(updated?.pricingAccessCount).toBeGreaterThanOrEqual(1);
    });

    it('rejects expired tokens and prompts for renewed enquiry', async () => {
      // Expired token
      const expiredToken = 'expired-test-token-uuid-123';
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const expiredEnquiry: WholesalePricingEnquiry = {
        id: expiredToken,
        enquiryReference: 'WPE-2026-EXP',
        fullName: 'Expired User',
        businessEmail: 'expired@test.com',
        phoneNumber: '+255700000000',
        country: 'Tanzania',
        businessName: 'Expired Co',
        businessType: 'Retailer',
        estimatedOrderQuantity: '300 - 499 pieces',
        consentAcknowledged: true,
        status: 'New Enquiry',
        accessToken: expiredToken,
        accessTokenExpiresAt: pastDate,
        pricingAccessCount: 0,
        createdAt: pastDate,
        updatedAt: pastDate,
      };

      wholesaleProgramService.cacheLocalEnquiry(expiredEnquiry);
      wholesaleProgramService.setActivePricingToken(expiredToken);

      const verification = await wholesaleProgramService.verifyPricingAccessToken(expiredToken);
      expect(verification.valid).toBe(false);
    });
  });

  describe('4. Authoritative Pricing Rules & Minimum Order Invariants', () => {
    it('enforces T-Shirt volume tiers (500-999 @ 35k TZS, 1,000+ @ 30k TZS, <500 requires review)', () => {
      const rules = wholesaleProgramService.getAuthoritativePricingRules();
      expect(rules.tshirts.tier1.minQuantity).toBe(500);
      expect(rules.tshirts.tier1.maxQuantity).toBe(999);
      expect(rules.tshirts.tier1.unitPriceTZS).toBe(35000);

      expect(rules.tshirts.tier2.minQuantity).toBe(1000);
      expect(rules.tshirts.tier2.unitPriceTZS).toBe(30000);

      expect(rules.tshirts.subMinPolicy).toMatch(/requires authorised administrative review/i);
    });

    it('enforces Caps wholesale rules (300+ @ 18k TZS, <300 requires review, counts toward 1,000 MOQ)', () => {
      const rules = wholesaleProgramService.getAuthoritativePricingRules();
      expect(rules.caps.tier1.minQuantity).toBe(300);
      expect(rules.caps.tier1.unitPriceTZS).toBe(18000);
      expect(rules.caps.countsTowardDistributorMoq).toBe(true);
      expect(rules.caps.subMinPolicy).toMatch(/requires authorised review/i);
    });

    it('preserves the 4-collection annual commitment invariant (4,000 pcs total)', () => {
      const rules = wholesaleProgramService.getAuthoritativePricingRules();
      expect(rules.distributorCommitment.collectionsPerYear).toBe(4);
      expect(rules.distributorCommitment.minimumPerCollection).toBe(1000);
      expect(rules.distributorCommitment.annualTotalPieces).toBe(4000);
    });
  });

  describe('5. Prospect Qualification vs. Agent Approval Separation', () => {
    it('confirms that requesting wholesale pricing does not grant approved agent status', async () => {
      const result = await wholesaleProgramService.submitPricingEnquiry({
        fullName: 'Sarah Jenkins',
        businessEmail: 'sarah@retail-uk.co.uk',
        phoneNumber: '+447911123456',
        country: 'United Kingdom',
        businessName: 'London Urban Apparel',
        businessType: 'Distributor',
        estimatedOrderQuantity: '4,000+ pieces (National Distribution)',
        consentAcknowledged: true,
      });

      // Verify enquiry status is New Enquiry, not Approved
      const enquiries = await wholesaleProgramService.getWholesaleEnquiries();
      const enquiry = enquiries.find(e => e.enquiryReference === result.enquiryReference);

      expect(enquiry).toBeDefined();
      expect(enquiry?.status).toBe('New Enquiry');
      expect(enquiry?.status).not.toBe('Approved');
    });
  });

  describe('6. Admin Dashboard Wholesale Enquiries Management', () => {
    beforeEach(() => {
      vi.spyOn(agentService, 'getApplications').mockResolvedValue([]);
      vi.spyOn(agentService, 'getAllAgentProfiles').mockResolvedValue([]);
      vi.spyOn(agentService, 'getAllReplenishmentOrders').mockResolvedValue([]);
      vi.spyOn(agentService, 'getAllShippingQuotes').mockResolvedValue([]);
      vi.spyOn(wholesaleProgramService, 'getAllOffers').mockResolvedValue([]);
      vi.spyOn(wholesaleProgramService, 'getCollectionTrackingForDistributor').mockResolvedValue([]);
      vi.spyOn(agentService, 'getReportsSummary').mockResolvedValue({
        totalApplications: 0,
        applicationsByStatus: { Draft: 0, Submitted: 0, 'Under Review': 0, 'More Information Required': 0, Approved: 0, Rejected: 0, Withdrawn: 0 },
        approvedAgentsByCountry: {},
        approvedAgentsByCategory: {},
        agentsByBusinessModel: { 'Wholesale Reseller': 0, 'Commission-Based Agent': 0, 'Country Distributor': 0, 'Premium Market Agent': 0 },
        totalReplenishmentOrders: 0,
        replenishmentOrderValue: 0,
        totalCommissionsEarned: 0,
        estimatedGrossMargin: 0,
        outstandingBalance: 0,
      });
    });

    it('renders the Wholesale Enquiries tab in AgentManager', async () => {
      const mockEnquiries: WholesalePricingEnquiry[] = [
        {
          id: 'enq-001',
          enquiryReference: 'WPE-2026-001',
          fullName: 'Amara Okafor',
          businessEmail: 'amara@lagos-boutique.ng',
          phoneNumber: '+2348012345678',
          country: 'Nigeria',
          businessName: 'Lagos Urban Luxe',
          businessType: 'Retailer',
          estimatedOrderQuantity: '1,000 - 2,499 pieces (Distributor Opening MOQ)',
          consentAcknowledged: true,
          status: 'Pricing Access Granted',
          accessToken: 'token-001',
          accessTokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
          pricingAccessCount: 3,
          pricingAccessedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(wholesaleProgramService, 'getWholesaleEnquiries').mockResolvedValue(mockEnquiries);

      renderWithProviders(<AgentManager />);

      // Find Wholesale Enquiries tab
      const tabButton = await screen.findByRole('button', { name: /Wholesale Enquiries \(1\)/i });
      expect(tabButton).toBeInTheDocument();

      // Click tab
      fireEvent.click(tabButton);

      // Verify enquiries table renders the prospect
      expect(screen.getByText('WPE-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Amara Okafor')).toBeInTheDocument();
      expect(screen.getByText('Lagos Urban Luxe')).toBeInTheDocument();
      expect(screen.getByText('Nigeria')).toBeInTheDocument();
      expect(screen.getByText(/Viewed \(3x\)/i)).toBeInTheDocument();
    });

    it('allows administrators to update enquiry status and add internal notes', async () => {
      const mockEnquiry: WholesalePricingEnquiry = {
        id: 'enq-002',
        enquiryReference: 'WPE-2026-002',
        fullName: 'Chidi Eze',
        businessEmail: 'chidi@eze-ventures.ke',
        phoneNumber: '+254712000000',
        country: 'Kenya',
        businessName: 'Eze Ventures',
        businessType: 'Wholesaler',
        estimatedOrderQuantity: '2,500 - 4,000 pieces (Annual Programme Tier)',
        consentAcknowledged: true,
        status: 'New Enquiry',
        accessToken: 'token-002',
        accessTokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        pricingAccessCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(wholesaleProgramService, 'getWholesaleEnquiries').mockResolvedValue([mockEnquiry]);
      const updateSpy = vi.spyOn(wholesaleProgramService, 'updateEnquiryStatus').mockResolvedValue(true);

      renderWithProviders(<AgentManager />);

      // Open tab
      const tabButton = await screen.findByRole('button', { name: /Wholesale Enquiries/i });
      fireEvent.click(tabButton);

      // Click Review Enquiry
      const reviewButton = await screen.findByRole('button', { name: /Review Enquiry/i });
      fireEvent.click(reviewButton);

      // Modal appears
      expect(screen.getByText(/Wholesale Enquiry Management/i)).toBeInTheDocument();
      expect(screen.getAllByText('Chidi Eze').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Eze Ventures').length).toBeGreaterThanOrEqual(1);

      // Change status to Contacted
      const statusSelect = screen.getByRole('combobox', { name: /Enquiry Status/i });
      fireEvent.change(statusSelect, { target: { value: 'Contacted' } });

      // Add notes
      const notesArea = screen.getByPlaceholderText(/Record call notes, distributor qualifications/i);
      fireEvent.change(notesArea, { target: { value: 'Discussed Nairobi retail distribution plans.' } });

      // Save
      const saveBtn = screen.getByRole('button', { name: /Save Enquiry Updates/i });
      fireEvent.click(saveBtn);

      expect(updateSpy).toHaveBeenCalledWith(
        'enq-002',
        'Contacted',
        'Discussed Nairobi retail distribution plans.'
      );
    });
  });
});
