import type { SupabaseClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';

export type OutboundDatabase = SupabaseClient<FiscalDatabase>;
export type OutboundResult = { status: number; body: Record<string, unknown> };
export type Attempt = FiscalDatabase['public']['Tables']['nfe_outbound_attempts']['Row'];
export type Document = FiscalDatabase['public']['Tables']['nfe_documents']['Row'];
export type OutboundAttemptSnapshot = Pick<
  Attempt,
  | 'document_id'
  | 'order_id'
  | 'emission_request_id'
  | 'snapshot_id'
  | 'access_key'
  | 'number'
  | 'series'
  | 'model'
  | 'environment'
  | 'xml_sha256'
  | 'state'
>;
export type OutboundDocumentSnapshot = Pick<
  Document,
  'id' | 'status' | 'xml_nfe' | 'xml_protocolo' | 'numero_protocolo' | 'motivo_status'
>;
type OutboundAttemptMetadata = Pick<
  Attempt,
  | 'document_id'
  | 'order_id'
  | 'emission_request_id'
  | 'snapshot_id'
  | 'access_key'
  | 'number'
  | 'series'
  | 'model'
  | 'environment'
>;

export const outboundFailure = (
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {}
): OutboundResult => ({ status, body: { success: false, code, error, ...extra } });

export const metadata = (a: OutboundAttemptMetadata) => ({
  documentId: a.document_id,
  orderId: a.order_id,
  emissionRequestId: a.emission_request_id,
  fiscalSnapshotId: a.snapshot_id,
  accessKey: a.access_key,
  nfeNumber: a.number,
  series: a.series,
  model: a.model,
  environment: a.environment,
  numberReserved: true,
});
