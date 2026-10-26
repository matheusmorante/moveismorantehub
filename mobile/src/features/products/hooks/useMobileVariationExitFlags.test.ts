import { describe, expect, it, vi } from 'vitest';
vi.mock('../services/mobileProductExitFlagsService', () => ({
  fetchMobileProductExitFlags: vi.fn(),
}));

import { getMobileProductVariationIds } from './useMobileVariationExitFlags';

describe('getMobileProductVariationIds', () => {
  it('deduplica IDs persistidos e ignora variações virtuais', () => {
    expect(getMobileProductVariationIds([
      {
        allVariations: [
          { id: 'variation-2' },
          { variationId: 'variation-1' },
          { id: 'variation-1' },
          { id: 'virtual-row', isVirtual: true },
        ],
      },
      { variations: [{ id: 'variation-3' }, { id: 'variation-4' }] },
      { allVariations: [{ id: 'single-variation-only' }] },
    ])).toEqual([
      'single-variation-only',
      'variation-1',
      'variation-2',
      'variation-3',
      'variation-4',
    ]);
  });

  it('não usa fallbacks virtuais sem UUID como consulta de movimentação', () => {
    expect(getMobileProductVariationIds([
      { allVariations: [{ id: 'virtual', isVirtual: true }] },
      { allVariations: [{ id: '  ' }] },
    ])).toEqual([]);
  });
});
