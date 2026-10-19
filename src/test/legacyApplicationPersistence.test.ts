import { beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({
  row: { id: 'af14441c-f515-4d86-aa3d-7b3eb05697c1', application_reference: 'ABA-2026-LOS21', preferred_business_model: 'Wholesale Reseller', status: 'Submitted', internal_notes: 'Original note' },
  readError: null as { message: string } | null,
  writeError: null as { message: string } | null,
  patch: null as any,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => {
    let updating = false;
    const chain = {
      select: () => chain,
      eq: () => chain,
      update: vi.fn((patch) => { updating = true; backend.patch = patch; return chain; }),
      single: async () => updating
        ? { data: backend.writeError ? null : { ...backend.row, ...backend.patch }, error: backend.writeError }
        : { data: backend.readError ? null : backend.row, error: backend.readError },
    };
    return chain;
  },
} }));
import { agentService } from '@/services/agentService';

describe('Database-only legacy review actions', () => {
  beforeEach(() => { localStorage.clear(); backend.patch = null; backend.readError = null; backend.writeError = null; });
  it('assesses a saved UUID applicant absent from browser cache', async () => {
    const result = await agentService.transitionLegacyApplication(backend.row.id, 'assessed_for_distributor');
    expect(result.success).toBe(true);
    expect(result.application?.preferred_business_model).toBe('Country Distributor');
    expect(backend.patch.programme_transition_action).toBe('assessed_for_distributor');
    expect(result.application?.internal_notes).toContain('Original note');
  });
  it('persists the information-request status', async () => {
    const result = await agentService.transitionLegacyApplication(backend.row.id, 'more_info_requested');
    expect(result.application?.status).toBe('More Information Required');
    expect(backend.patch.programme_transition_action).toBe('more_info_requested');
  });
  it('retains the saved legacy model and status', async () => {
    const result = await agentService.transitionLegacyApplication(backend.row.id, 'legacy_retained');
    expect(result.application?.preferred_business_model).toBe('Wholesale Reseller');
    expect(result.application?.status).toBe('Submitted');
    expect(backend.patch.programme_transition_action).toBe('legacy_retained');
  });
  it('does not cache or report success when a write is denied', async () => {
    backend.writeError = { message: 'permission denied' };
    const result = await agentService.transitionLegacyApplication(backend.row.id, 'legacy_retained');
    expect(result).toEqual({ success: false, error: 'permission denied' });
    const cached = JSON.parse(localStorage.getItem('ab_agent_applications_cache') || '[]');
    expect(cached.some((app: { id: string }) => app.id === backend.row.id)).toBe(false);
  });
  it('does not update when the saved application cannot be read', async () => {
    backend.readError = { message: 'Application not found' };
    expect((await agentService.transitionLegacyApplication(backend.row.id, 'legacy_retained')).success).toBe(false);
    expect(backend.patch).toBeNull();
  });
});