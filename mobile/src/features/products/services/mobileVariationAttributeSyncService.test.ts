import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import {
  ensureMobileAttributeValue,
  ensureMobileAttributeValues,
} from './variations/mobileVariationAttributeSyncService';
import {
  checkMobileVariationAttributeConflict,
  countMobileParentVariations,
} from './variations/mobileVariationFamilyQueryService';
import { mergeMobileVariationIntoCanonical } from './variations/mobileVariationFamilyMutationService';

const sourceVariationId = '123e4567-e89b-42d3-a456-426614174000';
const targetVariationId = '123e4567-e89b-42d3-a456-426614174001';
const targetParentId = '123e4567-e89b-42d3-a456-426614174002';

describe('mobile variation family modular services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges canonical variation and safely parses returned supplier arrays', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    mocks.from.mockReturnValue({ update });
    mocks.rpc.mockResolvedValue({
      data: { transferredSupplierIds: ['sup-1'], canonicalSupplierIds: ['sup-1', 'sup-2'] },
      error: null,
    });

    const result = await mergeMobileVariationIntoCanonical(sourceVariationId, targetVariationId);
    expect(result).toEqual({
      transferredSupplierIds: ['sup-1'],
      canonicalSupplierIds: ['sup-1', 'sup-2'],
    });
    expect(update).toHaveBeenCalledWith({ active: false, status: 'hidden' });
  });

  it('ensures single canonical attribute and value using shared query/insert path', async () => {
    const chain = (data: unknown[]) => {
      const q: Record<string, unknown> = {
        select: () => q,
        filter: () => q,
        eq: () => q,
        limit: () => Promise.resolve({ data, error: null }),
      };
      return q;
    };

    mocks.from.mockImplementation((table: string) =>
      table === 'attributes'
        ? chain([{ id: 'attr-1', name: 'Cor' }])
        : chain([{ value: 'Freijó' }])
    );

    const ensured = await ensureMobileAttributeValue('cor', 'freijó');
    expect(ensured).toEqual({ name: 'Cor', value: 'Freijó' });
  });

  it('batch-resolves attribute values via lookup_variation_family_attributes RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ index: 0, attributeId: 'attr-1', name: 'Cor', value: 'Cinza' }],
      error: null,
    });

    const list = await ensureMobileAttributeValues([{ name: 'cor', value: 'cinza' }]);
    expect(list).toEqual([{ name: 'Cor', value: 'Cinza' }]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('checks parent count and conflicts without any', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null, count: 2 });
    mocks.from.mockReturnValue({ select: () => ({ eq }) });
    await expect(countMobileParentVariations(targetParentId)).resolves.toBe(2);

    const range = vi.fn().mockResolvedValue({
      data: [{ id: targetVariationId, attributes: [{ name: 'Cor', value: 'Azul' }] }],
      error: null,
    });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ order: () => ({ range }) }) }) });
    await expect(
      checkMobileVariationAttributeConflict(sourceVariationId, targetParentId, [
        { name: 'cor', value: 'azul' },
      ])
    ).resolves.toBe(true);
  });
});
