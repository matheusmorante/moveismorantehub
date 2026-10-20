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
import { matchesConsultedDocument } from '../consultAuthorizedDocument';
import { matchesSefazAuthorization } from '../authorizationResponseIdentity';
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

export async function executePrepareDraftAttemptRpc(
  db: SupabaseClient<FiscalDatabase>,
  params: {
    draftId: string;
    expectedUpdatedAt: string;
    reviewData: Record<string, unknown>;
    lines: Array<Record<string, unknown>>;
    signedXml: string;
    accessKey: string;
    minimumNumber: number;
  }
) {
  return db.rpc('prepare_nfe_operation_attempt', {
    p_draft_id: params.draftId,
    p_expected_updated_at: params.expectedUpdatedAt,
    p_expected_review_data: params.reviewData,
    p_expected_lines: params.lines,
    p_signed_xml: params.signedXml,
    p_access_key: params.accessKey,
    p_minimum_number: params.minimumNumber,
  });
}

export async function claimReadyDraftForTransmission(
  db: SupabaseClient<FiscalDatabase>,
  params: {
    draftId: string;
    accessKey: string;
    expectedUpdatedAt: string;
  }
) {
  const now = new Date().toISOString();
  return db
    .from('nfe_operation_drafts')
    .update({
      status: 'transmitting',
      transmitted_at: now,
      updated_at: now,
    })
    .eq('id', params.draftId)
    .eq('status', 'ready')
    .eq('access_key', params.accessKey)
    .eq('updated_at', params.expectedUpdatedAt)
    .select('id,updated_at')
    .maybeSingle();
}

export async function confirmDraftTransmissionStart(
  db: SupabaseClient<FiscalDatabase>,
  params: {
    draftId: string;
    accessKey: string;
    transmissionVersion: string;
  }
) {
  const now = new Date().toISOString();
  return db
    .from('nfe_operation_drafts')
    .update({ transmitted_at: now, updated_at: now })
    .eq('id', params.draftId)
    .eq('status', 'transmitting')
    .eq('access_key', params.accessKey)
    .eq('updated_at', params.transmissionVersion)
    .select('id,updated_at')
    .maybeSingle();
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
  if (!authorization.authorized || !protocolNumber || !matchesSefazAuthorization(responseXml, {
    accessKey: authorizedAccessKey, environment, protocolNumber,
  })) {
    return res.status(202).json({
      success: false, pending: true, reconciliationRequired: true, accessKey: authorizedAccessKey,
      error: 'A resposta recebida não confirma a identidade e o protocolo desta nota. Consulte a mesma tentativa; não retransmita.',
    });
  }

  const itemSnapshot = getPersistableItems(authorizedSignedXml, lines);
  const expectedDocumentId = draft.document_id || draft.id;
  let documentId: string | null = null;
  let persistenceConfirmed = false;
  try {
    const result = await db.rpc(
      'persist_authorized_nfe_operation_draft',
      {
        p_draft_id: draft.id,
        p_document_id: expectedDocumentId,
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
    documentId = result.data;
    persistenceConfirmed = !result.error && documentId === expectedDocumentId;
  } catch {
    // A lost RPC response does not prove rollback. Reconcile the same attempt.
  }

  if (!persistenceConfirmed || documentId !== expectedDocumentId) {
    console.error(
      '[NF-e Draft] SEFAZ autorizou, mas a persistência local não foi confirmada.'
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
    // Primary lookup: replacement row pointing directly to this draft.
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

    // Fallback: the operator restarted a rejected estorno attempt. The replacement row
    // still holds the old (rejected) draft ID in operation_draft_id. Search by
    // original_document_id + awaiting_reversal to find the orphaned record and patch it.
    let resolvedReplacement = editReplacement;
    if (!editReplacement && !editReplacementError && draft.original_document_id) {
      const { data: fallbackReplacement, error: fallbackError } = await db
        .from('nfe_order_edit_replacements')
        .select('id')
        .eq('original_document_id', draft.original_document_id)
        .eq('environment', environment)
        .eq('reversal_kind', 'estorno')
        .eq('status', 'awaiting_reversal')
        .maybeSingle();

      if (!fallbackError && fallbackReplacement) {
        // Patch the stale operation_draft_id so future checks (SQL functions) find it.
        await db
          .from('nfe_order_edit_replacements')
          .update({ operation_draft_id: draft.id } as Record<string, unknown>)
          .eq('id', fallbackReplacement.id);
        resolvedReplacement = fallbackReplacement;
      }
    }

    if (resolvedReplacement) {
      const { error: finalizeEditError } = await db.rpc('finalize_fiscal_order_edit', {
        p_replacement_id: resolvedReplacement.id,
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
    draft: requestedDraft,
    lines,
    environment,
    certificate,
    allowRetryAfterNotFound,
  } = params;

  // A prior read can predate reservation, timeout marking or another session.
  const { data: draft, error: draftError } = await db.from('nfe_operation_drafts')
    .select('*').eq('id', requestedDraft.id).maybeSingle();
  if (draftError || !draft || draft.environment !== environment ||
      draft.original_document_id !== requestedDraft.original_document_id ||
      draft.return_order_id !== requestedDraft.return_order_id) {
    return res.status(503).json({ success: false, pending: true,
      error: 'Não foi possível confirmar a tentativa fiscal atual. Atualize a situação antes de repetir.' });
  }
  if (draft.status === 'authorized' && draft.document_id) {
    return res.status(200).json({ success: true, status: 'authorized',
      documentId: draft.document_id, accessKey: draft.access_key });
  }
  if (!['transmitting', 'unknown'].includes(draft.status)) {
    return res.status(409).json({ success: false, pending: true,
      error: 'A tentativa fiscal mudou durante a consulta. Atualize a situação antes de continuar.' });
  }

  if (!draft.access_key || !draft.signed_xml) {
    return res.status(409).json({
      success: false,
      pending: true,
      error:
        'Tentativa sem chave/XML persistidos; requer reconciliação manual e não pode ser retransmitida.',
    });
  }

  let queryXml: string;
  const consultationStartedAt = Date.now();
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
    const protocol = draft.protocol_number || parseSefazAuthorization(queryXml).protocolNumber;
    if (!/^\d{15}$/.test(protocol || '') || !matchesConsultedDocument(queryXml, {
      ambiente: environment, chave_acesso: draft.access_key, numero_protocolo: protocol || null,
    })) {
      return res.status(202).json({ success: false, pending: true, accessKey: draft.access_key,
        error: 'A resposta da consulta não confirma a chave, o ambiente e o protocolo desta nota. Consulte novamente.' });
    }
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
    if (!matchesConsultedDocument(queryXml, {
      ambiente: environment, chave_acesso: draft.access_key, numero_protocolo: null,
    }, '217')) {
      return res.status(202).json({ success: false, pending: true, accessKey: draft.access_key,
        error: 'A resposta da consulta não corresponde à chave e ao ambiente desta nota. A tentativa foi preservada.' });
    }
    const transmittedAt = Date.parse(draft.transmitted_at || '');
    // SOAP can remain in flight for 25s. A query started earlier is not absence proof.
    if (!Number.isFinite(transmittedAt) || consultationStartedAt - transmittedAt < 30_000) {
      return res.status(202).json({ success: false, pending: true, accessKey: draft.access_key,
        error: 'A transmissão ainda pode estar em andamento. Aguarde e consulte novamente; nenhuma repetição foi liberada.' });
    }
    const { data: ready, error } = await db
      .from('nfe_operation_drafts')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', draft.id)
      .eq('access_key', draft.access_key)
      .eq('updated_at', draft.updated_at)
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
