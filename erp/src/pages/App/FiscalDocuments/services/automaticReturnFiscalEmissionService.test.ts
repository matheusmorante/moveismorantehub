import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftPayload, ReturnFiscalEligibility } from '../types/fiscalOperationDraft.types';
import {
  createFiscalOperationDraft,
  fetchReturnFiscalEligibility,
  loadFiscalOperationDraft,
  saveFiscalOperationDraftReview,
  transmitFiscalOperationDraft,
} from './fiscalOperationDraftService';
import { buildFiscalOperationDraftReviewState } from '../utils/fiscalOperationDraftReview';
import {
  automaticallyTransmitReturnFiscalDocuments,
  getAutomaticReturnFiscalEmissionNotice,
} from './automaticReturnFiscalEmissionService';

vi.mock('./fiscalOperationDraftService', () => ({
  createFiscalOperationDraft: vi.fn(),
  fetchReturnFiscalEligibility: vi.fn(),
  loadFiscalOperationDraft: vi.fn(),
  saveFiscalOperationDraftReview: vi.fn(),
  transmitFiscalOperationDraft: vi.fn(),
}));

vi.mock('../utils/fiscalOperationDraftReview', () => ({
  buildFiscalOperationDraftReviewState: vi.fn(),
}));

const source = (id: string, ambiente: 1 | 2) => ({
  id,
  order_id: 'sale-order',
  modelo: '55' as const,
  ambiente,
  numero_nfe: 10,
  serie: '1',
  chave_acesso: `${id}-access-key`,
});

const eligibility = (
  overrides: Partial<ReturnFiscalEligibility> = {}
): ReturnFiscalEligibility => ({
  eligible: true,
  returnOrderId: 'return-order',
  linkedSaleOrderId: 'sale-order',
  hasAuthorizedOriginal: true,
  reason: null,
  sources: [
    {
      source: source('source-hml', 2),
      state: 'ready',
      blockReason: null,
      draftId: null,
      returnDocumentId: null,
      allocatedItems: [],
    },
  ],
  ...overrides,
});

const draft = (id: string, ambiente: 1 | 2): DraftPayload => {
  const sourceId = id === 'draft-hml' ? 'source-hml' : 'source-prod';
  return ({
    draft: {
      id,
      operation_kind: 'return',
      status: 'draft',
      environment: ambiente,
      original_access_key: `${sourceId}-access-key`,
    },
    source: source(sourceId, ambiente),
    returnOrder: {
      id: 'return-order',
      orderIndex: 800001,
      returnMethod: 'CLIENT_DELIVERED',
      operationContext: {
        issuerUf: 'PR',
        recipientUf: 'PR',
        scope: 'internal',
        returnMethod: 'CLIENT_DELIVERED',
        recipientFiscalStatus: 'non_taxpayer',
        isFinalConsumer: true,
        taxRegime: '1',
      },
    },
    lines: [
      {
        id: 'draft-line',
        fiscal_item_number: 1,
        quantity: 1,
        gross_value: 100,
        discount_value: 0,
        originalDescription: 'Produto sintético',
        originalProductCode: 'SKU-TEST',
        originalQuantity: 1,
        originalGrossValue: 100,
        originalDiscountValue: 0,
        originalProductXml: '<prod></prod>',
        originalTaxesXml: '<imposto></imposto>',
        suggestedCfop: '1202',
        allowedCfops: [{ value: '1202', label: 'Devolução interna' }],
      },
    ],
    reviewTemplate: {
      recipient_xml: '<dest></dest>',
      totals_xml: '<total></total>',
      transport_xml: '<transp></transp>',
      payment_xml: '<pag></pag>',
    },
  }) as DraftPayload;
};

const reviewState = {
  reviewedLines: [
    {
      draft_line_id: 'draft-line',
      cfop: '1202',
      product_xml: '<prod></prod>',
      taxes_xml: '<imposto></imposto>',
    },
  ],
  review: {
    nature_of_operation: 'Devolução de mercadoria',
    reason: '',
    recipient_xml: '<dest></dest>',
    totals_xml: '<total></total>',
    transport_xml: '<transp></transp>',
    payment_xml: '<pag></pag>',
    item_taxes_confirmed: false,
    totals_confirmed: false,
    apportionment_review_confirmed: false,
    period_adjustment_text: '',
  },
  error: null,
  notice: '',
};

describe('transmissão automática da NF-e de devolução', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createFiscalOperationDraft).mockResolvedValue({ draftId: 'draft-hml' });
    vi.mocked(loadFiscalOperationDraft).mockResolvedValue(draft('draft-hml', 2));
    vi.mocked(saveFiscalOperationDraftReview).mockResolvedValue({ status: 'ready' });
    vi.mocked(transmitFiscalOperationDraft).mockResolvedValue({ success: true });
    vi.mocked(buildFiscalOperationDraftReviewState).mockImplementation((payload) => ({
      ...reviewState,
      reviewedLines: reviewState.reviewedLines.map((line) => ({
        ...line,
        draft_line_id: payload.lines[0].id,
      })),
    }));
  });

  it('não cria nem transmite NFD quando a venda vinculada não tem nota autorizada', async () => {
    vi.mocked(fetchReturnFiscalEligibility).mockResolvedValue(
      eligibility({
        eligible: false,
        hasAuthorizedOriginal: false,
        sources: [],
        reason: 'NF-e de saída autorizada não encontrada.',
      })
    );

    await expect(automaticallyTransmitReturnFiscalDocuments('return-order')).resolves.toEqual({
      status: 'not-required',
      authorizedDocuments: 0,
      pendingDocuments: 0,
      failedDocuments: 0,
    });
    expect(createFiscalOperationDraft).not.toHaveBeenCalled();
    expect(transmitFiscalOperationDraft).not.toHaveBeenCalled();
  });

  it('prepara, valida e transmite cada documento fiscal de origem de forma independente', async () => {
    vi.mocked(fetchReturnFiscalEligibility).mockResolvedValue(
      eligibility({
        sources: [
          {
            source: source('source-hml', 2),
            state: 'ready',
            blockReason: null,
            draftId: null,
            returnDocumentId: null,
            allocatedItems: [],
          },
          {
            source: source('source-prod', 1),
            state: 'draft',
            blockReason: null,
            draftId: 'draft-prod',
            returnDocumentId: null,
            allocatedItems: [],
          },
        ],
      })
    );
    vi.mocked(createFiscalOperationDraft)
      .mockResolvedValueOnce({ draftId: 'draft-hml' });
    vi.mocked(loadFiscalOperationDraft)
      .mockResolvedValueOnce(draft('draft-hml', 2))
      .mockResolvedValueOnce(draft('draft-prod', 1));

    const result = await automaticallyTransmitReturnFiscalDocuments('return-order');

    expect(result).toEqual({
      status: 'authorized',
      authorizedDocuments: 2,
      pendingDocuments: 0,
      failedDocuments: 0,
    });
    expect(createFiscalOperationDraft).toHaveBeenCalledWith({
      kind: 'return',
      originalDocumentId: 'source-hml',
      returnOrderId: 'return-order',
      environment: 2,
    });
    expect(saveFiscalOperationDraftReview).toHaveBeenCalledTimes(2);
    expect(transmitFiscalOperationDraft).toHaveBeenNthCalledWith(1, {
      draftId: 'draft-hml',
      productionConfirmed: false,
    });
    expect(transmitFiscalOperationDraft).toHaveBeenNthCalledWith(2, {
      draftId: 'draft-prod',
      productionConfirmed: true,
    });
  });

  it('não retransmite tentativa incerta nem repete automaticamente quando a SEFAZ não confirma', async () => {
    vi.mocked(fetchReturnFiscalEligibility).mockResolvedValue(eligibility());
    vi.mocked(transmitFiscalOperationDraft).mockResolvedValue({
      pending: true,
      reconciliationRequired: true,
    });

    const result = await automaticallyTransmitReturnFiscalDocuments('return-order');

    expect(result.status).toBe('pending');
    expect(transmitFiscalOperationDraft).toHaveBeenCalledTimes(1);
    expect(getAutomaticReturnFiscalEmissionNotice(result)?.message).toContain(
      'nenhuma tentativa incerta será repetida automaticamente'
    );
  });

  it('para a emissão automática quando CFOP exige revisão fiscal', async () => {
    vi.mocked(fetchReturnFiscalEligibility).mockResolvedValue(eligibility());
    vi.mocked(buildFiscalOperationDraftReviewState).mockReturnValue({
      ...reviewState,
      error: 'O CFOP exige revisão manual.',
    });

    const result = await automaticallyTransmitReturnFiscalDocuments('return-order');

    expect(result.status).toBe('failed');
    expect(result.failedDocuments).toBe(1);
    expect(saveFiscalOperationDraftReview).not.toHaveBeenCalled();
    expect(transmitFiscalOperationDraft).not.toHaveBeenCalled();
  });

  it('mantém a nota já autorizada e informa falha parcial de outro documento', async () => {
    vi.mocked(fetchReturnFiscalEligibility).mockResolvedValue(
      eligibility({
        sources: [
          {
            source: source('source-hml', 2),
            state: 'authorized',
            blockReason: null,
            draftId: null,
            returnDocumentId: 'return-document',
            allocatedItems: [],
          },
          {
            source: source('source-prod', 1),
            state: 'blocked',
            blockReason: 'Revisão tributária necessária.',
            draftId: null,
            returnDocumentId: null,
            allocatedItems: [],
          },
        ],
      })
    );

    const result = await automaticallyTransmitReturnFiscalDocuments('return-order');

    expect(result).toEqual({
      status: 'partial',
      authorizedDocuments: 1,
      pendingDocuments: 0,
      failedDocuments: 1,
    });
    expect(transmitFiscalOperationDraft).not.toHaveBeenCalled();
    expect(getAutomaticReturnFiscalEmissionNotice(result)?.message).toContain('1 NF-e(s)');
  });
});
