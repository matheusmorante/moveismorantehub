import { describe, expect, it } from 'vitest';
import { canGenerateReturn } from './returnPolicy';

describe('geração de devolução', () => {
  it('permite somente venda atendida', () => {
    expect(canGenerateReturn({ orderType: 'sale', status: 'fulfilled' } as any)).toBe(true);
    expect(canGenerateReturn({ orderType: 'sale', status: 'scheduled' } as any)).toBe(false);
    expect(canGenerateReturn({ orderType: 'sale', status: 'cancelled' } as any)).toBe(false);
  });
});
