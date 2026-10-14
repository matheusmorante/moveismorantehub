// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NcmManagementPanel } from './NcmManagementPanel';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), rows: [] as Record<string, unknown>[] }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'administrator' } }) }));
vi.mock('@/services/fiscal/ncmService', () => ({ ncmService: { searchNcms: vi.fn() } }));
beforeEach(() => {
  mocks.rows = [];
  mocks.rpc.mockReset().mockImplementation(async (name) => ({ data: name === 'list_ncm_catalog_for_admin' ? { items: mocks.rows, total: mocks.rows.length } : {}, error: null }));
});
afterEach(cleanup);
const row = { code: '94035000', official_description: 'Móveis de madeira', active: true, is_active: true, start_date: null, end_date: null, legal_act: null, changed_at: null, product_count: 0, is_unverified: false };

describe('NCM form owners', () => {
  it('passes the validated catalog filters to the query', async () => {
    render(<NcmManagementPanel />);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('list_ncm_catalog_for_admin', expect.objectContaining({ p_search: '', p_store_filter: 'active', p_filter: 'all', p_offset: 0 })));
    fireEvent.click(screen.getByRole('button', { name: 'Desativados' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('list_ncm_catalog_for_admin', expect.objectContaining({ p_store_filter: 'inactive', p_offset: 0 })));
  });
  it('blocks a malformed NCM before the activation service', async () => {
    mocks.rows = [{ ...row, code: '9403' }];
    render(<NcmManagementPanel />);
    await waitFor(() => expect(screen.getAllByText('Desativar na loja').length).toBeGreaterThan(0));
    await act(async () => fireEvent.click(screen.getAllByText('Desativar na loja')[0]));
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'set_ncm_store_activation')).toHaveLength(0);
    expect(screen.getByText(/8 dígitos/)).toBeTruthy();
  });
  it('passes the selected NCM and boolean through the resolver before activation', async () => {
    mocks.rows = [row];
    render(<NcmManagementPanel />);
    await waitFor(() => expect(screen.getAllByText('Desativar na loja').length).toBeGreaterThan(0));
    await act(async () => fireEvent.click(screen.getAllByText('Desativar na loja')[0]));
    expect(mocks.rpc).toHaveBeenCalledWith('set_ncm_store_activation', { p_code: '94035000', p_is_active: false });
  });
});
