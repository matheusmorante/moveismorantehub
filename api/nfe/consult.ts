import { ACCESS_KEY_PATTERN } from '../../shared-utils/fiscalIdentifiers.js';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { randomUUID } from 'node:crypto';
import { sefazTransportDiagnostic } from './sefazTransportDiagnostic';
import { reconcileLegacyConsultation } from './reconcileLegacyConsultation';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { retryHmlTechnical, consultAuthorizedHmlTechnical, isHmlRuleSet } from './emitHmlTechnical';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';
import { reconcileNormalSale } from './normal-sale/outboundAttempt';
import { readOutboundAttemptStatus } from './normal-sale/outboundStatus';
import { NORMAL_SALE_RULESET_VERSION } from './normal-sale/constants';
import { consultAuthorizedDocument } from './consultAuthorizedDocument';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const supabase = createClient(
    supabaseUrl,
    serviceKey,
    { db: { retry: false } } as Parameters<typeof createClient>[2]
  );
  const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message,
    });

  const emissionRequestId = String(req.body?.emissionRequestId || '');
  if (emissionRequestId) {
    const orderId = String(req.body?.orderId || '');
    const environment = Number(req.body?.environment);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        emissionRequestId
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        orderId
      ) ||
      ![1, 2].includes(environment)
    )
      return res.status(400).json({ success: false, error: 'Identidade da tentativa inválida.' });

    const statusDiagnosticId = randomUUID();
    const lookup = await readOutboundAttemptStatus(
      supabase,
      orderId,
      environment as 1 | 2,
      emissionRequestId,
      statusDiagnosticId
    );
    if (lookup.kind === 'unavailable')
      return res.status(503).json({
        success: false,
        pending: true,
        code: 'FISCAL_ATTEMPT_STATUS_UNAVAILABLE',
        diagnosticStage: 'read-only-attempt-status',
        diagnosticId: lookup.diagnosticId,
        error: 'Não foi possível consultar o estado local da tentativa. Consulte novamente antes de continuar.',
      });
    if (lookup.kind === 'not_found')
      return res.status(200).json({
        success: true,
        code: 'FISCAL_PREPARATION_NOT_PERSISTED',
        state: 'not_found',
        pending: false,
        preparationReconciled: true,
        orderId,
        environment,
        emissionRequestId,
        numberReserved: false,
        sefazContacted: false,
      });
    if (lookup.kind === 'inconsistent')
      return res.status(503).json({
        success: false,
        pending: true,
        code: 'FISCAL_ATTEMPT_STATUS_INCONSISTENT',
        ...(lookup.documentId ? { documentId: lookup.documentId } : {}),
        orderId,
        environment,
        emissionRequestId,
        numberReserved: lookup.numberReserved,
        error: 'Os registros locais desta tentativa estão incompletos. Preserve a tentativa e solicite conferência fiscal antes de continuar.',
      });

    const { attempt, document } = lookup;
    const metadata = {
      documentId: attempt.document_id,
      orderId: attempt.order_id,
      emissionRequestId: attempt.emission_request_id,
      model: attempt.model,
      environment: attempt.environment,
      series: attempt.series,
      nfeNumber: attempt.number,
      numberReserved: true,
      sefazContacted: attempt.transmission_started_at ? undefined : false,
      transmissionStartedAt: attempt.transmission_started_at,
      pending: ['prepared', 'transmitting', 'reconciling'].includes(attempt.state),
      state: attempt.state,
    };

    if (attempt.state === 'authorized') {
      if (!['autorizada', 'homologada'].includes(document.status) || !document.numero_protocolo)
        return res.status(503).json({
          success: false,
          pending: true,
          code: 'FISCAL_ATTEMPT_STATUS_INCONSISTENT',
          ...metadata,
          error: 'O estado local do documento diverge da tentativa. Preserve-a para conferência fiscal.',
        });
      return res.status(200).json({
        success: true,
        ...metadata,
        state: 'authorized',
        pending: false,
        protocolNumber: document.numero_protocolo || undefined,
      });
    }
    if (attempt.state === 'rejected') {
      if (document.status !== 'erro')
        return res.status(503).json({
          success: false,
          pending: true,
          code: 'FISCAL_ATTEMPT_STATUS_INCONSISTENT',
          ...metadata,
          error: 'O estado local do documento diverge da tentativa. Preserve-a para conferência fiscal.',
        });
      return res.status(200).json({
        success: true,
        code: 'FISCAL_SEFAZ_REJECTED',
        ...metadata,
        pending: false,
        state: 'rejected',
        error: 'A tentativa está registrada como rejeitada. Consulte o motivo no documento fiscal.',
      });
    }
    if (attempt.state === 'confirmed_not_found') {
      if (document.status !== 'erro')
        return res.status(503).json({
          success: false,
          pending: true,
          code: 'FISCAL_ATTEMPT_STATUS_INCONSISTENT',
          ...metadata,
          error: 'O estado local do documento diverge da tentativa. Preserve-a para conferência fiscal.',
        });
      return res.status(200).json({
        success: true,
        code: 'FISCAL_CONFIRMED_NOT_FOUND',
        ...metadata,
        pending: false,
        state: 'not_found',
      });
    }

    return res.status(200).json({
      success: true,
      ...metadata,
      databaseReason:
        attempt.state === 'prepared' && !attempt.transmission_started_at
          ? 'PREPARED_ATTEMPT_FOUND'
          : 'ATTEMPT_STATUS_FOUND',
      error:
        attempt.state === 'prepared' && !attempt.transmission_started_at
          ? 'A tentativa foi gravada e reservou o número; a transmissão ainda não começou.'
          : 'A tentativa foi gravada e pode já ter iniciado a transmissão. Consulte o estado fiscal antes de continuar.',
    });
  }

  const documentId = String(req.body?.documentId || '');
  if (!documentId)
    return res.status(400).json({ success: false, error: 'Documento fiscal não informado.' });
  try {
    const { data: doc, error } = await supabase
      .from('nfe_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();
    if (error || !doc)
      return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });
    if (doc.fiscal_ruleset_version === NORMAL_SALE_RULESET_VERSION) {
      const result = ['autorizada', 'homologada'].includes(doc.status)
        ? await consultAuthorizedDocument(doc)
        : await reconcileNormalSale(supabase, doc.id);
      return res.status(result.status).json(result.body);
    }
    if (isHmlRuleSet(doc.fiscal_ruleset_version)) {
      const result =
        doc.status === 'homologada'
          ? await consultAuthorizedHmlTechnical(doc)
          : await retryHmlTechnical(supabase, doc.id, false);
      return res.status(result.status).json({
        ...result.body,
        state: result.body.success
          ? 'authorized'
          : ['HML_CONFIRMED_NOT_FOUND', 'HML_NEW_EMISSION_REQUIRED'].includes(
                String(result.body.code)
              )
            ? 'not_found'
            : 'unknown',
      });
    }
    const model = String(doc.modelo) as '55' | '65';
    const environment = Number(doc.ambiente) as 1 | 2;
    const accessKey = String(doc.chave_acesso || '');
    if (!['55', '65'].includes(model) || ![1, 2].includes(environment) || !ACCESS_KEY_PATTERN.test(accessKey)) {
      return res
        .status(409)
        .json({ success: false, error: 'Modelo, ambiente ou chave de acesso inválidos.' });
    }
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx)
      return res
        .status(503)
        .json({ success: false, error: 'Certificado digital do emitente não configurado.' });
    const certificate = extractCertificateAndKey(pfx, password || '');
    const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
    const consultationStartedAt = new Date().toISOString();
    const responseXml = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(model, environment, 'NFeConsultaProtocolo4'),
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: queryXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
    const result = await reconcileLegacyConsultation(supabase, doc, responseXml, consultationStartedAt);
    return res.status(result.status).json(result.body);
  } catch (err: any) {
    const diagnosticId = randomUUID();
    const transportDiagnostic = sefazTransportDiagnostic(err);
    console.error('[NF-e Consult] Falha de transporte:', {
      documentId,
      diagnosticId,
      ...transportDiagnostic,
    });
    return res.status(502).json({
      success: false,
      pending: true,
      diagnosticId,
      diagnosticStage: 'sefaz-consultation',
      transportDiagnostic,
      error:
        'Não foi possível confirmar a situação do documento na SEFAZ. Nenhum novo evento foi enviado.',
    });
  }
}
