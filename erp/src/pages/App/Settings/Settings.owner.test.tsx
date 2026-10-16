// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultSettings } from '@/pages/utils/settings/defaults';
const mocks = vi.hoisted(() => ({ write: vi.fn(), theme: vi.fn(), ready: true }));
vi.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: mocks.theme }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, user: { id: 'operator' } }) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => {
  let row: unknown;
  const query = { upsert: (value: unknown) => { row = value; return query; }, select: () => query, eq: () => query,
    single: () => row ? mocks.write(row) : mocks.ready ? Promise.resolve({ data: { id: 'app', data: getDefaultSettings() }, error: null }) : new Promise(() => {}),
  };
  return query;
} } }));
import { getSettings } from '@/pages/utils/settingsService';
import Settings from './index';
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); localStorage.clear(); mocks.ready = true; mocks.write.mockImplementation(async (row) => ({ data: row, error: null, status: 200 })); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const openAppearance = () => fireEvent.change(screen.getByPlaceholderText('Pesquisar por nome ou funcionalidade...'), { target: { value: 'Aparência' } });

describe('settings page with actual appearance child', () => {
  it('saves a parsed theme through the actual page owner and resolver', async () => {
    await act(async () => { render(<Settings />); }); openAppearance();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Escuro' })); });
    expect(mocks.theme).toHaveBeenCalledWith('dark'); expect(mocks.write).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    expect(mocks.write).toHaveBeenCalledWith({ id: 'app', data: expect.objectContaining({ defaultTheme: 'dark' }) });
    expect(getSettings().defaultTheme).toBe('dark');
    expect(screen.queryByText('Salvando...')).toBeNull();
  });
  it('does not submit settings while remote loading is unknown', async () => {
    mocks.ready = false; render(<Settings />); openAppearance();
    fireEvent.click(screen.getByRole('button', { name: 'Escuro' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1001); }); expect(mocks.write).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/Confirmando configurações/);
  });
});
