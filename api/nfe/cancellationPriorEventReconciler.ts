import type { SupabaseClient } from '@supabase/supabase-js';
import {
  decideCancellationRecovery,
  parseSefazNfeSituation,
} from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';
import { matchesConsultedDocument } from './consultAuthorizedDocument';
import { persistCancellationResult } from './cancellationPersistence';
import { sendSoapToSefaz } from './sefazClient';
import { extractCertificateAndKey } from './nfeSigner';

export interface PriorCancellationEvent {
  id: string;
  status: 'transmitting' | 'registered' | 'rejected' | 'unknown';
  cstat: string | null;
  xmotivo: string | null;
  protocol_number: string | null;
  requested_at: string;
  attempt_number: number;
}

export interface ReconcilePriorEventParams {
  supabase: SupabaseClient;
  doc: {
    id: string;
    ambiente: number;
    chave_acesso: string;
    modelo: string;
    numero_protocolo: string | null;
  };
  priorEvent: PriorCancellationEvent;
  pfxBase64?: string;
  pfxPassword?: string;
}

export interface ReconcilePriorEventResult {
  action: 'proceed' | 'response';
  response?: {
    status: number;
    body: Record<string, unknown>;
  };
}

/**
 * Reconcilia eventos de cancelamento anteriores antes de permitir nova transmissão à SEFAZ.
 * Invariante FISCAL-004 e FISCAL-006: Timeout de transmissão não autoriza novo envio direto sem consulta prévia.
 */
export async function reconcilePriorCancellationEvent(
  params: ReconcilePriorEventParams
): Promise<ReconcilePriorEventResult> {
  const { supabase, doc, priorEvent, pfxBase64, pfxPassword } = params;

  if (
    priorEvent.status === 'transmitting' &&
    Date.now() - new Date(priorEvent.requested_at).getTime() < 30_000
  ) {
    return {
      action: 'response',
      response: {
        status: 202,
        body: {
          success: false,
          pending: true,
          error:
            'A transmissão anterior ainda pode estar em andamento; aguarde antes de consultar novamente.',
        },
      },
    };
  }

  // Timeout/rejeição nunca autoriza reenvio por si só: consulte a situação atual na SEFAZ.
  if (!pfxBase64) {
    return {
      action: 'response',
      response: {
        status: 503,
        body: {
          success: false,
          pending: true,
          error: 'Certificado indisponível para reconciliar; nenhum novo evento foi enviado.',
        },
      },
    };
  }

  const certificate = extractCertificateAndKey(pfxBase64, pfxPassword || '');
  const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${Number(doc.ambiente)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  const consultationStartedAt = new Date().toISOString();
  let situationXml: string;
  try {
    situationXml = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(String(doc.modelo), Number(doc.ambiente), 'NFeConsultaProtocolo4'),
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: queryXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
  } catch {
    return {
      action: 'response',
      response: {
        status: 502,
        body: {
          success: false,
          pending: true,
          error:
            'Consulta SEFAZ falhou; resultado continua incerto e nenhum novo evento foi transmitido.',
        },
      },
    };
  }

  const situation = parseSefazNfeSituation(situationXml);
  if (
    ['authorized', 'cancelled'].includes(situation.state) &&
    !matchesConsultedDocument(situationXml, doc, situation.state === 'cancelled' ? '101' : '100')
  ) {
    return {
      action: 'response',
      response: {
        status: 202,
        body: {
          success: false,
          pending: true,
          reconciliationRequired: true,
          error:
            'Consulta sem identidade fiscal correspondente. Nenhum documento foi alterado ou evento retransmitido.',
        },
      },
    };
  }

  const recoveryDecision = decideCancellationRecovery(priorEvent.status, situation.state);
  if (recoveryDecision === 'already_cancelled') {
    const persisted = await persistCancellationResult(supabase, doc, priorEvent.id, situationXml);
    return {
      action: 'response',
      response: {
        status: persisted.status,
        body: persisted.body,
      },
    };
  }

  if (recoveryDecision === 'retry_after_authorized_consult' && priorEvent.status !== 'rejected') {
    const { error } = await supabase.rpc('persist_nfe_cancellation_result', {
      p_document_id: doc.id,
      p_event_id: priorEvent.id,
      p_environment: Number(doc.ambiente),
      p_status: 'rejected',
      p_response_xml: situationXml,
      p_cstat: '100',
      p_reason: 'Consulta confirmou autorização ativa sem cancelamento registrado.',
      p_protocol: null,
      p_protocol_date: null,
      p_consultation_started_at: consultationStartedAt,
    });
    if (error) {
      return {
        action: 'response',
        response: {
          status: 503,
          body: {
            success: false,
            pending: true,
            error:
              'Não foi possível reconciliar a tentativa anterior. Nenhum evento foi reenviado.',
          },
        },
      };
    }
  }

  if (recoveryDecision === 'still_uncertain') {
    return {
      action: 'response',
      response: {
        status: 202,
        body: {
          success: false,
          pending: true,
          cStat: situation.cStat,
          error:
            'A consulta não confirmou nem cancelamento nem autorização ativa. Nenhum novo evento foi enviado.',
        },
      },
    };
  }

  if (recoveryDecision === 'manual_reconciliation') {
    return {
      action: 'response',
      response: {
        status: 409,
        body: {
          success: false,
          pending: true,
          cStat: situation.cStat,
          error:
            'O histórico local já registra evento aceito, mas a consulta ainda não o reflete. Não retransmita; reconciliação fiscal necessária.',
        },
      },
    };
  }

  return { action: 'proceed' };
}
