// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FinanceSettings from './index';
const mocks = vi.hoisted(() => ({ getConfig: vi.fn(), save: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/services/financeService', () => ({ financeService: {
  getRedeConfig: mocks.getConfig, getRedeTransactions: async () => [], updateRedeConfig: mocks.save,
} }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(cleanup);
const blankConfig = { pv: '', client_id: '', client_secret: '', environment: 'sandbox', active: false, anticipation_enabled: false };
beforeEach(() => { vi.clearAllMocks(); mocks.getConfig.mockResolvedValue(blankConfig); mocks.save.mockResolvedValue({}); });
async function renderConfig() {
  const view = render(<FinanceSettings />);
  await screen.findByText('Salvar Alterações');
  return view;
}
describe('Rede configuration resolver', () => {
  it('preserves saving blank credentials while inactive', async () => {
    const view = await renderConfig();
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(blankConfig));
  });
  it('blocks activation without credentials', async () => {
    mocks.getConfig.mockResolvedValue({ ...blankConfig, active: true });
    const view = await renderConfig();
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe Número PV para ativar a integração.'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects invalid environments from persisted configuration', async () => {
    mocks.getConfig.mockResolvedValue({ ...blankConfig, environment: 'invalid' });
    const view = await renderConfig();
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecione um ambiente válido.'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('uses only editable fields and preserves the exact secret', async () => {
    mocks.getConfig.mockResolvedValue({ ...blankConfig, id: 'config-id', created_at: 'old', pv: ' 123 ', client_id: ' client ', client_secret: ' secret ', active: true });
    const view = await renderConfig();
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ ...blankConfig, pv: '123', client_id: 'client', client_secret: ' secret ', active: true }));
  });
  it('shows a load failure and blocks saving unknown config, without displaying provider secrets', async () => {
    mocks.getConfig.mockRejectedValue(new Error('credential-detail-must-remain-private'));
    const view = await renderConfig();
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar');
    await act(async () => { fireEvent.submit(view.container.querySelector('form')!); });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain('credential-detail-must-remain-private');
  });
});
