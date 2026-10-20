import { describe, expect, it } from 'vitest';
import { assembleOrderFiscalBadgeStatuses } from '../badgeSupplementTransformer';
import {
  clearInFlightBadgeRequest,
  getInFlightBadgeRequest,
  setInFlightBadgeRequest,
} from '../orderFiscalBadgeCache';
import type { BadgeDocumentRow, FiscalBadgeSupplement } from '../orderFiscalBadge.types';

describe('orderFiscalBadge modular components', () => {
  describe('orderFiscalBadgeCache', () => {
    it('stores, retrieves and clears in-flight promises', () => {
      const key = 'ord-1,ord-2';
      expect(getInFlightBadgeRequest(key)).toBeUndefined();

      const mockPromise = Promise.resolve({});
      setInFlightBadgeRequest(key, mockPromise);
      expect(getInFlightBadgeRequest(key)).toBe(mockPromise);

      clearInFlightBadgeRequest(key);
      expect(getInFlightBadgeRequest(key)).toBeUndefined();
    });
  });

  describe('assembleOrderFiscalBadgeStatuses', () => {
    it('assembles badges and maps documents and returns correctly', () => {
      const uniqueOrderIds = ['ord-100'];
      const documentRows: BadgeDocumentRow[] = [
        {
          id: 'doc-1',
          order_id: 'ord-100',
          status: 'autorizada',
          ambiente: 2,
          modelo: '55',
          document_type: 'outbound',
        },
      ];
      const supplement: FiscalBadgeSupplement = {
        documents: documentRows,
        returnOrders: [],
        cancellationEvents: [],
        estornoDrafts: [],
        cancelledOrderIds: [],
      };

      const result = assembleOrderFiscalBadgeStatuses(uniqueOrderIds, documentRows, supplement);
      expect(result['ord-100']).toBeDefined();
      expect(result['ord-100'].homologation).toBe('issued');
      expect(result['ord-100'].homologationDocumentId).toBe('doc-1');
      expect(result['ord-100'].devolucaoCount).toBe(0);
    });

    it('identifies return documents and links them to sale orders', () => {
      const uniqueOrderIds = ['sale-1'];
      const documentRows: BadgeDocumentRow[] = [
        {
          id: 'doc-ret-1',
          order_id: 'ret-order-1',
          status: 'autorizada',
          ambiente: 2,
          modelo: '55',
          document_type: 'return',
        },
      ];
      const supplement: FiscalBadgeSupplement = {
        documents: documentRows,
        returnOrders: [
          {
            id: 'ret-order-1',
            order_type: 'return',
            linked_order_id: 'sale-1',
          },
        ],
        cancellationEvents: [],
        estornoDrafts: [],
        cancelledOrderIds: [],
      };

      const result = assembleOrderFiscalBadgeStatuses(uniqueOrderIds, documentRows, supplement);
      expect(result['sale-1'].devolucaoCount).toBe(1);
      expect(result['sale-1'].devolucaoStatus).toBe('issued');
      expect(result['sale-1'].devolucaoDocumentId).toBe('doc-ret-1');
    });
  });
});
