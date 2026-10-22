import { randomUUID } from 'node:crypto';
import type { OutboundDatabase } from './outboundTypes';

type ReadOnlyAttempt = {
  document_id: string;
  emission_request_id: string;
  order_id: string;
  model: '55' | '65';
  environment: 1 | 2;
  series: string;
  number: number;
  state:
    | 'prepared'
    | 'transmitting'
    | 'reconciling'
    | 'authorized'
    | 'rejected'
    | 'confirmed_not_found';
  transmission_started_at: string | null;
};

type ReadOnlyDocument = {
  id: string;
  status: string;
  modelo: string;
  ambiente: number;
  numero_nfe: number;
  serie: string;
  numero_protocolo: string | null;
};

type ReadOnlySnapshot = {
  id: string;
  requested_model: string;
  environment: number;
  series: string;
  reserved_number: number;
};

export type OutboundAttemptStatus =
  | { kind: 'not_found' }
  | { kind: 'unavailable'; diagnosticId: string }
  | {
      kind: 'inconsistent';
      documentId?: string;
    numberReserved?: boolean;
    }
  | {
      kind: 'found';
      attempt: ReadOnlyAttempt;
      document: ReadOnlyDocument;
    };

/** Reads durable metadata only; it never claims a lease, reconciles, or contacts SEFAZ. */
export async function readOutboundAttemptStatus(
  db: OutboundDatabase,
  orderId: string,
  environment: 1 | 2,
  emissionRequestId: string,
  diagnosticId = randomUUID()
): Promise<OutboundAttemptStatus> {
  const queryResults = await Promise.all([
    db
      .from('nfe_outbound_attempts')
      .select(
        'document_id,emission_request_id,order_id,model,environment,series,number,state,transmission_started_at'
      )
      .eq('emission_request_id', emissionRequestId)
      .maybeSingle(),
    db
      .from('nfe_documents')
      .select('id,status,modelo,ambiente,numero_nfe,serie,numero_protocolo')
      .eq('emission_request_id', emissionRequestId)
      .eq('order_id', orderId)
      .eq('ambiente', environment)
      .eq('document_type', 'outbound')
      .maybeSingle(),
    db
      .from('nfe_fiscal_snapshots')
      .select('id,requested_model,environment,series,reserved_number')
      .eq('emission_request_id', emissionRequestId)
      .eq('order_id', orderId)
      .eq('environment', environment)
      .maybeSingle(),
  ]).catch((error: unknown) => {
    const errorType = error instanceof Error ? error.name : undefined;
    console.error('[NF-e attempt status] read failed', {
      diagnosticId,
      diagnosticStage: 'read-only-attempt-status',
      ...(errorType && /^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(errorType) ? { errorType } : {}),
    });
    return null;
  });
  if (!queryResults) return { kind: 'unavailable', diagnosticId };
  const [attemptResult, documentResult, snapshotResult] = queryResults;

  const queryErrors = [
    { query: 'attempt', error: attemptResult.error },
    { query: 'document', error: documentResult.error },
    { query: 'snapshot', error: snapshotResult.error },
  ].flatMap(({ query, error }) => {
    if (!error) return [];
    const code = typeof error.code === 'string' ? error.code : '';
    return [
      {
        query,
        code: /^[A-Za-z0-9_.-]{1,48}$/.test(code) ? code : 'UNKNOWN',
      },
    ];
  });
  if (queryErrors.length) {
    console.error('[NF-e attempt status] read failed', {
      diagnosticId,
      diagnosticStage: 'read-only-attempt-status',
      queries: queryErrors,
    });
    return { kind: 'unavailable', diagnosticId };
  }

  const attempt = attemptResult.data as ReadOnlyAttempt | null;
  const document = documentResult.data as ReadOnlyDocument | null;
  const snapshot = snapshotResult.data as ReadOnlySnapshot | null;

  if (attempt) {
    if (attempt.order_id !== orderId || attempt.environment !== environment)
      return { kind: 'inconsistent' };
    if (
      !document ||
      !snapshot ||
      document.id !== attempt.document_id ||
      document.modelo !== attempt.model ||
      Number(document.ambiente) !== attempt.environment ||
      Number(document.numero_nfe) !== attempt.number ||
      String(document.serie) !== attempt.series ||
      snapshot.requested_model !== attempt.model ||
      Number(snapshot.environment) !== attempt.environment ||
      Number(snapshot.reserved_number) !== attempt.number ||
      String(snapshot.series) !== attempt.series
    )
      return {
        kind: 'inconsistent',
        documentId: attempt.document_id,
        numberReserved: true,
      };
    return { kind: 'found', attempt, document };
  }

  if (document || snapshot)
    return {
      kind: 'inconsistent',
      documentId: document?.id,
      numberReserved: true,
    };

  return { kind: 'not_found' };
}
