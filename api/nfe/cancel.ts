import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { extractCertificateAndKey, signNfeEventXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { validateCancellationReason } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';
import { validateCancellationAgainstOfficialSchema } from './schemaValidator';
import { persistCancellationResult } from './cancellationPersistence';
import {
  buildCancellationEventXml,
  extractIssuerCnpjFromXml,
} from './cancellationEventXml';
import {
  recordCancellationPreflightFailure,
  validateCancellationDocument,
  validateCancellationOrderAndCirculation,
} from './cancellationPreflight';
import {
  reconcilePriorCancellationEvent,
  type PriorCancellationEvent,
} from './cancellationPriorEventReconciler';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = getSupabaseSecretKey() || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  if (!supabaseServiceKey) {
    return res.status(503).json({
      success: false,
      error: 'Serviço fiscal indisponível: credencial segura do banco não configurada.',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
  if (!fiscalAuthorization.ok) {
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message,
    });
  }

  const documentId = String(req.body?.documentId || '');
  const reason = String(req.body?.reason || '').trim();
  const viaOrderEdit = req.body?.viaOrderEdit === true;
  const orderEditOrderId = String(req.body?.orderId || '');
  const orderEditVersion = String(req.body?.orderUpdatedAt || '');
  const proposedOrder = req.body?.proposedOrder;
  const replacementId = String(req.body?.replacementId || '');
  const productionConfirmed = req.body?.productionConfirmed === true;

  const reasonError = validateCancellationReason(reason);
  if (!documentId || reasonError) {
    return res
      .status(400)
      .json({ success: false, error: reasonError || 'Documento fiscal não informado.' });
  }

  if (
    viaOrderEdit &&
    !replacementId &&
    (!orderEditOrderId ||
      !orderEditVersion ||
      !proposedOrder ||
      typeof proposedOrder !== 'object' ||
      Array.isArray(proposedOrder) ||
      JSON.stringify(proposedOrder).length > 1_000_000)
  ) {
    return res.status(400).json({
      success: false,
      error: 'A confirmação de edição fiscal está incompleta ou excede o limite permitido.',
    });
  }

  try {
    // 1. Validação estrita do documento fiscal
    const docValidation = await validateCancellationDocument({
      supabase,
      documentId,
      productionConfirmed,
    });
    if (!docValidation.ok || !docValidation.doc) {
      return res.status(docValidation.status || 400).json({
        success: false,
        error: docValidation.error,
      });
    }
    const doc = docValidation.doc;
    const cancellationDocument = {
      id: doc.id,
      ambiente: Number(doc.ambiente),
      chave_acesso: doc.chave_acesso,
    };

    // 2. Consulta de eventos de cancelamento prévios (110111)
    const { data: priorEvents, error: priorError } = await supabase
      .from('nfe_document_events')
      .select('id,status,cstat,xmotivo,protocol_number,requested_at,attempt_number')
      .eq('document_id', doc.id)
      .eq('event_type', '110111')
      .order('attempt_number', { ascending: false });

    if (priorError) {
      return res.status(503).json({
        success: false,
        error: 'Não foi possível conferir eventos fiscais anteriores.',
      });
    }

    const priorEvent = (priorEvents?.[0] as PriorCancellationEvent | undefined) || undefined;
    const nextAttemptNumber = Number(priorEvent?.attempt_number || 0) + 1;

    // 3. Se houver tentativa anterior, reconcilia situação na SEFAZ (FISCAL-004 / FISCAL-006)
    if (priorEvent) {
      const reconciliation = await reconcilePriorCancellationEvent({
        supabase,
        doc: {
          ...cancellationDocument,
          modelo: String(doc.modelo),
          numero_protocolo: doc.numero_protocolo,
        },
        priorEvent,
        pfxBase64: process.env.NFE_CERTIFICATE_BASE64,
        pfxPassword: process.env.NFE_CERTIFICATE_PASSWORD,
      });

      if (reconciliation.action === 'response' && reconciliation.response) {
        return res
          .status(reconciliation.response.status)
          .json(reconciliation.response.body);
      }
    }

    // 4. Validação de regras comerciais, circulação física e políticas de prazo
    const orderValidation = await validateCancellationOrderAndCirculation({
      supabase,
      doc,
      userId: fiscalAuthorization.userId || '',
      reason,
      attemptNumber: nextAttemptNumber,
      viaOrderEdit,
      orderEditOrderId,
      orderEditVersion,
      proposedOrder,
      replacementId,
    });
    if (!orderValidation.ok) {
      return res.status(orderValidation.status || 400).json({
        success: false,
        error: orderValidation.error,
      });
    }

    // 5. Carregamento e extração de credenciais do certificado A1
    const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
    const pfxPassword = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfxBase64) {
      await recordCancellationPreflightFailure({
        supabase,
        documentId: doc.id,
        attemptNumber: nextAttemptNumber,
        environment: Number(doc.ambiente),
        reason,
        errorMessage: 'Certificado digital do emitente não configurado.',
        userId: fiscalAuthorization.userId,
      });
      return res.status(503).json({
        success: false,
        error: 'Certificado digital do emitente não configurado.',
      });
    }

    let certificate: ReturnType<typeof extractCertificateAndKey>;
    try {
      certificate = extractCertificateAndKey(pfxBase64, pfxPassword || '');
    } catch {
      await recordCancellationPreflightFailure({
        supabase,
        documentId: doc.id,
        attemptNumber: nextAttemptNumber,
        environment: Number(doc.ambiente),
        reason,
        errorMessage: 'Não foi possível carregar o certificado digital do emitente.',
        userId: fiscalAuthorization.userId,
      });
      return res.status(503).json({
        success: false,
        error: 'Não foi possível carregar o certificado digital do emitente.',
      });
    }

    // 6. Extração de dados e geração do XML do evento 110111
    const issuerCnpj = extractIssuerCnpjFromXml(doc.xml_nfe);
    if (!issuerCnpj) {
      await recordCancellationPreflightFailure({
        supabase,
        documentId: doc.id,
        attemptNumber: nextAttemptNumber,
        environment: Number(doc.ambiente),
        reason,
        errorMessage: 'CNPJ do emitente não encontrado no XML original.',
        userId: fiscalAuthorization.userId,
      });
      return res.status(409).json({
        success: false,
        error: 'CNPJ do emitente não encontrado no XML original.',
      });
    }

    const environment = Number(doc.ambiente);
    const eventXml = buildCancellationEventXml({
      chaveAcesso: doc.chave_acesso,
      environment,
      issuerCnpj,
      protocolNumber: doc.numero_protocolo,
      reason,
    });

    const signedXml = signNfeEventXml(
      eventXml,
      certificate.privateKeyPem,
      certificate.certDerBase64
    );

    // 7. Validação XSD local contra schema oficial antes de envio (FISCAL-010)
    try {
      await validateCancellationAgainstOfficialSchema(signedXml, {
        accessKey: doc.chave_acesso,
        environment,
        protocol: doc.numero_protocolo,
      });
    } catch {
      return res.status(422).json({
        success: false,
        code: 'CANCELLATION_XML_INVALID',
        error: 'XML de cancelamento inválido. Nenhum evento foi transmitido.',
      });
    }

    // 8. Reserva atômica da tentativa de cancelamento no banco (FISCAL-007 / FISCAL-008)
    const { data: reservation, error: reserveError } = await supabase.rpc(
      'reserve_nfe_cancellation_event',
      {
        p_document_id: doc.id,
        p_environment: environment,
        p_signed_xml: signedXml,
        p_reason: reason,
        p_user_id: fiscalAuthorization.userId,
        p_previous_event_id: priorEvent?.id || null,
      }
    );

    const event = reservation?.eventId ? { id: reservation.eventId } : null;
    if (reserveError || !event?.id) {
      return res.status(409).json({
        success: false,
        pending: true,
        error:
          'Outra solicitação pode já estar em andamento. Confira os eventos fiscais antes de repetir.',
      });
    }

    // 9. Transmissão SOAP para a SEFAZ
    let responseXml: string;
    try {
      const url = getNfeServiceEndpoint(String(doc.modelo), environment, 'NFeRecepcaoEvento4');
      responseXml = await sendSoapToSefaz({
        url,
        action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
        serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4',
        xmlPayload: signedXml,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem,
      });
    } catch {
      // Falha de transporte deixa o evento reservado intacto em estado pendente/incerto
      await persistCancellationResult(supabase, cancellationDocument, event.id, '');
      return res.status(502).json({
        success: false,
        pending: true,
        error: 'Resultado incerto após envio à SEFAZ. Não reenvie; consulte a situação fiscal.',
      });
    }

    // 10. Persistência transacional do resultado e retorno ao cliente
    const persisted = await persistCancellationResult(supabase, cancellationDocument, event.id, responseXml);
    return res.status(persisted.status).json(persisted.body);
  } catch (error: any) {
    console.error(
      '[NF-e Cancel] Falha no fluxo de cancelamento fiscal:',
      error?.message || 'erro desconhecido'
    );
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar o evento fiscal de cancelamento.',
    });
  }
}
