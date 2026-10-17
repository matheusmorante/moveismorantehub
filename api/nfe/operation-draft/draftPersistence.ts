import type { VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  decideOperationDraftRecovery,
  parseSefazNfeSituation,
} from '../../../erp/src/pages/utils/nfe/nfeEventRules';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';
import { getNfeServiceEndpoint } from '../fiscalEnvironmentPolicy';
import { sendSoapToSefaz } from '../sefazClient';
import type { DraftRecord } from './draftValidation';
import { type Environment, getPersistableItems } from './draftXmlAudit';

export interface CertificateCredentials {
  certPem: string;
  privateKeyPem: string;
}

export async function consultDraftKey(
  accessKey: string,
  environment: Environment,
  certificate: CertificateCredentials
): Promise<string> {
  const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
  return sendSoapToSefaz({
    url: getNfeServiceEndpoint('55', environment, 'NFeConsultaProtocolo4'),
    action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
    serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
    xmlPayload: queryXml,
    certPem: certificate.certPem,
    privateKeyPem: certificate.privateKeyPem,
  });
}

export async function persistDraftAuthorized(params: {
  res: VercelResponse;
  db: SupabaseClient<FiscalDatabase>;
  draft: DraftRecord;
  lines: Array<Record<string, unknown>>;
  environment: Environment;
  responseXml: string;
  authorizedAccessKey: string;
  authorizedSignedXml: string;
}) {
  const {
    res,
    db,
    draft,
    lines,
    environment,
    responseXml,
    authorizedAccessKey,
    authorizedSignedXml,
  } = params;

  const authorization = parseSefazAuthorization(responseXml);
  const protocolNumber = authorization.protocolNumber;
  if (!authorization.authorized || !protocolNumber || !/^\d{15}$/.test(protocolNumber)) {
    throw new Error('Consulta não confirmou autorização e protocolo válido da NF-e.');
  }

  const itemSnapshot = getPersistableItems(authorizedSignedXml, lines);
  const { data: documentId, error: persistError } = await db.rpc(
    'persist_authorized_nfe_operation_draft',
    {
      p_draft_id: draft.id,
      p_document_id: draft.document_id || draft.id,
      p_number: Number(authorizedAccessKey.slice(25, 34)),
      p_series: String(Number(authorizedAccessKey.slice(22, 25))),
      p_access_key: authorizedAccessKey,
      p_signed_xml: authorizedSignedXml,
      p_sefaz_response_xml: responseXml,
      p_protocol_number: protocolNumber,
      p_protocol_date: authorization.protocolDate
        ? new Date(authorization.protocolDate).toISOString()
        : null,
      p_status: environment === 1 ? 'autorizada' : 'homologada',
      p_status_reason: authorization.xMotivo || 'Autorizada pela SEFAZ.',
      p_items: itemSnapshot,
    }
  );

  if (persistError || !documentId) {
    console.error(
      '[NF-e Draft] SEFAZ autorizou, mas a RPC de persistência falhou:',
      persistError?.message || 'sem id'
    );
    return res.status(503).json({
      success: true,
      pending: true,
      reconciliationRequired: true,
      accessKey: authorizedAccessKey,
      protocolNumber,
      error:
        'A SEFAZ autorizou, mas falta reconciliar a gravação local. Consulte novamente; não retransmita.',
    });
  }

  if (draft.operation_kind === 'estorno') {
    const { data: editReplacement, error: editReplacementError } = await db
      .from('nfe_order_edit_replacements')
      .select('id')
      .eq('operation_draft_id', draft.id)
      .maybeSingle();

    const orderEditTableNotInstalled = ['42P01', 'PGRST204', 'PGRST205'].includes(
      String((editReplacementError as { code?: string } | null)?.code || '')
    );

    if (editReplacementError && !orderEditTableNotInstalled) {
      return res.status(503).json({
        success: true,
        pending: true,
        reconciliationRequired: true,
        documentId,
        accessKey: authorizedAccessKey,
        protocolNumber,
        error:
          'O estorno foi autorizado, mas a conclusão da edição do pedido precisa ser retomada. Não retransmita.',
      });
    }

    if (editReplacement && !editReplacementError) {
      const { error: finalizeEditError } = await db.rpc('finalize_fiscal_order_edit', {
        p_replacement_id: editReplacement.id,
      });
      if (finalizeEditError) {
        console.error(
          '[NF-e Draft] Estorno autorizado; conclusão da edição pendente:',
          finalizeEditError.message
        );
        return res.status(503).json({
          success: true,
          pending: true,
          reconciliationRequired: true,
          documentId,
          accessKey: authorizedAccessKey,
          protocolNumber,
          error:
            'O estorno foi autorizado, mas a atualização do pedido está pendente. Retome a edição pelo ERP; não retransmita.',
        });
      }
    }
  }

  return res.status(200).json({
    success: true,
    status: 'authorized',
    documentId,
    accessKey: authorizedAccessKey,
    protocolNumber,
    cStat: authorization.cStat,
    xMotivo: authorization.xMotivo,
  });
}

export async function reconcileStoredDraftAttempt(params: {
  res: VercelResponse;
  db: SupabaseClient<FiscalDatabase>;
  draft: DraftRecord;
  lines: Array<Record<string, unknown>>;
  environment: Environment;
  certificate: CertificateCredentials;
  allowRetryAfterNotFound: boolean;
}) {
  const {
    res,
    db,
    draft,
    lines,
    environment,
    certificate,
    allowRetryAfterNotFound,
  } = params;

  if (!draft.access_key || !draft.signed_xml) {
    return res.status(409).json({
      success: false,
      pending: true,
      error:
        'Tentativa sem chave/XML persistidos; requer reconciliação manual e não pode ser retransmitida.',
    });
  }

  let queryXml: string;
  try {
    queryXml = await consultDraftKey(draft.access_key, environment, certificate);
  } catch (error) {
    console.error(
      '[NF-e Draft] Consulta após tentativa inconclusiva falhou:',
      error instanceof Error ? error.message : 'erro desconhecido'
    );
    return res.status(502).json({
      success: false,
      pending: true,
      accessKey: draft.access_key,
      error: 'Não foi possível reconciliar a tentativa na SEFAZ. Nenhuma retransmissão foi feita.',
    });
  }

  const situation = parseSefazNfeSituation(queryXml);
  const recoveryDecision = decideOperationDraftRecovery(situation.cStat, situation.state);

  if (recoveryDecision === 'authorized') {
    return persistDraftAuthorized({
      res,
      db,
      draft,
      lines,
      environment,
      responseXml: queryXml,
      authorizedAccessKey: draft.access_key,
      authorizedSignedXml: draft.signed_xml,
    });
  }

  if (recoveryDecision === 'confirmed_not_found' && allowRetryAfterNotFound) {
    const { data: ready, error } = await db
      .from('nfe_operation_drafts')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', draft.id)
      .in('status', ['transmitting', 'unknown'])
      .select('id')
      .maybeSingle();

    if (error || !ready) {
      return res.status(503).json({
        success: false,
        pending: true,
        accessKey: draft.access_key,
        error:
          'A SEFAZ não localizou a chave, mas não foi possível liberar a repetição segura. Tente consultar novamente.',
      });
    }

    return res.status(409).json({
      success: false,
      retryAllowed: true,
      status: 'ready',
      accessKey: draft.access_key,
      error:
        'A consulta à SEFAZ retornou cStat 217 (chave não localizada). Uma nova tentativa poderá reutilizar exatamente a mesma chave e XML.',
    });
  }

  return res.status(202).json({
    success: false,
    pending: true,
    accessKey: draft.access_key,
    cStat: situation.cStat,
    error: situation.xMotivo || 'A SEFAZ ainda não confirmou a situação. Não retransmita.',
  });
}
