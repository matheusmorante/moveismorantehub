import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSefazNfeSituation } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { matchesConsultedDocument } from './consultAuthorizedDocument';
import { persistCancellationResult } from './cancellationPersistence';

type LegacyDocument = {
  id: string;
  ambiente: number;
  status: string;
  chave_acesso: string;
  numero_protocolo: string | null;
};

/** Legacy rows remain reachable in Fiscal Documents. No write is allowed on ambiguous evidence. */
export async function reconcileLegacyConsultation(
  db: SupabaseClient,
  doc: LegacyDocument,
  xml: string,
  consultationStartedAt: string
) {
  const situation = parseSefazNfeSituation(xml);
  const protocol = parseSefazAuthorization(xml);
  const uncertain = (error: string) => ({
    status: 409,
    body: {
      success: false,
      pending: true,
      state: 'unknown',
      observedState: situation.state,
      reconciliationRequired: true,
      cStat: situation.cStat,
      error,
    },
  });
  if (!['authorized', 'cancelled'].includes(situation.state) || doc.status === 'cancelada') {
    return uncertain(
      'A consulta não confirma uma transição segura. O histórico fiscal foi preservado.'
    );
  }
  const expectedProtocol = doc.numero_protocolo || protocol.protocolNumber;
  if (
    !/^\d{15}$/.test(expectedProtocol || '') ||
    !matchesConsultedDocument(
      xml,
      {
        ...doc,
        numero_protocolo: expectedProtocol || null,
      },
      situation.state === 'cancelled' ? '101' : '100'
    )
  ) {
    return uncertain(
      'A identidade da consulta divergiu do documento. Nenhum registro foi alterado.'
    );
  }
  const { data: event, error } = await db
    .from('nfe_document_events')
    .select('id,status')
    .eq('document_id', doc.id)
    .eq('event_type', '110111')
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return uncertain('Não foi possível conferir o histórico de cancelamento.');
  if (situation.state === 'cancelled') {
    if (!event?.id)
      return uncertain(
        'Cancelamento externo sem tentativa local vinculada. Reconciliação fiscal necessária.'
      );
    const result = await persistCancellationResult(db, doc, event.id, xml);
    return {
      ...result,
      body: { ...result.body, state: result.body.success ? 'cancelled' : 'unknown' },
    };
  }
  if (event?.status === 'registered') {
    return uncertain(
      'O histórico registra cancelamento, mas a consulta informa autorização. Não retransmita.'
    );
  }
  try {
    const { data: committed, error: commitError } = await db.rpc(
      'persist_nfe_legacy_consultation',
      {
        p_document_id: doc.id,
        p_environment: Number(doc.ambiente),
        p_expected_status: doc.status,
        p_response_xml: xml,
        p_protocol: expectedProtocol,
        p_consultation_started_at: consultationStartedAt,
        p_event_id: event?.id || null,
      }
    );
    if (
      commitError ||
      committed?.documentId !== doc.id ||
      committed?.status !== (Number(doc.ambiente) === 1 ? 'autorizada' : 'homologada')
    )
      return uncertain(
        'A reconciliação local não foi confirmada. Consulte novamente antes de repetir a operação.'
      );
  } catch {
    return uncertain(
      'A resposta da gravação local não foi recebida. Consulte novamente antes de repetir a operação.'
    );
  }
  return {
    status: 200,
    body: {
      success: true,
      state: 'authorized',
      cStat: '100',
      protocolNumber: expectedProtocol,
      protocolDate: protocol.protocolDate,
      cancellationAttemptState: event ? 'not_registered' : undefined,
      reconciliationRequired: false,
    },
  };
}
