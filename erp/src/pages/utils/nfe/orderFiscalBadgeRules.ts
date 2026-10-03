export type OrderFiscalBadgeStatus = 'not_issued' | 'issued' | 'cancelled' | 'return' | 'estorno';

export interface FiscalDocumentStatusRow {
  order_id: string | null;
  status: string;
  document_type?: string | null;
}

const isAuthorized = (document: FiscalDocumentStatusRow): boolean =>
  document.status === 'autorizada' || document.status === 'homologada';

const isOutbound = (document: FiscalDocumentStatusRow): boolean =>
  (document.document_type || 'outbound') === 'outbound';

export const resolveOrderFiscalBadgeStatus = (
  documents: readonly FiscalDocumentStatusRow[]
): OrderFiscalBadgeStatus => {
  if (documents.some((document) => document.document_type === 'return' && isAuthorized(document)))
    return 'return';

  if (documents.some((document) => document.document_type === 'estorno' && isAuthorized(document)))
    return 'estorno';

  if (documents.some((document) => isOutbound(document) && isAuthorized(document))) {
    return 'issued';
  }

  if (
    documents.some(
      (document) => isOutbound(document) && document.status === 'cancelada'
    )
  ) {
    return 'cancelled';
  }

  return 'not_issued';
};
