import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BecomeAnAgent from '../pages/BecomeAnAgent';
import AgentApplicationModal from '../components/agent/AgentApplicationModal';
import Footer from '../components/Footer';
import { CountryProvider } from '../context/CountryContext';
import { CartProvider } from '../context/CartContext';

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
      expect(screen.getByRole('heading', { name: /REPRESENT AFRICAN BOY IN YOUR COUNTRY/i })).toBeInTheDocument();

      // Required supporting copy
      expect(
        screen.getByText(/Join the African Boy global network. Represent the brand, sell our collections, and grow your business in your market/i)
      ).toBeInTheDocument();

      // Primary and secondary CTAs
      expect(screen.getByRole('button', { name: /BECOME AN AGENT/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /EXPLORE THE OPPORTUNITY/i })).toBeInTheDocument();
    });

    it('renders all 3 operating business models with descriptions', () => {
      renderWithProviders(<BecomeAnAgent />);

      expect(screen.getByRole('heading', { name: /Wholesale Reseller/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Commission-Based Agent/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Country Distributor/i })).toBeInTheDocument();
    });

    it('renders FAQ section and expands items on click', () => {
      renderWithProviders(<BecomeAnAgent />);

      const faqQuestion = screen.getByText(/Who can apply to become an authorized African Boy Agent or Distributor\?/i);
      expect(faqQuestion).toBeInTheDocument();

      fireEvent.click(faqQuestion);
      expect(screen.getByText(/We welcome established boutique owners, experienced fashion retailers/i)).toBeInTheDocument();
    });
  });

  describe('2. Multi-Step Application Modal Wizard', () => {
    it('renders Step 1 applicant contact form and validates required fields', () => {
      renderWithProviders(
        <AgentApplicationModal isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByText(/Step 1: Applicant Contact & Identity/i)).toBeInTheDocument();
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
        expect(screen.getByText(/Step 2: Commercial & Business Experience/i)).toBeInTheDocument();
      });

      // Advance to Step 3
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

      // Step 3 Preferences
      await waitFor(() => {
        expect(screen.getByText(/Step 3: Product Lines & Operating Model/i)).toBeInTheDocument();
        expect(screen.getByText(/T-Shirts \(Heavyweight & Graphic Tees\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Caps & Headwear/i)).toBeInTheDocument();
        expect(screen.getByText(/Shoes & Footwear/i)).toBeInTheDocument();
        expect(screen.getByText(/Mixed Catalog \(Full Collection\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Dedicated Footer Component', () => {
    it('renders footer with Become an Agent prompt and brand credentials', () => {
      const onNavigateMock = vi.fn();
      renderWithProviders(<Footer onNavigate={onNavigateMock} />);

      expect(screen.getByRole('heading', { name: /Represent African Boy In Your Market/i })).toBeInTheDocument();
      const becomeAgentBtns = screen.getAllByRole('button', { name: /Become an Agent/i });
      expect(becomeAgentBtns.length).toBeGreaterThan(0);

      fireEvent.click(becomeAgentBtns[0]);
      expect(onNavigateMock).toHaveBeenCalledWith('become-an-agent');
    });
  });
});
