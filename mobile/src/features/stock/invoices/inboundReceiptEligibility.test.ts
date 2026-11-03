import { describe, expect, it } from 'vitest';
import {
  getInboundReceiptBlockedReason,
  type InboundReceiptEligibilityInvoice,
} from '../../../../../shared-utils/inboundReceiptEligibility';

const eligibleInvoice: InboundReceiptEligibilityInvoice = {
  supplierId: 'supplier-1',
  supplierStockOrigins: ['normal'],
  nfeKey: '12345678901234567890123456789012345678901234',
  status: 'pending',
  itemsCount: 1,
  items: [{ quantity: 1, unitCost: 10, matchedProductId: 'product-1' }],
};

describe('inbound receipt eligibility', () => {
  it('permits an authorized, complete invoice with all product links', () => {
    expect(getInboundReceiptBlockedReason(eligibleInvoice, true)).toBeNull();
  });

  it('blocks users without receipt access', () => {
    expect(getInboundReceiptBlockedReason(eligibleInvoice, false)).toContain('acesso');
  });

  it('blocks completed or already linked receipts', () => {
    expect(
      getInboundReceiptBlockedReason({ ...eligibleInvoice, status: 'received' }, true),
    ).toContain('recebimento concluído');
  });

  it('blocks Salvados-only suppliers', () => {
    expect(
      getInboundReceiptBlockedReason(
        { ...eligibleInvoice, supplierStockOrigins: ['salvados'] },
        true,
      ),
    ).toContain('Salvados');
  });

  it('requires commercial XML fields and product mapping for applicable items', () => {
    expect(
      getInboundReceiptBlockedReason({ ...eligibleInvoice, items: [] }, true),
    ).toContain('XML atualizado');
    expect(
      getInboundReceiptBlockedReason(
        {
          ...eligibleInvoice,
          items: [{ quantity: 1, unitCost: 10 }],
        },
        true,
      ),
    ).toContain('Vincule cada item');
  });

  it('accepts explicit not-applicable items and composition links', () => {
    expect(
      getInboundReceiptBlockedReason(
        {
          ...eligibleInvoice,
          items: [{ quantity: 1, unitCost: 10, linkMode: 'not_applicable' }],
        },
        true,
      ),
    ).toBeNull();
    expect(
      getInboundReceiptBlockedReason(
        {
          ...eligibleInvoice,
          items: [
            {
              quantity: 1,
              unitCost: 10,
              linkMode: 'composition',
              compositionLinks: [{ productId: 'component-1' }],
            },
          ],
        },
        true,
      ),
    ).toBeNull();
  });
});
