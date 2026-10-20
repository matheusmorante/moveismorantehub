import { describe, expect, it } from 'vitest';
import {
  isAuthorizedFiscalDocument,
  isOutboundFiscalDocument,
  newestFirst,
  productionFirst,
} from '../fiscalDocumentPredicates';
import {
  resolveFiscalOperationBadge,
  resolveOrderFiscalDevolucaoBadge,
  resolveOrderFiscalEstornoBadge,
} from '../operationBadgeRules';
import { resolveReturnFiscalBadgeStatus } from '../returnBadgeRules';
import {
  buildFiscalSituationContext,
  classifyDocumentRegularization,
  getEstornoConfirmedDocumentIds,
  resolveEnvironmentBadge,
  resolveOrderFiscalBadgeStatus,
} from '../orderFiscalSituationClassifier';
import {
  findDocumentIdByStatus,
  resolveCancellationDocuments,
  resolveOrderCancellationState,
} from '../orderFiscalCancellationRules';

describe('orderFiscalBadge submodules', () => {
  describe('fiscalDocumentPredicates', () => {
    it('identifica documentos autorizados e homologados', () => {
      expect(isAuthorizedFiscalDocument({ order_id: '1', status: 'autorizada' })).toBe(true);
      expect(isAuthorizedFiscalDocument({ order_id: '1', status: 'homologada' })).toBe(true);
      expect(isAuthorizedFiscalDocument({ order_id: '1', status: 'cancelada' })).toBe(false);
      expect(isAuthorizedFiscalDocument({ order_id: '1', status: 'erro' })).toBe(false);
    });

    it('identifica documentos de saída por padrão', () => {
      expect(isOutboundFiscalDocument({ order_id: '1', status: 'autorizada' })).toBe(true);
      expect(isOutboundFiscalDocument({ order_id: '1', status: 'autorizada', document_type: 'outbound' })).toBe(true);
      expect(isOutboundFiscalDocument({ order_id: '1', status: 'autorizada', document_type: 'estorno' })).toBe(false);
      expect(isOutboundFiscalDocument({ order_id: '1', status: 'autorizada', document_type: 'return' })).toBe(false);
    });

    it('ordena por data mais recente e prioridade de produção', () => {
      const docHml = { order_id: '1', status: 'autorizada', ambiente: 2, created_at: '2026-10-20T10:00:00Z' };
      const docProd = { order_id: '1', status: 'autorizada', ambiente: 1, created_at: '2026-10-20T09:00:00Z' };
      expect(productionFirst(docProd, docHml)).toBeLessThan(0);
      expect(productionFirst(docHml, docProd)).toBeGreaterThan(0);
      expect(newestFirst(docProd, docHml)).toBeGreaterThan(0);
    });
  });

  describe('operationBadgeRules', () => {
    it('deriva badge de estorno a partir de rascunho e documento autorizado', () => {
      const drafts = [
        {
          id: 'draft-1',
          original_document_id: 'doc-1',
          operation_kind: 'estorno' as const,
          status: 'ready',
          environment: 2,
        },
      ];
      const estornoBadge = resolveOrderFiscalEstornoBadge([], drafts);
      expect(estornoBadge.estornoStatus).toBe('prepared');
      expect(estornoBadge.estornoDraftId).toBe('draft-1');

      const docs = [
        {
          id: 'estorno-doc',
          order_id: 'order-1',
          status: 'homologada',
          document_type: 'estorno',
          ambiente: 2,
        },
      ];
      const confirmedBadge = resolveOrderFiscalEstornoBadge(docs, drafts);
      expect(confirmedBadge.estornoStatus).toBe('issued');
      expect(confirmedBadge.estornoDocumentId).toBe('estorno-doc');
    });

    it('deriva badge de devolução', () => {
      const returnBadge = resolveOrderFiscalDevolucaoBadge([
        {
          id: 'nfd-1',
          order_id: 'order-1',
          status: 'autorizada',
          document_type: 'return',
          ambiente: 1,
        },
      ]);
      expect(returnBadge.devolucaoStatus).toBe('issued');
      expect(returnBadge.devolucaoDocumentId).toBe('nfd-1');
    });
  });

  describe('returnBadgeRules', () => {
    it('resolve status consolidado de devolução', () => {
      expect(resolveReturnFiscalBadgeStatus([])).toBeUndefined();
      expect(
        resolveReturnFiscalBadgeStatus([
          { id: '1', order_id: 'o1', status: 'autorizada', document_type: 'return' },
          { id: '2', order_id: 'o1', status: 'autorizada', document_type: 'return' },
        ])
      ).toBe('issued');
      expect(
        resolveReturnFiscalBadgeStatus([
          { id: '1', order_id: 'o1', status: 'autorizada', document_type: 'return' },
          { id: '2', order_id: 'o1', status: 'cancelada', document_type: 'return' },
        ])
      ).toBe('mixed');
    });
  });

  describe('orderFiscalSituationClassifier & cancellationRules', () => {
    it('classifica regularização e cancelamento com sucesso', () => {
      const doc = {
        id: 'doc-1',
        order_id: 'order-1',
        status: 'autorizada',
        ambiente: 1,
        cancellationEventStatus: 'registered',
      };
      const context = buildFiscalSituationContext([doc], [], true, []);
      const classified = classifyDocumentRegularization(doc, context);
      expect(classified.state).toBe('confirmed');
      expect(classified.via).toBe('cancel');

      const state = resolveOrderCancellationState([doc], [], true, Date.now());
      expect(state).toBeUndefined();

      const docId = findDocumentIdByStatus([doc], 'cancelled', new Set());
      expect(docId).toBe('doc-1');
    });
  });
});
