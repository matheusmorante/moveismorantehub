export type FiscalExportPurpose = 'accounting' | 'custom';
export type FiscalExportPeriod = 'this_month' | 'last_month' | 'custom';
export type FiscalExportModel = '55' | '65';
export type FiscalExportDocumentType = 'outbound' | 'estorno' | 'return' | 'inbound';
export type FiscalExportStatus =
  | 'autorizada'
  | 'homologada'
  | 'cancelada'
  | 'denegada'
  | 'rejeitada';

export interface FiscalExportFilters {
  purpose: FiscalExportPurpose;
  periodStart: string;
  periodEnd: string;
  environment: 1 | 2;
  models: FiscalExportModel[];
  documentTypes: FiscalExportDocumentType[];
  statuses: FiscalExportStatus[];
  includeEvents: boolean;
  includeReport: boolean;
}

export interface FiscalExportFormValues {
  purpose: FiscalExportPurpose;
  period: FiscalExportPeriod;
  periodStart: string;
  periodEnd: string;
  environment: '1' | '2';
  models: FiscalExportModel[];
  documentTypes: FiscalExportDocumentType[];
  statuses: FiscalExportStatus[];
  includeEvents: boolean;
  includeReport: boolean;
}

export interface FiscalExportGroup {
  documentType: FiscalExportDocumentType;
  status: FiscalExportStatus;
  count: number;
  total: number;
}

export interface FiscalExportPreview {
  totalCount: number;
  inboundCount: number;
  eventCount: number;
  totalValue: number;
  groups: FiscalExportGroup[];
}

export interface FiscalExportDocument {
  id: string;
  order_id: string | null;
  numero_nfe: number;
  serie: string;
  chave_acesso: string;
  modelo: FiscalExportModel;
  ambiente: 1 | 2;
  status: FiscalExportStatus;
  numero_protocolo: string | null;
  valor_total: number;
  created_at: string;
  document_type: FiscalExportDocumentType | null;
  original_document_id: string | null;
  supersedes_document_id?: string | null;
  source_status?: string | null;
  xml_nfe?: string | null;
  xml_protocolo?: string | null;
  isContextDocument?: boolean;
}

export interface FiscalExportEvent {
  id: string;
  document_id: string;
  event_type: '110111' | '210210';
  event_sequence: number;
  attempt_number: number;
  environment: 1 | 2;
  status: 'registered';
  protocol_number: string | null;
  protocol_date: string | null;
  requested_at: string;
  signed_xml: string | null;
  response_xml: string | null;
}

export interface FiscalExportHistoryItem {
  id: string;
  created_at: string;
  purpose: FiscalExportPurpose;
  period_start: string;
  period_end: string;
  environment: 1 | 2;
  document_count: number;
  event_count: number;
  total_value: number;
  archive_name: string;
}
