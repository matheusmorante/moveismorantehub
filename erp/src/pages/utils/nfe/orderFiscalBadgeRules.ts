export type OrderFiscalBadgeStatus = 'not_issued' | 'issued' | 'cancelled' | 'failed';
export type OrderFiscalOperationBadgeStatus = 'issued' | 'failed';

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
  estornoStatus?: OrderFiscalOperationBadgeStatus;
  estornoDocumentId?: string;
  estornoEnvironment?: 1 | 2;
  devolucaoStatus?: OrderFiscalOperationBadgeStatus;
  devolucaoDocumentId?: string;
  devolucaoEnvironment?: 1 | 2;
}

const FISCAL_OPERATION_FAILURE_STATUSES = new Set(['erro', 'rejeitada', 'denegada']);

const newestFirst = (a: FiscalDocumentStatusRow, b: FiscalDocumentStatusRow) =>
  String(b.created_at || '').localeCompare(String(a.created_at || ''));

const productionFirst = (a: FiscalDocumentStatusRow, b: FiscalDocumentStatusRow) =>
  Number(a.ambiente === 2) - Number(b.ambiente === 2) || newestFirst(a, b);

const resolveFiscalOperationBadge = (
  documents: readonly FiscalDocumentStatusRow[],
  documentType: 'estorno' | 'return'
): { status?: OrderFiscalOperationBadgeStatus; documentId?: string; environment?: 1 | 2 } => {
  const operationDocuments = documents.filter((document) => document.document_type === documentType);
  const authorizedDocument = operationDocuments
    .filter(isAuthorizedFiscalDocument)
    .sort(productionFirst)[0];
  const failedDocument = operationDocuments
    .filter((document) => FISCAL_OPERATION_FAILURE_STATUSES.has(document.status.toLowerCase()))
    .sort(productionFirst)[0];
  const document = authorizedDocument || failedDocument;

  if (!document) return {};

  return {
    status: authorizedDocument ? 'issued' : 'failed',
    documentId: document.id,
    environment: document.ambiente === 2 ? 2 : 1,
  };
};

export const resolveOrderFiscalEstornoBadge = (
  documents: readonly FiscalDocumentStatusRow[]
): Pick<OrderFiscalBadgeStatuses, 'estornoStatus' | 'estornoDocumentId' | 'estornoEnvironment'> => {
  const badge = resolveFiscalOperationBadge(documents, 'estorno');
  if (!badge.status) return {};
  return {
    estornoStatus: badge.status,
    estornoDocumentId: badge.documentId,
    estornoEnvironment: badge.environment,
  };
};

export const resolveOrderFiscalDevolucaoBadge = (
  documents: readonly FiscalDocumentStatusRow[]
): Pick<
  OrderFiscalBadgeStatuses,
  'devolucaoStatus' | 'devolucaoDocumentId' | 'devolucaoEnvironment'
> => {
  const badge = resolveFiscalOperationBadge(documents, 'return');
  if (!badge.status) return {};
  return {
    devolucaoStatus: badge.status,
    devolucaoDocumentId: badge.documentId,
    devolucaoEnvironment: badge.environment,
  };
};

export const isAuthorizedFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  document.status === 'autorizada' || document.status === 'homologada';

export const isOutboundFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  (document.document_type || 'outbound') === 'outbound';

const isAuthorized = isAuthorizedFiscalDocument;
const isOutbound = isOutboundFiscalDocument;

export const resolveOrderFiscalBadgeStatus = (
  documents: readonly FiscalDocumentStatusRow[]
): OrderFiscalBadgeStatus => {
  const outboundDocuments = documents.filter(isOutbound);

  if (outboundDocuments.some(isAuthorized)) {
    return 'issued';
  }

  if (
    outboundDocuments.some((document) => FISCAL_OPERATION_FAILURE_STATUSES.has(document.status.toLowerCase()))
  ) {
    return 'failed';
  }

  if (outboundDocuments.some((document) => document.status === 'cancelada')) {
    return 'cancelled';
  }

  return 'not_issued';
};

export const resolveOrderFiscalBadgePair = (
  documents: readonly FiscalDocumentStatusRow[]
): OrderFiscalBadgeStatuses => {
  // Estornos and devoluções have their own badges and cannot replace NF/NFH status.
  const outboundDocs = documents.filter(isOutbound);
  const prodDocs = outboundDocs.filter((doc) => doc.ambiente !== 2);
  const hmlDocs = outboundDocs.filter((doc) => doc.ambiente === 2);

  const production = resolveOrderFiscalBadgeStatus(prodDocs);
  const homologation = resolveOrderFiscalBadgeStatus(hmlDocs);
  const findDocumentId = (
    environmentDocuments: readonly FiscalDocumentStatusRow[],
    status: OrderFiscalBadgeStatus
  ) => {
    const matchingDocuments = environmentDocuments.filter((document) => {
      if (status === 'failed')
        return FISCAL_OPERATION_FAILURE_STATUSES.has(document.status.toLowerCase());
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
    homologation,
    productionDocumentId: findDocumentId(prodDocs, production),
    homologationDocumentId:
      homologation !== 'not_issued' ? findDocumentId(hmlDocs, homologation) : undefined,
    ...resolveOrderFiscalEstornoBadge(documents),
    ...resolveOrderFiscalDevolucaoBadge(documents),
  };
};
