import { createHash, randomUUID } from 'node:crypto';
import { ACCESS_KEY_PATTERN } from '../../../shared-utils/fiscalIdentifiers.js';
import { sendSoapToSefaz } from '../sefazClient';
import { extractCertificateAndKey } from '../nfeSigner';
import { sefazTransportDiagnostic } from '../sefazTransportDiagnostic';
import { parseSefazNfeSituation } from '../../../erp/src/pages/utils/nfe/nfeEventRules';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseAuthorizedInvoiceLines } from '../../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import type { Database, Result, HmlDocumentRow } from './types';
import { hmlEndpoint, failure, hasProtocolKey, isHmlRuleSet } from './constants';

export async function consultExisting(
  db: Database,
  doc: HmlDocumentRow,
  cert: ReturnType<typeof extractCertificateAndKey>,
  attemptToken: string
): Promise<Result> {
  const query = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  const response = await sendSoapToSefaz({
    url: hmlEndpoint(doc.modelo, 'NFeConsultaProtocolo4'),
    action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
    serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
    xmlPayload: query,
    certPem: cert.certPem,
    privateKeyPem: cert.privateKeyPem,
  });
  const situation = parseSefazNfeSituation(response);
  if (situation.state === 'not_found') {
    const { error } = await db.rpc('persist_hml_nfe_result', {
      p_document_id: doc.id,
      p_attempt_token: attemptToken,
      p_status: 'erro',
      p_reason: `217: ${situation.xMotivo || 'NF-e não consta na SEFAZ'}`,
      p_response_xml: response,
      p_protocol: null,
      p_items: [],
    });
    if (error)
      return failure(
        503,
        'HML_NOT_FOUND_PERSIST_FAILED',
        'A consulta retornou 217, mas a tentativa precisa de reconciliação.',
        { pending: true, documentId: doc.id }
      );
    return failure(
      409,
      'HML_CONFIRMED_NOT_FOUND',
      '217: NF-e não encontrada. A próxima tentativa deve reutilizar o XML e a chave originais.',
      {
        documentId: doc.id,
        orderId: doc.order_id,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
        state: 'not_found',
        pending: false,
        cStat: situation.cStat,
        xMotivo: situation.xMotivo,
      }
    );
  }
  if (situation.state !== 'authorized') {
    const { error } = await db.rpc('persist_hml_nfe_result', {
      p_document_id: doc.id,
      p_attempt_token: attemptToken,
      // A rejection of the consultation is not a rejection of the transmitted invoice.
      p_status: 'pendente',
      p_reason: `${situation.cStat || 'desconhecido'}: ${situation.xMotivo || 'Consulta inconclusiva'}`,
      p_response_xml: response,
      p_protocol: null,
      p_items: [],
    });
    if (error)
      return failure(
        503,
        'HML_RECONCILIATION_PERSIST_FAILED',
        'Resposta da consulta não persistida; reconciliação obrigatória.',
        { pending: true, documentId: doc.id }
      );
    return failure(
      409,
      'HML_RECONCILIATION_REQUIRED',
      'A consulta não confirmou autorização. Revise a tentativa original antes de retransmitir.',
      {
        pending: true,
        documentId: doc.id,
        accessKey: doc.chave_acesso,
        cStat: situation.cStat,
        xMotivo: situation.xMotivo,
      }
    );
  }
  const parsed = parseSefazAuthorization(response);
  if (!parsed.authorized || !parsed.protocolNumber || !hasProtocolKey(response, doc.chave_acesso))
    return failure(
      502,
      'HML_PROTOCOL_INCOMPLETE',
      'Consulta autorizada sem protocolo verificável.',
      { pending: true, documentId: doc.id }
    );
  const lines = parseAuthorizedInvoiceLines(String(doc.xml_nfe || ''));
  const { error } = await db.rpc('persist_hml_nfe_result', {
    p_document_id: doc.id,
    p_attempt_token: attemptToken,
    p_status: 'homologada',
    p_reason: parsed.xMotivo,
    p_response_xml: response,
    p_protocol: parsed.protocolNumber,
    p_items: lines.map((line) => ({
      item_number: line.invoiceItemNumber,
      product_code: line.productCode,
      description: line.description,
      billed_quantity: line.billedQuantity,
      unit_value: line.unitValue,
      gross_value: line.grossValue,
      discount_value: line.discountValue,
      product_xml: line.productXml,
      taxes_xml: line.taxesXml,
    })),
  });
  if (error)
    return failure(
      503,
      'HML_RECONCILIATION_PERSIST_FAILED',
      'SEFAZ confirmou autorização, mas a persistência precisa de reconciliação.',
      { pending: true, documentId: doc.id }
    );
  return {
    status: 200,
    body: {
      success: true,
      documentId: doc.id,
      orderId: doc.order_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      environment: 2,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate,
      signedXml: doc.xml_nfe,
      cStat: parsed.cStat,
      xMotivo: parsed.xMotivo,
    },
  };
}

/** Performs a fresh, read-only SEFAZ query for a document whose authorization is already final. */
export async function consultAuthorizedHmlTechnical(
  doc: Pick<
    HmlDocumentRow,
    | 'id'
    | 'order_id'
    | 'numero_nfe'
    | 'serie'
    | 'chave_acesso'
    | 'modelo'
    | 'ambiente'
    | 'status'
    | 'numero_protocolo'
    | 'fiscal_ruleset_version'
  > &
    Partial<Pick<HmlDocumentRow, 'emission_request_id'>>
): Promise<Result> {
  if (
    doc.ambiente !== 2 ||
    !['55', '65'].includes(doc.modelo) ||
    doc.status !== 'homologada' ||
    !isHmlRuleSet(doc.fiscal_ruleset_version) ||
    !ACCESS_KEY_PATTERN.test(doc.chave_acesso) ||
    !doc.numero_protocolo
  )
    return failure(
      409,
      'HML_AUTHORIZED_DOCUMENT_INVALID',
      'A consulta direta exige um documento de homologação autorizado com chave e protocolo persistidos.'
    );

  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure(503, 'HML_CERTIFICATE_UNAVAILABLE', 'Certificado A1 não configurado.');
  let cert: ReturnType<typeof extractCertificateAndKey>;
  try {
    cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
  } catch {
    return failure(503, 'HML_CERTIFICATE_INVALID', 'Certificado A1 inválido.');
  }

  const consultedAt = new Date().toISOString();
  const query = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  let response: string;
  try {
    response = await sendSoapToSefaz({
      url: hmlEndpoint(doc.modelo, 'NFeConsultaProtocolo4'),
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: query,
      certPem: cert.certPem,
      privateKeyPem: cert.privateKeyPem,
    });
  } catch (error) {
    const transportDiagnostic = sefazTransportDiagnostic(error);
    const diagnosticId = randomUUID();
    console.error('SEFAZ_HML_AUTHORIZED_CONSULT', {
      documentId: doc.id,
      emissionRequestId: doc.emission_request_id,
      diagnosticId,
      ...transportDiagnostic,
    });
    return failure(
      502,
      'HML_AUTHORIZED_CONSULT_UNKNOWN',
      'A consulta direta à SEFAZ não teve resposta confirmada. A autorização persistida foi preservada.',
      {
        pending: true,
        documentId: doc.id,
        sefazConsulted: false,
        diagnosticId,
        diagnosticStage: 'sefaz-consultation',
        transportDiagnostic,
      }
    );
  }

  const situation = parseSefazNfeSituation(response);
  const parsed = parseSefazAuthorization(response);
  if (
    situation.state !== 'authorized' ||
    !parsed.authorized ||
    parsed.protocolNumber !== doc.numero_protocolo ||
    !hasProtocolKey(response, doc.chave_acesso)
  ) {
    return failure(
      409,
      'HML_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED',
      situation.state === 'cancelled'
        ? 'A consulta encontrou um estado diferente da autorização persistida. Reconciliação fiscal manual necessária; nenhum dado foi sobrescrito.'
        : 'A consulta não confirmou a autorização e o protocolo persistidos. Reconciliação fiscal manual necessária; nenhum dado foi sobrescrito.',
      {
        pending: true,
        documentId: doc.id,
        sefazConsulted: true,
        cStat: situation.cStat || parsed.cStat,
        xMotivo: situation.xMotivo || parsed.xMotivo,
        protocolMatches: parsed.protocolNumber === doc.numero_protocolo,
        responseHash: createHash('sha256').update(response).digest('hex'),
      }
    );
  }

  return {
    status: 200,
    body: {
      success: true,
      state: 'authorized',
      sefazConsulted: true,
      consultedAt,
      documentId: doc.id,
      orderId: doc.order_id,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      environment: 2,
      cStat: parsed.cStat,
      xMotivo: situation.xMotivo || parsed.xMotivo,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate,
      responseHash: createHash('sha256').update(response).digest('hex'),
    },
  };
}
