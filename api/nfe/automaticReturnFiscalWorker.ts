import { buildFiscalOperationDraftReviewState } from '../../erp/src/pages/App/FiscalDocuments/utils/fiscalOperationDraftReview';
import type { DraftPayload } from '../../erp/src/pages/App/FiscalDocuments/types/fiscalOperationDraft.types';

type FiscalApiMethod = 'GET' | 'POST' | 'PUT';

export type AutomaticReturnFiscalJobStatus =
  | 'authorized'
  | 'not_required'
  | 'blocked'
  | 'reconciling'
  | 'retryable';

export interface AutomaticReturnFiscalJobResult {
  status: AutomaticReturnFiscalJobStatus;
  errorCode: string | null;
}

export type AutomaticReturnFiscalApi = (
  path: string,
  method: FiscalApiMethod,
  body?: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export class AutomaticReturnFiscalApiError extends Error {
  constructor(
    readonly errorCode: string,
    readonly retryable: boolean
  ) {
    super(errorCode);
    this.name = 'AutomaticReturnFiscalApiError';
  }
}

interface ReturnFiscalSource {
  id: string;
  ambiente: number;
}

interface ReturnFiscalEligibilitySource {
  state: string;
  source?: ReturnFiscalSource | null;
  draftId?: string | null;
}

interface ReturnFiscalEligibilityResponse {
  eligible: boolean;
  hasAuthorizedOriginal: boolean;
  sources: ReturnFiscalEligibilitySource[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReturnFiscalEligibility(value: unknown): value is ReturnFiscalEligibilityResponse {
  return (
    isRecord(value) &&
    typeof value.eligible === 'boolean' &&
    typeof value.hasAuthorizedOriginal === 'boolean' &&
    Array.isArray(value.sources)
  );
}

async function transmitDraft(
  request: AutomaticReturnFiscalApi,
  draftId: string,
  environment: number
): Promise<'authorized' | 'reconciling' | 'blocked'> {
  const result = await request('/api/nfe/transmit-operation-draft', 'POST', {
    draftId,
    productionConfirmed: environment === 1,
  });
  if (result.success === true && result.status === 'authorized') return 'authorized';
  if (
    result.pending === true ||
    result.reconciliationRequired === true ||
    result.retryAllowed === true
  ) {
    return 'reconciling';
  }
  return 'blocked';
}

export async function processAutomaticReturnFiscalJob(
  returnOrderId: string,
  request: AutomaticReturnFiscalApi,
  buildReviewState = buildFiscalOperationDraftReviewState
): Promise<AutomaticReturnFiscalJobResult> {
  try {
    const rawEligibility = await request(
      '/api/nfe/return-fiscal-eligibility?returnOrderId=' + encodeURIComponent(returnOrderId),
      'GET'
    );
    if (!isReturnFiscalEligibility(rawEligibility)) {
      return { status: 'retryable', errorCode: 'eligibility_response_invalid' };
    }
    if (!rawEligibility.hasAuthorizedOriginal) {
      return { status: 'not_required', errorCode: null };
    }
    if (!rawEligibility.eligible || rawEligibility.sources.length === 0) {
      return { status: 'blocked', errorCode: 'fiscal_eligibility_blocked' };
    }

    let hasPendingTransmission = false;
    for (const sourceResult of rawEligibility.sources) {
      if (sourceResult.state === 'authorized') continue;
      if (!['ready', 'draft', 'pending'].includes(sourceResult.state)) {
        return { status: 'blocked', errorCode: 'fiscal_source_blocked' };
      }

      const source = sourceResult.source;
      if (!source?.id || ![1, 2].includes(Number(source.ambiente))) {
        return { status: 'blocked', errorCode: 'fiscal_source_invalid' };
      }

      let draftId = sourceResult.draftId || null;
      if (!draftId) {
        if (sourceResult.state === 'pending') {
          hasPendingTransmission = true;
          continue;
        }
        if (sourceResult.state !== 'ready') {
          return { status: 'blocked', errorCode: 'fiscal_draft_missing' };
        }
        const created = await request('/api/nfe/operation-drafts', 'POST', {
          kind: 'return',
          originalDocumentId: source.id,
          returnOrderId,
          environment: source.ambiente,
        });
        draftId = typeof created.draftId === 'string' ? created.draftId : null;
        if (!draftId) return { status: 'retryable', errorCode: 'fiscal_draft_create_unconfirmed' };
      }

      const draftPayload = await request(
        '/api/nfe/operation-drafts?id=' + encodeURIComponent(draftId),
        'GET'
      );
      const draft = draftPayload.draft;
      const loadedSource = draftPayload.source;
      const returnOrder = draftPayload.returnOrder;
      if (
        !isRecord(draft) ||
        !isRecord(loadedSource) ||
        !isRecord(returnOrder) ||
        draft.operation_kind !== 'return' ||
        draft.return_order_id !== returnOrderId ||
        loadedSource.id !== source.id ||
        Number(draft.environment) !== Number(source.ambiente) ||
        Number(loadedSource.ambiente) !== Number(source.ambiente) ||
        returnOrder.id !== returnOrderId
      ) {
        return { status: 'blocked', errorCode: 'fiscal_draft_link_mismatch' };
      }
      if (draft.status === 'authorized') continue;
      if (sourceResult.state === 'pending' && !['transmitting', 'unknown'].includes(String(draft.status))) {
        return { status: 'blocked', errorCode: 'fiscal_pending_draft_state_mismatch' };
      }
      if (draft.status === 'transmitting' || draft.status === 'unknown') {
        const reconciliation = await transmitDraft(request, draftId, Number(source.ambiente));
        if (reconciliation === 'blocked') {
          return { status: 'blocked', errorCode: 'fiscal_transmission_blocked' };
        }
        hasPendingTransmission ||= reconciliation === 'reconciling';
        continue;
      }
      if (draft.status === 'ready') {
        const readyResult = await transmitDraft(request, draftId, Number(source.ambiente));
        if (readyResult === 'blocked') {
          return { status: 'blocked', errorCode: 'fiscal_transmission_blocked' };
        }
        hasPendingTransmission ||= readyResult === 'reconciling';
        continue;
      }
      if (draft.status !== 'draft') {
        return { status: 'blocked', errorCode: 'fiscal_draft_not_reviewable' };
      }

      const review = buildReviewState(draftPayload as unknown as DraftPayload);
      const hasInvalidCfop = review.reviewedLines.some((line, index) => {
        const draftLine = (draftPayload.lines as Array<Record<string, unknown>> | undefined)?.[index];
        const allowedCfops = draftLine?.allowedCfops;
        return (
          !/^\d{4}$/.test(line.cfop) ||
          (Array.isArray(allowedCfops) &&
            !allowedCfops.some(
              (option) => isRecord(option) && option.value === line.cfop
            ))
        );
      });
      if (review.error || !review.reviewedLines.length || hasInvalidCfop) {
        return { status: 'blocked', errorCode: 'fiscal_review_required' };
      }

      await request('/api/nfe/operation-drafts', 'PUT', {
        draftId,
        reviewData: review.review,
        lines: review.reviewedLines,
      });
      const transmission = await transmitDraft(request, draftId, Number(source.ambiente));
      if (transmission === 'blocked') {
        return { status: 'blocked', errorCode: 'fiscal_transmission_blocked' };
      }
      hasPendingTransmission ||= transmission === 'reconciling';
    }

    return hasPendingTransmission
      ? { status: 'reconciling', errorCode: 'sefaz_reconciliation_pending' }
      : { status: 'authorized', errorCode: null };
  } catch (error) {
    if (error instanceof AutomaticReturnFiscalApiError) {
      return {
        status: error.retryable ? 'retryable' : 'blocked',
        errorCode: error.errorCode,
      };
    }
    return { status: 'retryable', errorCode: 'automatic_return_worker_error' };
  }
}
