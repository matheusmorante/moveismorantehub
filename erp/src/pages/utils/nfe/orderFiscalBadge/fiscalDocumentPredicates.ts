import type { FiscalDocumentStatusRow } from './orderFiscalBadgeRules.types';

export const FISCAL_REJECTION_STATUSES = new Set(['rejeitada', 'denegada']);

export const newestFirst = (a: FiscalDocumentStatusRow, b: FiscalDocumentStatusRow): number =>
  String(b.created_at || '').localeCompare(String(a.created_at || ''));

export const productionFirst = (a: FiscalDocumentStatusRow, b: FiscalDocumentStatusRow): number =>
  Number(a.ambiente === 2) - Number(b.ambiente === 2) || newestFirst(a, b);

export const isAuthorizedFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  document.status === 'autorizada' || document.status === 'homologada';

export const isOutboundFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  (document.document_type || 'outbound') === 'outbound';
