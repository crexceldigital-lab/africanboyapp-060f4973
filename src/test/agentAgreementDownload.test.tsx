import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ download: vi.fn(), error: vi.fn(), user: { id: 'test-agent', email: 'agent@example.org' } }));
vi.mock('@/context/CountryContext', () => ({ useCountry: () => ({ user: mocks.user }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
vi.mock('@/services/agentService', () => ({ agentService: {
  getAgentProfile: async () => ({ id: 'agent', full_name: 'Partner', business_name: 'Partner Shop', agent_code: 'AB-TEST', status: 'active', business_model: 'Wholesale Reseller', approved_categories: [], agreement_reference: null }),
  getAgentReplenishmentOrders: async () => [], getAllShippingQuotes: async () => [], getAgentProducts: () => [],
} }));
vi.mock('@/services/wholesaleProgramService', () => ({ SHIPPING_TAXES_DISCLAIMER: '', wholesaleProgramService: {
  getSettings: async () => ({ enabledCategories: [] }), downloadAgentAgreementPdf: mocks.download,
  calculateQuotation: () => ({ totalUnits: 0, merchandiseSubtotalConverted: 0 }),
} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ order: async () => ({ data: [] }) }) }) } }));
import AgentDashboard from '@/pages/AgentDashboard';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Agent agreement download feedback', () => {
  it('shows a missing saved proposal error without an unhandled rejection', async () => {
    mocks.download.mockRejectedValue(new Error('No saved wholesale proposal exists for this partner.'));
    render(<AgentDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Agreement (PDF)' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('No saved wholesale proposal exists for this partner.'));
    expect(screen.getByRole('button', { name: 'Agreement (PDF)' })).not.toBeDisabled();
  });
  it('awaits a successful download and re-enables the action', async () => {
    mocks.download.mockResolvedValue(undefined);
    render(<AgentDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Agreement (PDF)' }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Agreement (PDF)' })).not.toBeDisabled());
    expect(mocks.error).not.toHaveBeenCalled();
  });
});