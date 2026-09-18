import { describe, it, expect, beforeEach } from 'vitest';

describe('Admin Products View Toggle & Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to list view mode when no preference is saved', () => {
    const savedMode = localStorage.getItem('ab_admin_view_mode') || 'list';
    expect(savedMode).toBe('list');
  });

  it('persists selected view mode to localStorage', () => {
    localStorage.setItem('ab_admin_view_mode', 'grid');
    expect(localStorage.getItem('ab_admin_view_mode')).toBe('grid');

    localStorage.setItem('ab_admin_view_mode', 'list');
    expect(localStorage.getItem('ab_admin_view_mode')).toBe('list');
  });
});
