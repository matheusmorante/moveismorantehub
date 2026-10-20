export type AuthorizedDocumentRow = {
  id: string;
  order_id: string;
  emission_request_id: string | null;
  document_type: string;
  status: string;
  ambiente: number;
  modelo: string;
  numero_nfe: number;
  serie: string;
  chave_acesso: string;
  numero_protocolo: string;
  xml_protocolo: string | null;
  xml_nfe: string | null;
};

export type OrderRow = {
  id: string;
  order_type?: string | null;
  status?: string | null;
  order_data?: Record<string, any> | null;
  updated_at?: string | null;
};

export type AuditedDocument = {
  id: string;
  model: string;
  environment: 1 | 2;
  action: string;
  reason?: string;
  changes: Array<{ field: string; expected: unknown; actual: unknown }>;
};
