import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BecomeAnAgent from '../pages/BecomeAnAgent';
import AgentApplicationModal from '../components/agent/AgentApplicationModal';
import Footer from '../components/Footer';
import { CountryProvider } from '../context/CountryContext';
import { CartProvider } from '../context/CartContext';

import Home from '../pages/Home';
import AgentManager from '../components/admin/AgentManager';
import { agentService } from '../services/agentService';
import { wholesaleProgramService } from '../services/wholesaleProgramService';

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <CountryProvider>
      <CartProvider>{ui}</CartProvider>
    </CountryProvider>
  );
};

describe('AFRICAN BOY GLOBAL AGENT PROGRAM - UI & Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Public Recruitment Landing Page (/become-an-agent)', () => {
    it('renders hero section with exact required headline and CTA buttons', () => {
      renderWithProviders(<BecomeAnAgent />);

      // Required headline
      expect(screen.getByRole('heading', { name: /COUNTRY DISTRIBUTOR PROGRAMME/i })).toBeInTheDocument();

      // Required supporting copy
      expect(
        screen.getAllByText(/Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections/i)[0]
      ).toBeInTheDocument();

      // Primary and secondary CTAs
      expect(screen.getAllByRole('button', { name: /APPLY AS COUNTRY DISTRIBUTOR/i })[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /PROGRAMME REQUIREMENTS/i })).toBeInTheDocument();
    });

    it('renders authoritative programme pillars and commitments', () => {
      renderWithProviders(<BecomeAnAgent />);

      expect(screen.getAllByText(/12-Month Contract/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/4 Annual Collections/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/4,000 Pcs Annual Minimum/i)[0]).toBeInTheDocument();
    });

    it('renders FAQ section and expands items on click', () => {
      renderWithProviders(<BecomeAnAgent />);

      const faqQuestion = screen.getByText(/What is the annual collection commitment and order policy\?/i);
      expect(faqQuestion).toBeInTheDocument();

      fireEvent.click(faqQuestion);
      expect(screen.getAllByText(/The 1,000-piece requirement applies to EACH new collection/i)[0]).toBeInTheDocument();
    });
  });

  describe('2. Multi-Step Application Modal Wizard', () => {
    it('renders Step 1 applicant contact form and validates required fields', () => {
      renderWithProviders(
        <AgentApplicationModal isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByText(/Step 1: Principal Applicant Information/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. David Mwangi/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/partner@example\.com/i)).toBeInTheDocument();
    });

    it('advances through steps with valid inputs and renders category choices in Step 3', async () => {
      renderWithProviders(
        <AgentApplicationModal isOpen={true} onClose={vi.fn()} />
      );

      // Fill Step 1
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. David Mwangi/i), { target: { value: 'Amina Kimaro' } });
      fireEvent.change(screen.getByPlaceholderText(/partner@example\.com/i), { target: { value: 'amina@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/712 345 678/i), { target: { value: '755123456' } });
      fireEvent.change(screen.getByPlaceholderText(/Nairobi, Lagos, London/i), { target: { value: 'Arusha' } });

      // Click Next Step
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByText(/Step 2: Business Capability & Financial Capacity/i)).toBeInTheDocument();
      });

      // Fill Step 2 required fields
      fireEvent.change(screen.getByPlaceholderText(/Savannah Streetwear Ltd/i), { target: { value: 'Kilimanjaro Apparel Ltd' } });
      fireEvent.change(screen.getByPlaceholderText(/Detail your sales staff/i), { target: { value: '3 storefront locations and 200 sqm warehouse in Arusha' } });
      fireEvent.change(screen.getByPlaceholderText(/Explain how you will fund and sell at least 1,000 pieces per collection/i), { target: { value: 'Comprehensive 1-year retail expansion strategy across northern Tanzania' } });
      fireEvent.change(screen.getByPlaceholderText(/stating your available liquid capital/i), { target: { value: '$100,000 USD secured facility' } });

      // Advance to Step 3
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

      // Step 3 Preferences
      await waitFor(() => {
        expect(screen.getByText(/Step 3: Programme Terms & 4-Collection Commitment/i)).toBeInTheDocument();
        expect(screen.getByText(/T-Shirts \(Heavyweight & Graphic Tees\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Caps & Headwear/i)).toBeInTheDocument();
        expect(screen.getByText(/Shoes & Footwear \(Phase 2\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Mixed Catalog \(Full Allocation\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Dedicated Footer Component', () => {
    it('renders footer without redundant promotional banner by default while retaining navigation links', () => {
      const onNavigateMock = vi.fn();
      renderWithProviders(<Footer onNavigate={onNavigateMock} />);

      // Banner should not be present by default to prevent duplicate on homepage
      expect(screen.queryByRole('heading', { name: /Represent African Boy In Your Market/i })).not.toBeInTheDocument();

      // Navigation link to become an agent remains intact and functional
      const becomeAgentBtn = screen.getByRole('button', { name: /★ Become an Agent/i });
      expect(becomeAgentBtn).toBeInTheDocument();

      fireEvent.click(becomeAgentBtn);
      expect(onNavigateMock).toHaveBeenCalledWith('become-an-agent');
    });

    it('renders banner when explicitly requested via showAgentBanner prop', () => {
      const onNavigateMock = vi.fn();
      renderWithProviders(<Footer onNavigate={onNavigateMock} showAgentBanner={true} />);

      expect(screen.getByRole('heading', { name: /Represent African Boy In Your Market/i })).toBeInTheDocument();
      const becomeAgentBtns = screen.getAllByRole('button', { name: /Become an Agent/i });
      expect(becomeAgentBtns.length).toBeGreaterThan(0);

      fireEvent.click(becomeAgentBtns[0]);
      expect(onNavigateMock).toHaveBeenCalledWith('become-an-agent');
    });
  });

  describe('4. Homepage Hero 3 CTAs & Agent Banner Consolidation', () => {
    it('renders exactly 3 CTA buttons in the hero section and navigates properly', () => {
      const onNavigateMock = vi.fn();
      renderWithProviders(<Home onNavigate={onNavigateMock} />);

      // Hero section contains the 3 CTAs
      const heroHeading = screen.getByRole('heading', { name: /AFRICAN BOY — The Legacy Continues/i });
      const heroSection = heroHeading.closest('section')!;
      expect(heroSection).toBeInTheDocument();

      const shopBtn = within(heroSection).getByRole('button', { name: /SHOP COLLECTION/i });
      const mediaBtn = within(heroSection).getByRole('button', { name: /EXPLORE MEDIA/i });
      const agentBtn = within(heroSection).getByRole('button', { name: /BECOME AN AGENT/i });

      expect(shopBtn).toBeInTheDocument();
      expect(mediaBtn).toBeInTheDocument();
      expect(agentBtn).toBeInTheDocument();

      fireEvent.click(agentBtn);
      expect(onNavigateMock).toHaveBeenCalledWith('become-an-agent');
    });

    it('contains only one dedicated agent promotional banner on the homepage', () => {
      const onNavigateMock = vi.fn();
      renderWithProviders(<Home onNavigate={onNavigateMock} />);

      // Exactly ONE dedicated promotional banner headline
      const bannerHeadings = screen.getAllByRole('heading', { name: /REPRESENT AFRICAN BOY/i });
      expect(bannerHeadings).toHaveLength(1);
      expect(bannerHeadings[0]).toHaveTextContent(/IN YOUR COUNTRY/i);

      // Redundant footer banner headline must not be present
      expect(screen.queryByRole('heading', { name: /Represent African Boy In Your Market/i })).not.toBeInTheDocument();
    });
  });

  describe('5. Agent Application Review Modal UI & Responsive Layout', () => {
    const mockApp = {
      id: 'app-sample-1',
      application_reference: 'ABA-2026-NBO94',
      user_id: null,
      full_name: 'David Mwangi',
      email: 'david.mwangi@africandistro.ke',
      phone_number: '+254712345678',
      country_code: 'KE',
      country_name: 'Kenya',
      city: 'Nairobi',
      preferred_language: 'en',
      business_name: 'Savannah Streetwear Ltd',
      business_type: 'Existing Fashion Business',
      website_or_social: 'https://instagram.com/savannahstreetwear',
      business_address: 'Westlands Commercial Hub, Suite 4B, Nairobi',
      business_registration_number: 'CPR/2023/94821',
      years_of_experience: '3-5 years',
      previous_experience_details: 'Importing and retailing streetwear brands across Nairobi and Mombasa for 4 years.',
      requested_categories: ['T-Shirt', 'Caps', 'Footwear'],
      preferred_business_model: 'Country Distributor' as const,
      proposed_territory_details: 'Nairobi Metropolis and Coast Region',
      expected_monthly_sales: '150 - 300 units',
      estimated_initial_investment: '$5,000 - $10,000 USD',
      preferred_sales_channels: ['Retail Storefront', 'Instagram / WhatsApp Shop', 'Pop-up Events'],
      marketing_activities: 'Influencer gifting with top Kenyan creators, pop-up events at Westgate and Alchemist.',
      motivation: 'African Boy is the most authentic luxury streetwear brand in East Africa. The demand in Nairobi is immense.',
      status: 'Under Review' as const,
      internal_notes: 'Strong retail background in Westlands. Ready for initial 250 unit distribution order.',
      admin_feedback_to_applicant: null,
      reviewed_by: null,
      reviewed_at: null,
      terms_accepted: true,
      privacy_accepted: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(() => {
      vi.spyOn(agentService, 'getApplications').mockResolvedValue([mockApp]);
      vi.spyOn(agentService, 'getAllAgentProfiles').mockResolvedValue([]);
      vi.spyOn(agentService, 'getAllReplenishmentOrders').mockResolvedValue([]);
      vi.spyOn(agentService, 'getAllShippingQuotes').mockResolvedValue([]);
      vi.spyOn(wholesaleProgramService, 'getAllOffers').mockResolvedValue([]);
      vi.spyOn(wholesaleProgramService, 'getCollectionTrackingForDistributor').mockResolvedValue([]);
      vi.spyOn(wholesaleProgramService, 'getWholesaleEnquiries').mockResolvedValue([]);
      vi.spyOn(agentService, 'getReportsSummary').mockResolvedValue({
        totalApplications: 1,
        applicationsByStatus: { Draft: 0, Submitted: 1, 'Under Review': 0, 'More Information Required': 0, Approved: 0, Rejected: 0, Withdrawn: 0 },
        approvedAgentsByCountry: {},
        approvedAgentsByCategory: {},
        agentsByBusinessModel: { 'Wholesale Reseller': 0, 'Commission-Based Agent': 0, 'Country Distributor': 0, 'Premium Market Agent': 0 },
        totalReplenishmentOrders: 0,
        replenishmentOrderValue: 0,
        totalCommissionsEarned: 0,
        estimatedGrossMargin: 0,
        outstandingBalance: 0,
      });
      vi.spyOn(agentService, 'updateApplicationStatus').mockResolvedValue(true);
    });

    it('renders the redesigned review modal with all required sections, grid layout, and action buttons', async () => {
      renderWithProviders(<AgentManager />);

      // Find and click review button for the first application
      const viewButtons = await screen.findAllByRole('button', { name: /Review/i });
      fireEvent.click(viewButtons[0]);

      // 1. Header
      expect(screen.getByText(/APPLICATION REVIEW ·/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /David Mwangi/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Close application review modal/i)).toBeInTheDocument();

      // 2. Contact info grid
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Country & City')).toBeInTheDocument();
      expect(screen.getByText('Business Model')).toBeInTheDocument();
      expect(screen.getByText('david.mwangi@africandistro.ke')).toBeInTheDocument();
      expect(screen.getByText('+254712345678')).toBeInTheDocument();

      // 3. Business Structure & Categories
      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(/Business Structure/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Requested Categories/i)).toBeInTheDocument();
      expect(within(modal).getByText('T-Shirt')).toBeInTheDocument();
      expect(within(modal).getByText('Caps')).toBeInTheDocument();
      expect(within(modal).getByText('Footwear')).toBeInTheDocument();

      // Social link with external tab security
      const socialLink = screen.getByRole('link', { name: /instagram\.com/i });
      expect(socialLink).toHaveAttribute('target', '_blank');
      expect(socialLink).toHaveAttribute('rel', 'noopener noreferrer');

      // 4. Motivation card
      expect(screen.getByText(/Applicant Motivation/i)).toBeInTheDocument();
      expect(screen.getByText(/African Boy is the most authentic luxury streetwear brand in East Africa/i)).toBeInTheDocument();

      // 5. Internal Review Notes
      expect(screen.getByText(/INTERNAL ADMINISTRATIVE REVIEW NOTES/i)).toBeInTheDocument();
      const notesTextarea = screen.getByPlaceholderText(/Add confidential vetting notes/i);
      expect(notesTextarea).toBeInTheDocument();
      expect(notesTextarea).toHaveValue('Strong retail background in Westlands. Ready for initial 250 unit distribution order.');
      expect(screen.getByRole('button', { name: /SAVE NOTES/i })).toBeInTheDocument();

      // 6. Action Footer in exact order: 1. REQUEST MORE INFO, 2. REJECT APPLICATION, 3. APPROVE & CONFIGURE AGENT
      const requestInfoBtn = screen.getByRole('button', { name: /REQUEST MORE INFO/i });
      const rejectBtn = screen.getByRole('button', { name: /REJECT APPLICATION/i });
      const approveBtn = screen.getByRole('button', { name: /APPROVE & CONFIGURE AGENT/i });

      expect(requestInfoBtn).toBeInTheDocument();
      expect(rejectBtn).toBeInTheDocument();
      expect(approveBtn).toBeInTheDocument();
    });

    it('opens and triggers action workflows from the review modal footer', async () => {
      renderWithProviders(<AgentManager />);

      const viewButtons = await screen.findAllByRole('button', { name: /Review/i });
      fireEvent.click(viewButtons[0]);

      // Click Request More Info -> opens modal
      fireEvent.click(screen.getByRole('button', { name: /REQUEST MORE INFO/i }));
      expect(screen.getByText(/Request Additional Information/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      // Click Reject Application -> opens reject modal
      fireEvent.click(screen.getByRole('button', { name: /REJECT APPLICATION/i }));
      expect(screen.getByRole('heading', { name: /Reject Application/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      // Click Approve & Configure Agent -> opens approval configuration modal
      fireEvent.click(screen.getByRole('button', { name: /APPROVE & CONFIGURE AGENT/i }));
      expect(screen.getByText(/ADMIN AUTHORIZATION/i)).toBeInTheDocument();
    });
  });
});
