import { ACCESS_KEY_PATTERN } from '../../shared-utils/fiscalIdentifiers.js';
import { createHash } from 'node:crypto';
import { DOMParser } from '@xmldom/xmldom';
import { parseSefazNfeSituation } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';
import { extractCertificateAndKey } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';

interface AuthorizedDocument {
  id: string;
  order_id: string | null;
  modelo: string;
  ambiente: number;
  status: string;
  chave_acesso: string;
  numero_protocolo: string | null;
}

export function matchesConsultedDocument(
  response: string,
  doc: Pick<AuthorizedDocument, 'ambiente' | 'chave_acesso' | 'numero_protocolo'>,
  currentStatus: '100' | '101' = '100'
): boolean {
  try {
    if (/<!DOCTYPE|<!ENTITY/i.test(response)) return false;
    const errors: string[] = [];
    const xml = new DOMParser({
      errorHandler: (level, message) => {
        if (level === 'warning' && String(message).includes('errorHandler') && String(message).includes('deprecated')) return;
        errors.push(String(message));
      },
    }).parseFromString(response, 'text/xml');
    if (!xml || errors.length) return false;
    const results = xml.getElementsByTagNameNS('*', 'retConsSitNFe');
    if (results.length !== 1) return false;
    const result = results[0];
    const directValue = (element: typeof result, name: string) => {
      const children = Array.from(element.childNodes).filter(
        (node) => node.nodeType === 1 && 'localName' in node && node.localName === name
      );
      return children.length === 1 ? children[0].textContent?.trim() : undefined;
    };
    const protocols = result.getElementsByTagNameNS('*', 'infProt');
    return protocols.length === 1 && [result, protocols[0]].every((element) =>
      directValue(element, 'tpAmb') === String(doc.ambiente) &&
      directValue(element, 'chNFe') === doc.chave_acesso
    ) && directValue(result, 'cStat') === currentStatus &&
      directValue(protocols[0], 'cStat') === '100' &&
      directValue(protocols[0], 'nProt') === doc.numero_protocolo;
  } catch {
    return false;
  }
}

/** Fresh consultation is read-only: authorization history is never overwritten by a query. */
export async function consultAuthorizedDocument(doc: AuthorizedDocument) {
  const identity = { documentId: doc.id, orderId: doc.order_id, environment: doc.ambiente, model: doc.modelo };
  const failure = (status: number, code: string, error: string, extra: Record<string, unknown> = {}) => ({
    status, body: { ...identity, success: false, code, error, ...extra },
  });
  if (
    !['55', '65'].includes(doc.modelo) || ![1, 2].includes(doc.ambiente) ||
    doc.status !== (doc.ambiente === 1 ? 'autorizada' : 'homologada') ||
    !ACCESS_KEY_PATTERN.test(doc.chave_acesso) || doc.chave_acesso.slice(20, 22) !== doc.modelo ||
    !/^\d{15}$/.test(doc.numero_protocolo || '')
  ) return failure(409, 'FISCAL_AUTHORIZED_DOCUMENT_INVALID', 'Documento autorizado sem identidade fiscal válida para consulta.');

  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure(503, 'FISCAL_CERTIFICATE_UNAVAILABLE', 'Certificado A1 indisponível para consulta.');
  let certificate: ReturnType<typeof extractCertificateAndKey>;
  try {
    certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
  } catch {
    return failure(503, 'FISCAL_CERTIFICATE_INVALID', 'Certificado A1 inválido para consulta.');
  }
  let response: string;
  try {
    response = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(doc.modelo, doc.ambiente, 'NFeConsultaProtocolo4'),
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${doc.ambiente}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
  } catch {
    return failure(502, 'FISCAL_AUTHORIZED_CONSULT_UNKNOWN', 'Consulta sem resposta confirmada. A autorização persistida foi preservada.', {
      pending: true, state: 'unknown', sefazConsulted: false, reconciliationRequired: true,
    });
  }
  const situation = parseSefazNfeSituation(response);
  const parsed = parseSefazAuthorization(response);
  const evidence = {
    sefazConsulted: true, consultedAt: new Date().toISOString(),
    cStat: situation.cStat, xMotivo: situation.xMotivo,
    responseHash: createHash('sha256').update(response).digest('hex'),
  };
  if (situation.state !== 'authorized' || !matchesConsultedDocument(response, doc)) {
    return failure(409, 'FISCAL_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED', 'A consulta divergiu da autorização persistida. Reconcilie a situação fiscal; nenhum documento foi alterado.', {
      ...evidence, pending: true, state: 'unknown', observedState: situation.state, reconciliationRequired: true,
    });
  }
  return { status: 200, body: { ...identity, ...evidence, success: true, state: 'authorized', pending: false, protocolNumber: parsed.protocolNumber, protocolDate: parsed.protocolDate } };
}
