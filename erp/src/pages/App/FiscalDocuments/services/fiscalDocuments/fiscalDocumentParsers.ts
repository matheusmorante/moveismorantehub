import type {
  FiscalDocumentDetails,
  FiscalDocumentEventSummary,
  FiscalOperationDraftSummary,
  NfeDocumentRecord,
} from '../../types/fiscalDocuments.types';
import type { SourceDocument } from '../../types/fiscalOperationDraft.types';
import type {
  OrderFiscalBadgeStatus,
  OrderFiscalSituation,
} from '@/pages/utils/nfe/orderFiscalBadgeRules';

const ORDER_FISCAL_SITUATION_STATUSES: readonly OrderFiscalBadgeStatus[] = [
  'not_issued',
  'issued',
  'cancelled',
  'failed',
  'rejected',
  'reversed',
  'reissue_required',
  'regularization_failed',
  'regularization_uncertain',
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error(`Histórico fiscal com dados inválidos em ${field}.`);
  }
  return value;
}

export function parseFiscalDocumentEvent(value: unknown): FiscalDocumentEventSummary {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.event_type !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.requested_at !== 'string' ||
    (value.attempt_number !== null &&
      value.attempt_number !== undefined &&
      typeof value.attempt_number !== 'number')
  ) {
    throw new Error('Histórico fiscal com dados inválidos.');
  }

  return {
    id: value.id,
    event_type: value.event_type,
    status: value.status,
    requested_at: value.requested_at,
    attempt_number: typeof value.attempt_number === 'number' ? value.attempt_number : null,
    cstat: nullableString(value.cstat, 'cstat'),
    xmotivo: nullableString(value.xmotivo, 'xmotivo'),
    requested_by: nullableString(value.requested_by, 'requested_by'),
    protocol_number: nullableString(value.protocol_number, 'protocol_number'),
    justification: nullableString(value.justification, 'justification'),
  };
}

export function mapNfeDocumentRecord(
  raw: any,
  defaultDocumentType: string = 'outbound'
): NfeDocumentRecord {
  return {
    id: String(raw.id),
    order_id: raw.order_id ? String(raw.order_id) : null,
    numero_nfe: Number(raw.numero_nfe),
    serie: String(raw.serie),
    chave_acesso: String(raw.chave_acesso),
    modelo: raw.modelo as '55' | '65',
    ambiente: Number(raw.ambiente) as 1 | 2,
    status: raw.status as NfeDocumentRecord['status'],
    motivo_status: nullableString(raw.motivo_status, 'motivo_status') || undefined,
    numero_protocolo: nullableString(raw.numero_protocolo, 'numero_protocolo'),
    xml_nfe: nullableString(raw.xml_nfe, 'xml_nfe'),
    xml_protocolo: nullableString(raw.xml_protocolo, 'xml_protocolo'),
    valor_total: typeof raw.valor_total === 'number' ? raw.valor_total : undefined,
    destinatario_nome: nullableString(raw.destinatario_nome, 'destinatario_nome') || undefined,
    destinatario_documento:
      nullableString(raw.destinatario_documento, 'destinatario_documento') || undefined,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    document_type: raw.document_type || defaultDocumentType,
    fiscal_ruleset_version:
      typeof raw.fiscal_ruleset_version === 'string' ? raw.fiscal_ruleset_version : undefined,
    supersedes_document_id:
      typeof raw.supersedes_document_id === 'string' ? raw.supersedes_document_id : undefined,
    original_document_id:
      typeof raw.original_document_id === 'string' ? raw.original_document_id : undefined,
  };
}

export function mapFiscalDocumentDetailsRecord(
  doc: any
): FiscalDocumentDetails['document'] {
  return {
    id: String(doc.id),
    order_id: doc.order_id ? String(doc.order_id) : null,
    numero_nfe: Number(doc.numero_nfe),
    serie: String(doc.serie),
    chave_acesso: String(doc.chave_acesso),
    modelo: doc.modelo as '55' | '65',
    ambiente: Number(doc.ambiente) as 1 | 2,
    status: doc.status as NfeDocumentRecord['status'],
    motivo_status: nullableString(doc.motivo_status, 'motivo_status') || undefined,
    numero_protocolo: nullableString(doc.numero_protocolo, 'numero_protocolo'),
    valor_total: typeof doc.valor_total === 'number' ? doc.valor_total : undefined,
    destinatario_nome: nullableString(doc.destinatario_nome, 'destinatario_nome') || undefined,
    destinatario_documento:
      nullableString(doc.destinatario_documento, 'destinatario_documento') || undefined,
    created_at: String(doc.created_at),
    updated_at: String(doc.updated_at),
    document_type: typeof doc.document_type === 'string' ? doc.document_type : undefined,
    xml_nfe: nullableString(doc.xml_nfe, 'xml_nfe'),
    xml_protocolo: nullableString(doc.xml_protocolo, 'xml_protocolo'),
  };
}

export function mapOperationDraftSummary(d: any): FiscalOperationDraftSummary {
  return {
    id: String(d.id),
    operation_kind: d.operation_kind === 'estorno' ? ('estorno' as const) : ('return' as const),
    environment: Number(d.environment) === 2 ? (2 as const) : (1 as const),
    status: String(d.status),
    reason: typeof d.reason === 'string' ? d.reason : null,
    created_at: String(d.created_at),
    updated_at: typeof d.updated_at === 'string' ? d.updated_at : undefined,
    document_id: d.document_id ? String(d.document_id) : null,
    access_key: d.access_key ? String(d.access_key) : null,
    protocol_number: d.protocol_number ? String(d.protocol_number) : null,
    sourceDocument:
      isRecord(d.sourceDocument) &&
      typeof d.sourceDocument.id === 'string' &&
      (d.sourceDocument.order_id === null || typeof d.sourceDocument.order_id === 'string') &&
      ['55', '65'].includes(String(d.sourceDocument.modelo)) &&
      [1, 2].includes(Number(d.sourceDocument.ambiente)) &&
      typeof d.sourceDocument.numero_nfe === 'number' &&
      typeof d.sourceDocument.serie === 'string' &&
      typeof d.sourceDocument.chave_acesso === 'string'
        ? (d.sourceDocument as unknown as SourceDocument)
        : undefined,
  };
}

/** Valida a situação fiscal vinda do backend; qualquer divergência a descarta (nunca presume). */
export function parseOrderFiscalSituation(value: unknown): OrderFiscalSituation | undefined {
  if (
    !isRecord(value) ||
    typeof value.status !== 'string' ||
    !ORDER_FISCAL_SITUATION_STATUSES.includes(value.status as OrderFiscalBadgeStatus) ||
    (value.environment !== 1 && value.environment !== 2)
  ) {
    return undefined;
  }
  const actionKinds = [
    'awaiting_new_invoice',
    'draft',
    'rejected',
    'transmission_uncertain',
    'authorized',
    'prior_regularization_failed',
  ];
  const actionKind =
    typeof value.actionKind === 'string' && actionKinds.includes(value.actionKind)
      ? (value.actionKind as import('@/pages/utils/nfe/orderFiscalBadgeRules').ReplacementPendingAction)
      : undefined;

  return {
    status: value.status as OrderFiscalBadgeStatus,
    environment: value.environment,
    orderCancelled: value.orderCancelled === true,
    ...(typeof value.orderId === 'string' ? { orderId: value.orderId } : {}),
    ...(typeof value.documentId === 'string' ? { documentId: value.documentId } : {}),
    ...(typeof value.previousDocumentId === 'string' ? { previousDocumentId: value.previousDocumentId } : {}),
    ...(value.previousDocumentNumber != null ? { previousDocumentNumber: value.previousDocumentNumber as number | string } : {}),
    ...(value.previousDocumentClosure === 'estornada' || value.previousDocumentClosure === 'cancelada'
      ? { previousDocumentClosure: value.previousDocumentClosure }
      : {}),
    reason: typeof value.reason === 'string' && value.reason.trim() ? value.reason : null,
    ...(actionKind ? { actionKind } : {}),
  };
}
