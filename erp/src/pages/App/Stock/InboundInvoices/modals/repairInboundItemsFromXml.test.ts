import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

const mocks = vi.hoisted(() => ({
  parseInboundNfeXml: vi.fn(),
}));

vi.mock('@/pages/utils/inboundNfe/inboundXmlParser', () => ({
  parseInboundNfeXml: mocks.parseInboundNfeXml,
}));

import { repairInboundItemsFromXml } from './repairInboundItemsFromXml';

const baseInvoice: InboundInvoice = {
  id: 'inv-1',
  nfeNumber: '123',
  nfeKey: 'key-1',
  series: '1',
  issuedAt: '2026-10-16',
  emitterCnpj: '00000000000100',
  emitterName: 'Fornecedor',
  recipientCnpj: '11111111000111',
  recipientName: 'Morante',
  totalProducts: 100,
  totalFreight: 0,
  totalIpi: 0,
  totalInvoice: 100,
  itemsCount: 1,
  status: 'pending',
  rawXml: '<nfe/>',
  items: [
    {
      itemNumber: 1,
      productCode: 'COD-1',
      productDescription: 'Item sem descrição',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      ncm: '94036000',
      cfop: '1102',
      unit: 'UN',
      linkMode: 'single',
      matchedProductId: 'prod-1',
      matchedVariationId: 'var-1',
      productErpName: 'Mesa Carvalho',
      linkedProductCode: 'SKU-1',
    },
  ],
};

describe('repairInboundItemsFromXml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('repairs missing description and zero costs while keeping saved link metadata', () => {
    mocks.parseInboundNfeXml.mockReturnValue({
      items: [
        {
          itemNumber: 1,
          productCode: 'COD-1',
          productDescription: 'Mesa Jantar XML',
          quantity: 1,
          unitCost: 120,
          totalCost: 120,
          ncm: '94036000',
          cfop: '1102',
          unit: 'UN',
        },
      ],
    });

    const repaired = repairInboundItemsFromXml(baseInvoice);
    expect(repaired.items[0]).toMatchObject({
      productDescription: 'Mesa Jantar XML',
      unitCost: 120,
      linkMode: 'single',
      matchedProductId: 'prod-1',
      matchedVariationId: 'var-1',
      productErpName: 'Mesa Carvalho',
      linkedProductCode: 'SKU-1',
    });
  });

  it('skips XML parsing when all items already have valid description and cost', () => {
    const validInvoice: InboundInvoice = {
      ...baseInvoice,
      items: [{ ...baseInvoice.items[0], productDescription: 'Mesa ok', unitCost: 50, totalCost: 50 }],
    };

    const result = repairInboundItemsFromXml(validInvoice);
    expect(result).toBe(validInvoice);
    expect(mocks.parseInboundNfeXml).not.toHaveBeenCalled();
  });

  it('warns and returns original invoice if rawXml parsing throws', () => {
    mocks.parseInboundNfeXml.mockImplementation(() => {
      throw new Error('XML malformado');
    });

    const result = repairInboundItemsFromXml(baseInvoice);
    expect(result).toBe(baseInvoice);
    expect(console.warn).toHaveBeenCalledOnce();
  });
});
