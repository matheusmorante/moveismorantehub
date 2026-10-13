import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSefazCancellationEvent } from '../../erp/src/pages/utils/nfe/nfeEventRules';

/** External confirmation and local commit are separate facts. Never fall back to table writes. */
export async function persistCancellationResult(
  db: SupabaseClient,
  doc: { id: string; ambiente: number; chave_acesso: string },
  eventId: string,
  responseXml: string
) {
  const result = parseSefazCancellationEvent(responseXml, {
    accessKey: doc.chave_acesso,
    environment: Number(doc.ambiente),
  });
  const eventStatus = result.registered ? 'registered' : result.pending ? 'unknown' : 'rejected';
  let committed = false;
  try {
    const { data, error } = await db.rpc('persist_nfe_cancellation_result', {
      p_document_id: doc.id,
      p_event_id: eventId,
      p_environment: Number(doc.ambiente),
      p_status: eventStatus,
      p_response_xml: responseXml,
      p_cstat: result.cStat,
      p_reason: result.xMotivo,
      p_protocol: result.protocolNumber,
      p_protocol_date: result.protocolDate,
    });
    committed = !error && data?.eventId === eventId && data?.status === eventStatus;
  } catch {
    // A lost database response does not prove rollback or undo the SEFAZ result.
  }
  if (!committed)
    return {
      status: 503,
      body: {
        success: false,
        pending: true,
        sefazConfirmed: result.registered,
        reconciliationRequired: true,
        error:
          'O resultado fiscal precisa de reconciliação: a gravação local não foi confirmada. Não retransmita.',
      },
    };
  return {
    status: result.registered ? 200 : result.pending ? 202 : 422,
    body: {
      success: result.registered,
      pending: result.pending,
      status: result.registered ? 'cancelada' : undefined,
      cStat: result.cStat,
      xMotivo: result.xMotivo,
      protocolNumber: result.protocolNumber,
      protocolDate: result.protocolDate,
      reconciliationRequired: result.pending,
    },
  };
}
