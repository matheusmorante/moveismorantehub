import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { buildNfeCceXml, validateNfeCce } from '../../erp/src/pages/utils/nfe/nfeCce';
import {
  findRegisteredSefazCceEvent,
  parseSefazCceEvent,
} from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { isNfeProductionEnabled } from './productionGuard';
import { extractCertificateAndKey, signNfeEventXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';
const eventEndpoints = {
  1: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
  2: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
} as const;
const queryEndpoints = {
  1: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
  2: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
} as const;
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

type FiscalDocument = {
  id: string;
  modelo: string;
  ambiente: number;
  status: string;
  chave_acesso: string;
  xml_nfe: string | null;
  numero_protocolo: string | null;
};

type CceEvent = {
  id: string;
  event_sequence: number;
  attempt_number: number;
  status: 'transmitting' | 'registered' | 'rejected' | 'unknown';
  justification: string;
  request_id: string | null;
  requested_at: string;
  cstat: string | null;
  xmotivo: string | null;
  protocol_number: string | null;
  protocol_date: string | null;
};

const getDocument = async (db: any, documentId: string) => {
  const { data, error } = await db
    .from('nfe_documents')
    .select('id,modelo,ambiente,status,chave_acesso,xml_nfe,numero_protocolo')
    .eq('id', documentId)
    .maybeSingle();
  return { document: data as FiscalDocument | null, error };
};

const getCceEvents = async (db: any, documentId: string) => {
  const { data, error } = await db
    .from('nfe_document_events')
    .select(
      'id,event_sequence,attempt_number,status,justification,request_id,requested_at,cstat,xmotivo,protocol_number,protocol_date'
    )
    .eq('document_id', documentId)
    .eq('event_type', '110110')
    .order('attempt_number', { ascending: false })
    .limit(100);
  return { events: (data || []) as CceEvent[], error };
};

const readProductionConfirmation = (req: VercelRequest) => req.body?.productionConfirmed === true;

const pendingResponse = (res: VercelResponse, message: string, cStat: string | null = null) =>
  res.status(202).json({ success: false, pending: true, cStat, error: message });

async function reconcilePendingEvent(
  db: any,
  document: FiscalDocument,
  event: CceEvent,
  res: VercelResponse,
  force: boolean
) {
  if (!force && Date.now() - new Date(event.requested_at).getTime() < 30_000)
    return pendingResponse(
      res,
      'A transmissão da CC-e ainda pode estar em andamento. Aguarde antes de consultar novamente.'
    );

  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx)
    return pendingResponse(
      res,
      'Certificado indisponível para consultar a tentativa. Nenhum novo evento foi enviado.'
    );

  let consultationXml: string;
  try {
    const certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
    const requestXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${document.ambiente}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${document.chave_acesso}</chNFe></consSitNFe>`;
    consultationXml = await sendSoapToSefaz({
      url: queryEndpoints[document.ambiente as 1 | 2],
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: requestXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
  } catch {
    return pendingResponse(
      res,
      'A consulta não confirmou o resultado da CC-e. A tentativa permanece bloqueada para evitar duplicidade.'
    );
  }

  const registeredEvent = findRegisteredSefazCceEvent(consultationXml, event.event_sequence);
  if (!registeredEvent?.registered)
    return pendingResponse(
      res,
      registeredEvent?.xMotivo ||
        'A SEFAZ ainda não confirmou a CC-e desta sequência. Não retransmita enquanto o resultado estiver incerto.',
      registeredEvent?.cStat || null
    );

  const { error } = await db
    .from('nfe_document_events')
    .update({
      status: 'registered',
      response_xml: consultationXml,
      cstat: registeredEvent.cStat,
      xmotivo: registeredEvent.xMotivo,
      protocol_number: registeredEvent.protocolNumber,
      protocol_date: registeredEvent.protocolDate,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', event.id)
    .in('status', ['transmitting', 'unknown']);

  return res.status(error ? 503 : 200).json({
    success: true,
    pending: Boolean(error),
    reconciled: true,
    sequence: event.event_sequence,
    cStat: registeredEvent.cStat,
    xMotivo: registeredEvent.xMotivo,
    protocolNumber: registeredEvent.protocolNumber,
    reconciliationRequired: Boolean(error),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(String(req.method)))
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const db = createClient(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });

  const queryDocumentId = Array.isArray(req.query?.documentId)
    ? req.query.documentId[0]
    : req.query?.documentId;
  const documentId = String(
    req.method === 'GET' ? queryDocumentId || '' : req.body?.documentId || ''
  );
  if (!documentId)
    return res.status(400).json({ success: false, error: 'Documento fiscal não informado.' });

  try {
    const { document, error: documentError } = await getDocument(db, documentId);
    if (documentError || !document)
      return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });
    if (document.modelo !== '55')
      return res
        .status(409)
        .json({ success: false, error: 'CC-e só pode ser emitida para NF-e modelo 55.' });
    if (
      ![1, 2].includes(Number(document.ambiente)) ||
      !/^\d{44}$/.test(document.chave_acesso || '')
    )
      return res
        .status(409)
        .json({ success: false, error: 'Ambiente ou chave de acesso inválidos.' });
    if (!['autorizada', 'homologada'].includes(document.status))
      return res
        .status(409)
        .json({ success: false, error: 'A NF-e precisa estar autorizada para receber CC-e.' });

    const { events, error: eventsError } = await getCceEvents(db, document.id);
    if (eventsError)
      return res
        .status(503)
        .json({ success: false, error: 'Não foi possível consultar o histórico de CC-e.' });
    const latest = events[0] || null;
    const latestRegistered = events.find((event) => event.status === 'registered') || null;

    if (req.method === 'GET') {
      const pendingEvent =
        latest && ['transmitting', 'unknown'].includes(latest.status) ? latest : null;
      const nextSequence = pendingEvent
        ? null
        : latest?.status === 'registered'
          ? latest.event_sequence + 1
          : latest?.status === 'rejected'
            ? latest.event_sequence
            : 1;
      return res.status(200).json({
        success: true,
        previousCorrection: latestRegistered?.justification || '',
        previousSequence: latestRegistered?.event_sequence || null,
        nextSequence,
        pending: pendingEvent
          ? {
              id: pendingEvent.id,
              status: pendingEvent.status,
              sequence: pendingEvent.event_sequence,
            }
          : null,
        sequenceLimitReached: nextSequence !== null && nextSequence > 20,
      });
    }

    const action = String(req.body?.action || 'transmit');
    if (action === 'reconcile') {
      if (!latest || !['transmitting', 'unknown'].includes(latest.status))
        return res
          .status(409)
          .json({ success: false, error: 'Não há CC-e pendente para consultar.' });
      return reconcilePendingEvent(db, document, latest, res, true);
    }

    if (action !== 'transmit')
      return res.status(400).json({ success: false, error: 'Ação da CC-e inválida.' });

    const requestId = String(req.body?.requestId || '');
    if (!isUuid(requestId))
      return res
        .status(400)
        .json({ success: false, error: 'Identificador da solicitação inválido.' });

    const { data: previousRequest, error: requestLookupError } = await db
      .from('nfe_document_events')
      .select(
        'id,event_sequence,attempt_number,status,justification,request_id,requested_at,cstat,xmotivo,protocol_number,protocol_date'
      )
      .eq('document_id', document.id)
      .eq('event_type', '110110')
      .eq('request_id', requestId)
      .maybeSingle();
    if (requestLookupError)
      return res
        .status(503)
        .json({ success: false, error: 'Não foi possível verificar a solicitação anterior.' });
    if (previousRequest) {
      const previous = previousRequest as CceEvent;
      if (previous.status === 'registered')
        return res.status(200).json({
          success: true,
          alreadyProcessed: true,
          sequence: previous.event_sequence,
          cStat: previous.cstat,
          xMotivo: previous.xmotivo,
          protocolNumber: previous.protocol_number,
        });
      if (previous.status === 'rejected')
        return res.status(422).json({
          success: false,
          cStat: previous.cstat,
          xMotivo: previous.xmotivo || 'A SEFAZ rejeitou a CC-e.',
        });
      return reconcilePendingEvent(db, document, previous, res, false);
    }

    if (latest && ['transmitting', 'unknown'].includes(latest.status))
      return reconcilePendingEvent(db, document, latest, res, false);

    const correction = String(req.body?.correction || '').trim();
    const correctionError = validateNfeCce(correction);
    if (correctionError) return res.status(400).json({ success: false, error: correctionError });
    if (Number(document.ambiente) === 1 && !readProductionConfirmation(req))
      return res
        .status(400)
        .json({ success: false, error: 'Confirme explicitamente a CC-e em Produção.' });
    if (
      Number(document.ambiente) === 1 &&
      !isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED)
    )
      return res.status(503).json({
        success: false,
        error: 'Eventos fiscais em Produção estão desabilitados neste servidor.',
      });

    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    if (!pfx)
      return res
        .status(503)
        .json({ success: false, error: 'Certificado digital do emitente não configurado.' });
    if (!document.xml_nfe)
      return res
        .status(409)
        .json({ success: false, error: 'XML original da NF-e não está disponível.' });
    const issuerCnpj = document.xml_nfe.match(/<emit\b[^>]*>[\s\S]*?<CNPJ>(\d{14})<\/CNPJ>/i)?.[1];
    if (!issuerCnpj)
      return res
        .status(409)
        .json({ success: false, error: 'CNPJ do emitente não encontrado no XML original.' });

    const sequence =
      latest?.status === 'rejected' ? latest.event_sequence : (latest?.event_sequence || 0) + 1;
    if (sequence > 20)
      return res
        .status(409)
        .json({ success: false, error: 'A NF-e já atingiu o limite de 20 CC-e.' });

    const certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
    const eventXml = buildNfeCceXml({
      accessKey: document.chave_acesso,
      environment: document.ambiente as 1 | 2,
      issuerCnpj,
      sequence,
      correction,
      issuedAt: new Date().toISOString(),
      batchId: `${randomInt(0, 1_000_000_000_000).toString().padStart(12, '0')}${randomInt(0, 1000).toString().padStart(3, '0')}`,
    });
    const signedXml = signNfeEventXml(
      eventXml,
      certificate.privateKeyPem,
      certificate.certDerBase64
    );
    const { data: reservation, error: reservationError } = await db.rpc('reserve_nfe_cce_event', {
      p_document_id: document.id,
      p_environment: document.ambiente,
      p_event_sequence: sequence,
      p_correction: correction,
      p_signed_xml: signedXml,
      p_user_id: authorization.userId,
      p_request_id: requestId,
    });
    if (reservationError) {
      const message = String(reservationError.message || '');
      if (message.includes('CCE_PREVIOUS_EVENT_PENDING'))
        return res.status(409).json({
          success: false,
          pending: true,
          error:
            'Existe uma CC-e anterior com resultado incerto. Consulte a SEFAZ antes de continuar.',
        });
      if (message.includes('CCE_SEQUENCE_LIMIT'))
        return res
          .status(409)
          .json({ success: false, error: 'A NF-e já atingiu o limite de 20 CC-e.' });
      if (message.includes('CCE_SEQUENCE_CHANGED'))
        return res.status(409).json({
          success: false,
          error: 'A sequência de CC-e mudou. Atualize o histórico e tente novamente.',
        });
      if (message.includes('NFE_DOCUMENT_NOT_FOUND'))
        return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });
      if (message.includes('CCE_REQUIRES_MODEL_55'))
        return res
          .status(409)
          .json({ success: false, error: 'CC-e só pode ser emitida para NF-e modelo 55.' });
      if (
        message.includes('CCE_ENVIRONMENT_MISMATCH') ||
        message.includes('CCE_REQUIRES_AUTHORIZED_NFE')
      )
        return res.status(409).json({
          success: false,
          error: 'O documento fiscal mudou de ambiente ou não está mais autorizado.',
        });
      return res
        .status(503)
        .json({ success: false, error: 'Não foi possível reservar a transmissão da CC-e.' });
    }

    const reservationRow = Array.isArray(reservation) ? reservation[0] : reservation;
    if (!reservationRow?.event_id || reservationRow.created !== true)
      return res.status(503).json({
        success: false,
        pending: true,
        error: 'A solicitação já está em processamento; consulte o resultado antes de repetir.',
      });

    let responseXml: string;
    try {
      responseXml = await sendSoapToSefaz({
        url: eventEndpoints[document.ambiente as 1 | 2],
        action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
        serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4',
        xmlPayload: signedXml,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem,
      });
    } catch {
      await db
        .from('nfe_document_events')
        .update({
          status: 'unknown',
          xmotivo: 'Transmissão iniciada sem confirmação da resposta da SEFAZ.',
        })
        .eq('id', reservationRow.event_id)
        .eq('status', 'transmitting');
      return pendingResponse(
        res,
        'Resultado incerto após o envio. Consulte a SEFAZ antes de qualquer nova tentativa.'
      );
    }

    const result = parseSefazCceEvent(responseXml);
    const status = result.registered ? 'registered' : result.pending ? 'unknown' : 'rejected';
    const { error: persistError } = await db
      .from('nfe_document_events')
      .update({
        status,
        response_xml: responseXml,
        cstat: result.cStat,
        xmotivo: result.xMotivo,
        protocol_number: result.protocolNumber,
        protocol_date: result.protocolDate,
        confirmed_at: result.registered ? new Date().toISOString() : null,
      })
      .eq('id', reservationRow.event_id)
      .eq('status', 'transmitting');
    if (persistError)
      return res.status(503).json({
        success: result.registered,
        pending: true,
        sequence,
        cStat: result.cStat,
        error: result.registered
          ? 'A SEFAZ registrou a CC-e, mas a atualização do histórico precisa de reconciliação.'
          : 'Não foi possível salvar o retorno da SEFAZ; o resultado deve ser reconciliado antes de repetir.',
      });
    if (result.registered)
      return res.status(200).json({
        success: true,
        sequence,
        cStat: result.cStat,
        xMotivo: result.xMotivo,
        protocolNumber: result.protocolNumber,
        protocolDate: result.protocolDate,
      });
    if (result.pending)
      return pendingResponse(
        res,
        result.xMotivo ||
          'A SEFAZ não confirmou o vínculo da CC-e à NF-e. Consulte antes de repetir.',
        result.cStat
      );
    return res.status(422).json({
      success: false,
      cStat: result.cStat,
      xMotivo: result.xMotivo || 'A SEFAZ rejeitou a CC-e.',
    });
  } catch (error: unknown) {
    console.error(
      '[NF-e CC-e] Falha no fluxo fiscal:',
      error instanceof Error ? error.message : 'erro desconhecido'
    );
    return res.status(500).json({ success: false, error: 'Erro interno ao processar a CC-e.' });
  }
}
