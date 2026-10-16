// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultSettings } from '@/pages/utils/settings/defaults';
const mocks = vi.hoisted(() => ({ save: vi.fn(), theme: vi.fn(), ready: true, loaded: null as any }));
vi.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: mocks.theme }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, user: { id: 'operator' } }) }));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => getDefaultSettings(), saveSettings: mocks.save,
  subscribeToSettings: (callback: any, options: any) => { callback(getDefaultSettings()); mocks.loaded = options.onRemoteLoad; if (mocks.ready) options.onRemoteLoad({ confirmed: true }); return () => {}; },
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
import Settings from './index';
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); mocks.ready = true; mocks.save.mockResolvedValue({ confirmed: true, cached: true }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const openAppearance = () => fireEvent.change(screen.getByPlaceholderText('Pesquisar por nome ou funcionalidade...'), { target: { value: 'Aparência' } });

describe('settings page with actual appearance child', () => {
  it('saves a parsed theme through the actual page owner and resolver', async () => {
    render(<Settings />); openAppearance();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Escuro' })); });
    expect(mocks.theme).toHaveBeenCalledWith('dark'); expect(mocks.save).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ defaultTheme: 'dark' }), { confirm: true, isCurrent: expect.any(Function) });
    expect(screen.queryByText('Salvando...')).toBeNull();
  });
  it('does not submit settings while remote loading is unknown', async () => {
    mocks.ready = false; render(<Settings />); openAppearance();
    fireEvent.click(screen.getByRole('button', { name: 'Escuro' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1001); }); expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/Confirmando configurações/);
  });
});
