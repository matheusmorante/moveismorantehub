import { describe, expect, it, vi } from 'vitest';

const { select } = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock('../supabaseConfig', () => ({
  supabase: {
    from: () => ({
      select: (columns: string) => {
        select(columns);
        const query: any = {
          eq: () => query,
          order: () => query,
          is: () => query,
          then: (resolve: (value: unknown) => void) => resolve({
            data: [
              { type: 'entry', quantity: 2, unit_cost: 10, status: 'effective' },
              { type: 'entry', quantity: 3, unit_cost: 20, status: 'reversed' },
            ],
            error: null,
          }),
        };
        return query;
      },
    }),
  },
}));

import { getMovingAverageCost } from '../movingAverageCostService';

describe('custo médio após estorno', () => {
  it('consulta o status e exclui do replay a entrada estornada', async () => {
    const result = await getMovingAverageCost('produto-teste');

    expect(select).toHaveBeenCalledWith(expect.stringContaining('status'));
    expect(result).toMatchObject({ quantity: 2, unitCost: 10 });
  });
});
