import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AutomaticReturnFiscalApiError,
  processAutomaticReturnFiscalJob,
} from '../../../../../../api/nfe/automaticReturnFiscalWorker';
import { isAutomaticReturnWorkerAuthorized } from '../../../../../../api/nfe/automaticReturnWorkerAuthorization';

const returnOrderId = 'a1c1ea7a-53e8-48e8-97c3-c4b445210d4f';
const originalDocumentId = 'a1c1ea7a-53e8-48e8-97c3-c4b445210d4e';
const draftId = 'a1c1ea7a-53e8-48e8-97c3-c4b445210d4d';

afterEach(() => vi.unstubAllEnvs());

describe('automatic return fiscal worker authorization', () => {
  it('accepts only the configured secret and rejects missing or different values', () => {
    vi.stubEnv('NFE_RETURN_AUTO_WORKER_SECRET', 'worker-secret-for-tests');

    expect(isAutomaticReturnWorkerAuthorized('worker-secret-for-tests')).toBe(true);
    expect(isAutomaticReturnWorkerAuthorized(undefined)).toBe(false);
    expect(isAutomaticReturnWorkerAuthorized('another-secret')).toBe(false);
  });
});

describe('processAutomaticReturnFiscalJob', () => {
  it('does not create an NFD when the sale has no authorized original invoice', async () => {
    const request = vi.fn().mockResolvedValue({
      eligible: false,
      hasAuthorizedOriginal: false,
      sources: [],
    });

    await expect(processAutomaticReturnFiscalJob(returnOrderId, request)).resolves.toEqual({
      status: 'not_required',
      errorCode: null,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('prepares and transmits an eligible return using the saved draft review flow', async () => {
    const request = vi.fn(async (path: string, method: string) => {
      if (path.startsWith('/api/nfe/return-fiscal-eligibility')) {
        return {
          eligible: true,
          hasAuthorizedOriginal: true,
          sources: [{ state: 'ready', source: { id: originalDocumentId, ambiente: 2 } }],
        };
      }
      if (path === '/api/nfe/operation-drafts' && method === 'POST') return { draftId };
      if (path === `/api/nfe/operation-drafts?id=${draftId}`) {
        return {
          draft: {
            operation_kind: 'return',
            return_order_id: returnOrderId,
            environment: 2,
            status: 'draft',
          },
          source: { id: originalDocumentId, ambiente: 2 },
          returnOrder: { id: returnOrderId },
          lines: [{ allowedCfops: [{ value: '1202' }] }],
        };
      }
      if (path === '/api/nfe/operation-drafts' && method === 'PUT') return { success: true };
      if (path === '/api/nfe/transmit-operation-draft') {
        return { success: true, status: 'authorized' };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });
    const buildReviewState = vi.fn(() => ({
      reviewedLines: [{ cfop: '1202', draft_line_id: 'line-1', product_xml: '<prod/>', taxes_xml: '<imposto/>' }],
      review: { nature_of_operation: 'Devolução de mercadoria' },
      error: null,
      notice: '',
    }));

    await expect(
      processAutomaticReturnFiscalJob(returnOrderId, request, buildReviewState)
    ).resolves.toEqual({ status: 'authorized', errorCode: null });
    expect(request).toHaveBeenCalledWith(
      '/api/nfe/transmit-operation-draft',
      'POST',
      { draftId, productionConfirmed: false }
    );
  });

  it('reconciles an uncertain SEFAZ transmission instead of creating another draft', async () => {
    const request = vi.fn(async (path: string) => {
      if (path.startsWith('/api/nfe/return-fiscal-eligibility')) {
        return {
          eligible: true,
          hasAuthorizedOriginal: true,
          sources: [{ state: 'pending', draftId, source: { id: originalDocumentId, ambiente: 1 } }],
        };
      }
      if (path === '/api/nfe/transmit-operation-draft') {
        return { pending: true, reconciliationRequired: true };
      }
      if (path === `/api/nfe/operation-drafts?id=${draftId}`) return {
        draft: { operation_kind: 'return', return_order_id: returnOrderId, environment: 1, status: 'unknown' },
        source: { id: originalDocumentId, ambiente: 1 },
        returnOrder: { id: returnOrderId },
      };
      throw new Error(`Unexpected request: ${path}`);
    });

    await expect(processAutomaticReturnFiscalJob(returnOrderId, request)).resolves.toEqual({
      status: 'reconciling',
      errorCode: 'sefaz_reconciliation_pending',
    });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it.each(['environment', 'return', 'source', 'state'])('blocks a pending draft with inconsistent %s before transmission', async (mismatch) => {
    const request = vi.fn(async (path: string) => {
      if (path.startsWith('/api/nfe/return-fiscal-eligibility')) return {
        eligible: true, hasAuthorizedOriginal: true,
        sources: [{ state: 'pending', draftId, source: { id: originalDocumentId, ambiente: 2 } }],
      };
      if (path === `/api/nfe/operation-drafts?id=${draftId}`) return {
        draft: {
          operation_kind: 'return', return_order_id: mismatch === 'return' ? 'different-return' : returnOrderId,
          environment: mismatch === 'environment' ? 1 : 2, status: mismatch === 'state' ? 'ready' : 'unknown',
        },
        source: { id: mismatch === 'source' ? 'different-source' : originalDocumentId, ambiente: 2 },
        returnOrder: { id: returnOrderId },
      };
      throw new Error('Unexpected mutation');
    });
    expect((await processAutomaticReturnFiscalJob(returnOrderId, request)).status).toBe('blocked');
    expect(request.mock.calls.every(([path]) => !path.includes('transmit-operation-draft'))).toBe(true);
  });

  it('blocks automatic transmission when the generated review has an invalid CFOP', async () => {
    const request = vi.fn(async (path: string, method: string) => {
      if (path.startsWith('/api/nfe/return-fiscal-eligibility')) {
        return {
          eligible: true,
          hasAuthorizedOriginal: true,
          sources: [{ state: 'ready', source: { id: originalDocumentId, ambiente: 2 } }],
        };
      }
      if (path === '/api/nfe/operation-drafts' && method === 'POST') return { draftId };
      if (path === `/api/nfe/operation-drafts?id=${draftId}`) {
        return {
          draft: {
            operation_kind: 'return',
            return_order_id: returnOrderId,
            environment: 2,
            status: 'draft',
          },
          source: { id: originalDocumentId, ambiente: 2 },
          returnOrder: { id: returnOrderId },
          lines: [{ allowedCfops: [{ value: '1202' }] }],
        };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });
    const buildReviewState = () => ({
      reviewedLines: [{ cfop: '9999', draft_line_id: 'line-1', product_xml: '<prod/>', taxes_xml: '<imposto/>' }],
      review: { nature_of_operation: 'Devolução de mercadoria' },
      error: null,
      notice: '',
    });

    await expect(
      processAutomaticReturnFiscalJob(returnOrderId, request, buildReviewState)
    ).resolves.toEqual({ status: 'blocked', errorCode: 'fiscal_review_required' });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('retries transient failures without reporting a fiscal validation rejection', async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new AutomaticReturnFiscalApiError('fiscal_api_unreachable', true));

    await expect(processAutomaticReturnFiscalJob(returnOrderId, request)).resolves.toEqual({
      status: 'retryable',
      errorCode: 'fiscal_api_unreachable',
    });
  });
});
