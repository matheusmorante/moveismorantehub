import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { ORDER_EDIT_CCE_DISABLED_REASON } from '../../erp/src/pages/utils/nfe/orderEditFiscalPolicy';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { findRegisteredSefazCceEvent } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { extractCertificateAndKey } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';

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
      url: getNfeServiceEndpoint('55', document.ambiente, 'NFeConsultaProtocolo4'),
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
      return res.status(200).json({
        success: true,
        previousCorrection: latestRegistered?.justification || '',
        previousSequence: latestRegistered?.event_sequence || null,
        nextSequence: null,
        creationDisabled: true,
        creationDisabledReason: ORDER_EDIT_CCE_DISABLED_REASON,
        pending: pendingEvent
          ? {
              id: pendingEvent.id,
              status: pendingEvent.status,
              sequence: pendingEvent.event_sequence,
            }
          : null,
        sequenceLimitReached: false,
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

    return res.status(409).json({
      success: false,
      code: 'CCE_DISABLED_BY_ORDER_EDIT_POLICY',
      error: ORDER_EDIT_CCE_DISABLED_REASON,
    });

  } catch (error: unknown) {
    console.error(
      '[NF-e CC-e] Falha no fluxo fiscal:',
      error instanceof Error ? error.message : 'erro desconhecido'
    );
    return res.status(500).json({ success: false, error: 'Erro interno ao processar a CC-e.' });
  }
}
