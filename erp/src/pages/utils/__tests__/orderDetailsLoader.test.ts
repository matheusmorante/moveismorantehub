import { describe, expect, it, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../orderSearchQueries', () => ({ fetchOrderById: mocks.fetch }));
import { loadCompleteOrder } from '../orderDetailsLoader';

describe('leitura completa antes de usar um resumo de pedido', () => {
  beforeEach(() => mocks.fetch.mockReset());
  it('compartilha apenas a consulta em andamento e conserva snapshots fiscais do detalhe', async () => {
    let resolve!: (value: any) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const summary: any = { id: 'order-1', __orderSummary: true, items: [{ description: 'Mesa' }] };
    const first = loadCompleteOrder(summary), second = loadCompleteOrder(summary);
    expect(first).toBe(second);
    const full: any = { id: summary.id, items: [{ description: 'Mesa', fiscal: { ncm: '94036000' } }] };
    resolve(full);
    expect(await first).toBe(full);
    mocks.fetch.mockResolvedValueOnce({ ...full, updatedAt: 'current' });
    expect(await loadCompleteOrder(summary)).toMatchObject({ updatedAt: 'current' });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('uma consulta negada impede a ação; um objeto completo não é rebaixado a resumo', async () => {
    mocks.fetch.mockResolvedValueOnce(null);
    await expect(loadCompleteOrder({ id: 'denied', __orderSummary: true } as any)).rejects.toThrow('pedido completo');
    const full: any = { id: 'full', items: [] };
    expect(await loadCompleteOrder(full)).toBe(full);
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });
});
