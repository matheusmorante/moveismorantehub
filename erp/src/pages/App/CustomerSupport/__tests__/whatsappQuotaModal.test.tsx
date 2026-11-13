// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ getQuota: vi.fn(), getDetails: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => ({
  fetchCustomerSupportWhatsAppSendQuota: mocks.getQuota,
  fetchCustomerSupportWhatsAppUsageDetails: mocks.getDetails,
}));

import { NavigationRailFooter } from '../components/navigationRail/NavigationRailFooter';

const quota = { allowed: true, reservation_id: null, minute_limit: 10, minute_used: 2, minute_remaining: 8,
  hour_limit: 50, hour_used: 11, hour_remaining: 39, day_attempts: 15, day_sent: 8, day_failed: 4,
  day_uncertain: 1, day_start: '2026-11-12T03:00:00Z', remaining_percent: 78, retry_after_seconds: 0 };

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('detalhes da cota de mensagens', () => {
  it('abre pelo indicador, mostra o progresso e informa quando o custo não foi retornado', async () => {
    mocks.getQuota.mockResolvedValue(quota);
    mocks.getDetails.mockResolvedValue({ quota, metaUsage: { status: 'partial', amount: null, currency: null,
      delivered: 12, period_start: '2026-11-01T03:00:00Z', as_of: '2026-11-12T15:00:00Z',
      message: 'A Meta não informou o custo completo.' } });
    render(<MemoryRouter><NavigationRailFooter /></MemoryRouter>);
    const button = screen.getByRole('button', { name: /detalhes da cota/i });
    await waitFor(() => expect(button.textContent).toBe('78%'));
    const progressArc = button.querySelector('svg circle:nth-of-type(2)');
    expect(Number(progressArc?.getAttribute('stroke-dashoffset'))).toBeCloseTo(2 * Math.PI * 14 * 0.22);
    fireEvent.click(button);
    const dialog = await screen.findByRole('dialog', { name: 'Cota de mensagens' });
    await waitFor(() => expect(screen.getByText('A Meta não informou o custo completo.')).toBeTruthy());
    expect(screen.getByRole('progressbar', { name: 'Última hora' }).getAttribute('aria-valuenow')).toBe('11');
    expect(screen.getByText('Sem limite diário · Brasília')).toBeTruthy();
    expect(screen.getByText('12 mensagens entregues no período.')).toBeTruthy();
    expect(dialog.textContent).toContain('Aceitas pela Meta');
    expect(dialog.textContent).not.toContain('R$ 0,00');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
