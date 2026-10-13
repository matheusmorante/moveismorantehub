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

  const supabase = createClient(supabaseUrl, serviceKey, { db: { retry: false } });
  const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message,
    });

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
