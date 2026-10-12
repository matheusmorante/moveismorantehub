import {
  buildFiscalOperationDraftReviewState,
} from '../utils/fiscalOperationDraftReview';
import {
  createFiscalOperationDraft,
  fetchReturnFiscalEligibility,
  loadFiscalOperationDraft,
  saveFiscalOperationDraftReview,
  transmitFiscalOperationDraft,
} from './fiscalOperationDraftService';

export interface AutomaticReturnFiscalEmissionResult {
  status: 'not-required' | 'authorized' | 'pending' | 'partial' | 'failed';
  authorizedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
}

type AutomaticReturnFiscalEmissionCounts = Omit<AutomaticReturnFiscalEmissionResult, 'status'>;

const failure = (result: AutomaticReturnFiscalEmissionCounts) => {
  result.failedDocuments += 1;
};

const resolveResultStatus = (
  result: Omit<AutomaticReturnFiscalEmissionResult, 'status'>
): AutomaticReturnFiscalEmissionResult['status'] => {
  if (!result.authorizedDocuments && !result.pendingDocuments && !result.failedDocuments)
    return 'not-required';
  if (result.failedDocuments && result.authorizedDocuments) return 'partial';
  if (result.pendingDocuments && (result.failedDocuments || result.authorizedDocuments))
    return 'partial';
  if (result.pendingDocuments) return 'pending';
  if (result.failedDocuments) return 'failed';
  return 'authorized';
};

/**
 * Transmits eligible return invoices after the ERP has committed the physical return.
 * Existing pending attempts are reported for reconciliation and are never submitted again here.
 */
export async function automaticallyTransmitReturnFiscalDocuments(
  returnOrderId: string
): Promise<AutomaticReturnFiscalEmissionResult> {
  const result = { authorizedDocuments: 0, pendingDocuments: 0, failedDocuments: 0 };
  const eligibility = await fetchReturnFiscalEligibility(returnOrderId);

  if (!eligibility.hasAuthorizedOriginal) {
    return { status: 'not-required', ...result };
  }
  if (!eligibility.eligible || eligibility.sources.length === 0) {
    failure(result);
    return { status: resolveResultStatus(result), ...result };
  }

  for (const sourceResult of eligibility.sources) {
    if (sourceResult.state === 'authorized') {
      result.authorizedDocuments += 1;
      continue;
    }
    if (sourceResult.state === 'pending') {
      result.pendingDocuments += 1;
      continue;
    }
    if (sourceResult.state !== 'ready' && sourceResult.state !== 'draft') {
      failure(result);
      continue;
    }

    try {
      const source = sourceResult.source;
      if (!source) throw new Error('A NF-e original autorizada não foi encontrada.');

      let draftId = sourceResult.draftId;
      if (!draftId) {
        if (sourceResult.state !== 'ready') {
          throw new Error('O rascunho fiscal não foi identificado para esta NF-e original.');
        }
        const created = await createFiscalOperationDraft({
          kind: 'return',
          originalDocumentId: source.id,
          returnOrderId,
          environment: source.ambiente,
        });
        draftId = created.draftId;
      }

      const draft = await loadFiscalOperationDraft(draftId);
      if (
        draft.draft.operation_kind !== 'return' ||
        draft.source.id !== source.id ||
        draft.source.ambiente !== source.ambiente ||
        draft.draft.environment !== source.ambiente ||
        draft.returnOrder?.id !== returnOrderId
      ) {
        throw new Error('O rascunho não corresponde à devolução e à NF-e original.');
      }

      if (draft.draft.status === 'authorized') {
        result.authorizedDocuments += 1;
        continue;
      }
      if (draft.draft.status === 'transmitting' || draft.draft.status === 'unknown') {
        result.pendingDocuments += 1;
        continue;
      }
      if (draft.draft.status !== 'draft') {
        throw new Error('O rascunho fiscal não está disponível para transmissão automática.');
      }

      const review = buildFiscalOperationDraftReviewState(draft);
      const hasInvalidCfop = review.reviewedLines.some((line, index) => {
        const draftLine = draft.lines[index];
        return (
          !/^\d{4}$/.test(line.cfop) ||
          (draftLine.allowedCfops !== undefined &&
            !draftLine.allowedCfops.some((option) => option.value === line.cfop))
        );
      });
      if (review.error || !review.reviewedLines.length || hasInvalidCfop) {
        throw new Error(review.error || 'A devolução exige revisão manual de CFOP ou itens fiscais.');
      }

      await saveFiscalOperationDraftReview({
        draftId,
        reviewData: review.review,
        lines: review.reviewedLines,
      });

      const transmission = await transmitFiscalOperationDraft({
        draftId,
        productionConfirmed: draft.source.ambiente === 1,
      });
      if (transmission.success === true) {
        result.authorizedDocuments += 1;
      } else if (
        transmission.pending === true ||
        transmission.reconciliationRequired === true ||
        transmission.retryAllowed === true
      ) {
        result.pendingDocuments += 1;
      } else {
        failure(result);
      }
    } catch {
      failure(result);
    }
  }

  return { status: resolveResultStatus(result), ...result };
}

export function getAutomaticReturnFiscalEmissionNotice(
  result: AutomaticReturnFiscalEmissionResult
): { tone: 'success' | 'warning'; message: string } | null {
  if (result.status === 'not-required') return null;
  if (result.status === 'authorized') {
    return {
      tone: 'success',
      message: 'A NF-e de devolução foi autorizada automaticamente pela SEFAZ.',
    };
  }
  if (result.authorizedDocuments > 0) {
    return {
      tone: 'warning',
      message: `A devolução foi registrada e ${result.authorizedDocuments} NF-e(s) de devolução foi(ram) autorizada(s). Ainda há documento(s) pendente(s) de conferência fiscal.`,
    };
  }
  return {
    tone: 'warning',
    message:
      'A devolução foi registrada, mas a NF-e de devolução ficou pendente de conferência ou reconciliação fiscal. Consulte o status fiscal do pedido; nenhuma tentativa incerta será repetida automaticamente.',
  };
}
