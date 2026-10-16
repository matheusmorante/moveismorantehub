// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApiConfigEditModal from './ApiConfigEditModal';
import type { ApiConfiguration } from '@/services/apiMonitoring/apiMonitoringTypes';
const mocks = vi.hoisted(() => ({ save: vi.fn(), clear: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/services/apiMonitoring/apiConfigService', () => ({ ApiConfigService: { saveConfiguration: mocks.save } }));
vi.mock('@/services/apiMonitoring/apiUsageGuard', () => ({ ApiUsageGuard: { clearCache: mocks.clear } }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success, error: mocks.error } }));
const config: ApiConfiguration = { service_id: 'custom-api', provider: 'other', service_name: 'API A', metric: 'images', billing_unit: 'img', monthly_limit: 0, warning_threshold: 70, critical_threshold: 90, hard_limit: 95, block_on_hard_limit: false, criticality: 'OPTIONAL', price_per_unit: 0.0001, free_allowance: 0, currency: 'BRL', circuit_breaker_max_per_minute: 5, enabled: false };
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup(value = config) {
  const onSaved = vi.fn(), onClose = vi.fn();
  const view = render(<ApiConfigEditModal config={value} isOpen onSaved={onSaved} onClose={onClose} />);
  return { ...view, onSaved, onClose, submit: () => fireEvent.submit(view.container.querySelector('form')!) };
}
describe('API configuration resolver owner', () => {
  it('preserves zero limits, inactive state, sub-cent unit costs and the existing five-call limit', async () => {
    const view = setup();
    view.submit();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(config));
    expect(mocks.clear).toHaveBeenCalledWith(config.service_id);
    expect(view.onSaved).toHaveBeenCalledOnce();
    expect(view.onClose).toHaveBeenCalledOnce();
  });
  it('shows invalid persisted values through the resolver without crashing render', async () => {
    const view = setup({ ...config, monthly_limit: -1 });
    view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('maior ou igual a zero'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('blocks an invalid threshold or a fractional request count', async () => {
    const view = setup({ ...config, warning_threshold: 101 });
    view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('entre 1 e 100'));
    view.unmount();
    const second = setup({ ...config, circuit_breaker_max_per_minute: 1.5 });
    second.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('número inteiro'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not invalidate the guard cache, close or claim success on a rejected save', async () => {
    mocks.save.mockRejectedValue({ code: '42501', message: 'private-provider-detail' });
    const view = setup();
    view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível salvar'));
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(view.onClose).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain('private-provider-detail');
  });
  it('holds the save lock before validation and prevents closing a pending write', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = () => resolve(true); }));
    const view = setup();
    view.submit(); view.submit();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(view.onClose).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(view.onClose).toHaveBeenCalledOnce();
  });
  it('does not act on the second API after a response for the previous owner', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = () => resolve(true); }));
    const view = setup();
    view.submit();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    view.rerender(<ApiConfigEditModal config={{ ...config, service_id: 'second', service_name: 'API B' }} isOpen onSaved={view.onSaved} onClose={view.onClose} />);
    await act(async () => { finish(); });
    expect(view.onSaved).not.toHaveBeenCalled();
    expect(view.onClose).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(screen.getByText('API B')).toBeTruthy();
  });
  it('releases progress on timeout and blocks replay of the uncertain save', async () => {
    vi.useFakeTimers();
    mocks.save.mockReturnValue(new Promise(() => {}));
    const view = setup();
    await act(async () => { view.submit(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Consulte a configuração');
    view.submit();
    expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('does not start a write after closing during resolver validation', async () => {
    const view = setup();
    view.submit();
    view.rerender(<ApiConfigEditModal config={config} isOpen={false} onSaved={view.onSaved} onClose={view.onClose} />);
    await act(async () => {});
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
