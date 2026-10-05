export type OrderFiscalBadgeStatus = 'not_issued' | 'issued' | 'cancelled' | 'reversed';

export interface FiscalDocumentStatusRow {
  id?: string;
  created_at?: string;
  order_id: string | null;
  status: string;
  document_type?: string | null;
  ambiente?: number | null;
}

export interface OrderFiscalBadgeStatuses {
  production: OrderFiscalBadgeStatus;
  homologation?: OrderFiscalBadgeStatus;
  productionDocumentId?: string;
  homologationDocumentId?: string;
}

const isAuthorized = (document: FiscalDocumentStatusRow): boolean =>
  document.status === 'autorizada' || document.status === 'homologada';

const isOutbound = (document: FiscalDocumentStatusRow): boolean =>
  (document.document_type || 'outbound') === 'outbound';

export const resolveOrderFiscalBadgeStatus = (
  documents: readonly FiscalDocumentStatusRow[]
): OrderFiscalBadgeStatus => {
  if (
    documents.some(
      (document) =>
        (document.document_type === 'return' || document.document_type === 'estorno') &&
        isAuthorized(document)
    )
  ) {
    return 'reversed';
  }

  if (documents.some((document) => isOutbound(document) && isAuthorized(document))) {
    return 'issued';
  }

  if (documents.some((document) => isOutbound(document) && document.status === 'cancelada')) {
    return 'cancelled';
  }

  return 'not_issued';
};

export const resolveOrderFiscalBadgePair = (
  documents: readonly FiscalDocumentStatusRow[]
): OrderFiscalBadgeStatuses => {
  const prodDocs = documents.filter((doc) => doc.ambiente !== 2);
  const hmlDocs = documents.filter((doc) => doc.ambiente === 2);

  const production = resolveOrderFiscalBadgeStatus(prodDocs);
  const homologation = resolveOrderFiscalBadgeStatus(hmlDocs);
  const findDocumentId = (
    environmentDocuments: readonly FiscalDocumentStatusRow[],
    status: OrderFiscalBadgeStatus
  ) => {
    const matchingDocuments = environmentDocuments.filter((document) => {
      if (status === 'reversed')
        return (
          (document.document_type === 'return' || document.document_type === 'estorno') &&
          isAuthorized(document)
        );
      if (status === 'cancelled') return isOutbound(document) && document.status === 'cancelada';
      if (status === 'issued') return isOutbound(document) && isAuthorized(document);
      return false;
    });
    return matchingDocuments.sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    )[0]?.id;
  };

  return {
    production,
    homologation: homologation !== 'not_issued' ? homologation : undefined,
    productionDocumentId: findDocumentId(prodDocs, production),
    homologationDocumentId:
      homologation !== 'not_issued' ? findDocumentId(hmlDocs, homologation) : undefined,
  };
};
