import { describe, expect, it, vi } from 'vitest';
import { fetchWhatsAppMetaMonthlyUsage, saoPauloMonthStart } from '../../../../../../api/whatsappSupportMetaUsage';

describe('consulta do gasto mensal do WhatsApp', () => {
  it('usa o início do mês de São Paulo, inclusive perto da virada UTC', () => {
    expect(saoPauloMonthStart(new Date('2026-11-01T02:30:00Z')).toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(saoPauloMonthStart(new Date('2026-11-01T03:30:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('soma os valores da Meta e preserva a moeda da conta', async () => {
    const fetchMeta = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      currency: 'USD', pricing_analytics: { data: [{ data_points: [
        { pricing_category: 'SERVICE', cost: 0, volume: 4 },
        { pricing_category: 'MARKETING', cost: 0.42, volume: 3 },
      ] }] },
    }) });
    const usage = await fetchWhatsAppMetaMonthlyUsage({ wabaId: '12345', accessToken: 'secret', fetchMeta,
      now: new Date('2026-11-12T15:00:00Z') });
    expect(usage).toMatchObject({ status: 'available', amount: 0.42, currency: 'USD', delivered: 7,
      period_start: '2026-11-01T03:00:00.000Z' });
    expect(String(fetchMeta.mock.calls[0][0])).not.toContain('secret');
    expect(fetchMeta.mock.calls[0][1].headers.Authorization).toBe('Bearer secret');
  });

  it('não apresenta zero quando a Meta omite o custo de parte dos dados', async () => {
    const fetchMeta = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      currency: 'BRL', pricing_analytics: { data: [{ data_points: [{ volume: 3, cost: 0 }, { volume: 2 }] }] },
    }) });
    const usage = await fetchWhatsAppMetaMonthlyUsage({ wabaId: '12345', accessToken: 'secret', fetchMeta });
    expect(usage).toMatchObject({ status: 'partial', amount: null, currency: 'BRL', delivered: 5 });
  });

  it('não segue paginação para um servidor que não seja a Meta', async () => {
    const fetchMeta = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      currency: 'BRL', pricing_analytics: { data: [], paging: { next: 'https://other.invalid/page' } },
    }) });
    const usage = await fetchWhatsAppMetaMonthlyUsage({ wabaId: '12345', accessToken: 'secret', fetchMeta });
    expect(usage).toMatchObject({ status: 'unavailable', amount: null });
    expect(fetchMeta).toHaveBeenCalledTimes(1);
  });
});
