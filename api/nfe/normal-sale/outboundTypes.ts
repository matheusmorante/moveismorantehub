import type { SupabaseClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';

export type OutboundDatabase = SupabaseClient<FiscalDatabase>;
export type OutboundResult = { status: number; body: Record<string, unknown> };
export type Attempt = FiscalDatabase['public']['Tables']['nfe_outbound_attempts']['Row'];
export type Document = FiscalDatabase['public']['Tables']['nfe_documents']['Row'];

export const outboundFailure = (
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {}
): OutboundResult => ({ status, body: { success: false, code, error, ...extra } });

export const metadata = (a: Attempt) => ({
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
