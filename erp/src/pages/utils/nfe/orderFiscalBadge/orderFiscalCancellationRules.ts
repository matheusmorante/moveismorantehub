import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  OrderFiscalBadgeStatus,
  OrderFiscalCancellationState,
} from './orderFiscalBadgeRules.types';
import {
  FISCAL_REJECTION_STATUSES,
  isAuthorizedFiscalDocument,
  isOutboundFiscalDocument,
} from './fiscalDocumentPredicates';

const isAuthorized = isAuthorizedFiscalDocument;
const isOutbound = isOutboundFiscalDocument;

export const resolveOrderCancellationState = (
  outboundDocs: readonly FiscalDocumentStatusRow[],
  operationDrafts: readonly FiscalOperationDraftStatusRow[],
  orderCancelled: boolean,
  now: number
): OrderFiscalCancellationState | undefined => {
  const latestCancellationEvent = outboundDocs
    .filter((document) => document.cancellationEventStatus)
    .sort((a, b) =>
      String(b.cancellationEventRequestedAt || b.created_at || '').localeCompare(
        String(a.cancellationEventRequestedAt || a.created_at || '')
      )
    )[0];

  const cancellationEventState = String(latestCancellationEvent?.cancellationEventStatus || '').toLowerCase();

  if (cancellationEventState === 'rejected') return 'failed';
  if (cancellationEventState === 'unknown') return 'verify';
  if (cancellationEventState === 'transmitting') {
    const requestedAt = new Date(latestCancellationEvent?.cancellationEventRequestedAt || '').getTime();
    return Number.isFinite(requestedAt) && now - requestedAt < 30_000 ? 'pending' : 'verify';
  }

  if (
    !cancellationEventState &&
    orderCancelled &&
    outboundDocs.some(isAuthorized) &&
    !operationDrafts.some((draft) => draft.operation_kind === 'estorno')
  ) {
    return 'pending';
  }

  return undefined;
};

export const resolveCancellationDocuments = (
  outboundDocs: readonly FiscalDocumentStatusRow[],
  operationDrafts: readonly FiscalOperationDraftStatusRow[],
  orderCancelled: boolean,
  now: number
): Array<{
  documentId: string;
  environment: 1 | 2;
  state: OrderFiscalCancellationState;
}> => {
  return outboundDocs
    .filter((document) => Boolean(document.id) && isAuthorized(document))
    .flatMap((document) => {
      const state = String(document.cancellationEventStatus || '').toLowerCase();
      const cancellationStatus: OrderFiscalCancellationState | undefined =
        state === 'rejected'
          ? 'failed'
          : state === 'unknown' || state === 'registered'
            ? 'verify'
            : state === 'transmitting'
              ? (() => {
                  const requestedAt = new Date(document.cancellationEventRequestedAt || '').getTime();
                  return Number.isFinite(requestedAt) && now - requestedAt < 30_000 ? 'pending' : 'verify';
                })()
              : orderCancelled &&
                  !operationDrafts.some(
                    (draft) => draft.operation_kind === 'estorno' && draft.original_document_id === document.id
                  )
                ? 'pending'
                : undefined;

      return cancellationStatus
        ? [
            {
              documentId: document.id!,
              environment: document.ambiente === 2 ? (2 as const) : (1 as const),
              state: cancellationStatus,
            },
          ]
        : [];
    });
};

export const findDocumentIdByStatus = (
  environmentDocuments: readonly FiscalDocumentStatusRow[],
  status: OrderFiscalBadgeStatus,
  estornoConfirmedIds: ReadonlySet<string>
): string | undefined => {
  const matchingDocuments = environmentDocuments.filter((document) => {
    if (status === 'failed') return document.status.toLowerCase() === 'erro';
    if (status === 'rejected') {
      return FISCAL_REJECTION_STATUSES.has(document.status.toLowerCase());
    }
    if (status === 'cancelled') {
      return (
        (isOutbound(document) && document.status === 'cancelada') ||
        String(document.cancellationEventStatus || '').toLowerCase() === 'registered'
      );
    }
    if (status === 'issued') {
      return (
        isOutbound(document) &&
        isAuthorized(document) &&
        String(document.cancellationEventStatus || '').toLowerCase() !== 'registered' &&
        !Boolean(document.id && estornoConfirmedIds.has(document.id))
      );
    }
    if (status === 'reversed') {
      return (
        isOutbound(document) &&
        isAuthorized(document) &&
        Boolean(document.id && estornoConfirmedIds.has(document.id))
      );
    }
    return false;
  });

  return matchingDocuments.sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  )[0]?.id;
};
