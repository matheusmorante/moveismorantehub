import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateNfeAccessKey } from '../../erp/src/pages/utils/nfe/nfeAccessKey';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { parseSefazNfeSituation } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { resolveNfeSequenceSettings, validateContributorNfeSeries } from '../../erp/src/pages/utils/nfe/nfeSequenceSettings';
import { resolveFiscalDocument, parseFiscalSnapshotReservation,
  type FiscalEmissionCommand, type FiscalSnapshotCandidate, type FiscalSnapshot } from './fiscalSnapshot';
import { createHmlTechnicalRuleSet, HML_TECHNICAL_RULESET_VERSION } from './hmlTechnicalRuleSet';
import { serializeFiscalDocument } from './fiscalXmlSerializer';
import { appendResponsibleTechnician, getResponsibleTechnicianConfig,
  getResponsibleTechnicianConfigurationIssues } from './responsibleTechnician';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { validateUnsignedNfeStructure, validateNfeAgainstOfficialSchema } from './schemaValidator';
import { sendSoapToSefaz } from './sefazClient';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { loadHmlCsosnConfiguration, parseHmlCsosnConfiguration } from './csosnPolicy';
import { assertXmlFiscalSelections } from './fiscalSelectionIntegrity';
import { fiscalSelectionsEqual } from '../../shared-utils/fiscalItemSelections';
import { embeddedNfeXml } from './xmlEnvelope';
import { createHmlNormalSaleRuleSet, HML_NORMAL_SALE_RULESET_VERSION, loadHmlNormalSaleInputs } from './hmlNormalSaleRuleSet';
import { sefazTransportDiagnostic } from './sefazTransportDiagnostic';
import { validateParanaIssuerIe } from './paranaIssuerIe';

export const isHmlRuleSet = (version: unknown) =>
  version === HML_TECHNICAL_RULESET_VERSION || version === HML_NORMAL_SALE_RULESET_VERSION;

type Database = SupabaseClient<FiscalDatabase>;
type Result = { status: number; body: Record<string, unknown> };
type HmlDocumentRow = FiscalDatabase['public']['Tables']['nfe_documents']['Row'];
const endpoint = 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4';
const consultEndpoint = 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4';
const failure = (status: number, code: string, error: string, extra: Record<string, unknown> = {}): Result =>
  ({ status, body: { success: false, code, error, ...extra } });
const hasProtocolKey = (xml: string, key: string) => {
  const protocol = xml.match(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/i)?.[1] || '';
  return /^\d{44}$/.test(key) &&
    new RegExp(`<(?:[\\w.-]+:)?chNFe>\\s*${key}\\s*<\\/(?:[\\w.-]+:)?chNFe>`, 'i').test(protocol);
};

function saoPauloTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error('Data da reserva inválida.');
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  const offset = String(parts.timeZoneName || '').replace('GMT', '') || '+00:00';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

async function consultExisting(
  db: Database,
  doc: FiscalDatabase['public']['Tables']['nfe_documents']['Row'],
  cert: ReturnType<typeof extractCertificateAndKey>,
  attemptToken: string
): Promise<Result> {
  const query = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  const response = await sendSoapToSefaz({
    url: consultEndpoint,
    action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
    serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
    xmlPayload: query, certPem: cert.certPem, privateKeyPem: cert.privateKeyPem,
  });
  const situation = parseSefazNfeSituation(response);
  if (situation.state === 'not_found') {
    const { error } = await db.rpc('persist_hml_nfe_result', {
      p_document_id: doc.id, p_attempt_token: attemptToken, p_status: 'erro',
      p_reason: `217: ${situation.xMotivo || 'NF-e não consta na SEFAZ'}`,
      p_response_xml: response, p_protocol: null, p_items: [],
    });
    if (error) return failure(503, 'HML_NOT_FOUND_PERSIST_FAILED',
      'A consulta retornou 217, mas a tentativa precisa de reconciliação.',
      { pending: true, documentId: doc.id });
    return failure(409, 'HML_CONFIRMED_NOT_FOUND',
      '217: NF-e não encontrada. A próxima tentativa deve reutilizar o XML e a chave originais.',
      { documentId: doc.id, accessKey: doc.chave_acesso });
  }
  if (situation.state !== 'authorized') {
    const { error } = await db.rpc('persist_hml_nfe_result', {
      p_document_id: doc.id, p_attempt_token: attemptToken, p_status: 'pendente',
      p_reason: `${situation.cStat || 'desconhecido'}: ${situation.xMotivo || 'Consulta inconclusiva'}`,
      p_response_xml: response, p_protocol: null, p_items: [],
    });
    if (error) return failure(503, 'HML_RECONCILIATION_PERSIST_FAILED',
      'Resposta da consulta não persistida; reconciliação obrigatória.',
      { pending: true, documentId: doc.id });
    return failure(409, 'HML_RECONCILIATION_REQUIRED',
      'A consulta não confirmou autorização. Revise a tentativa original antes de retransmitir.',
      { pending: true, documentId: doc.id, accessKey: doc.chave_acesso,
        cStat: situation.cStat, xMotivo: situation.xMotivo });
  }
  const parsed = parseSefazAuthorization(response);
  if (!parsed.authorized || !parsed.protocolNumber ||
      !hasProtocolKey(response, doc.chave_acesso))
    return failure(502, 'HML_PROTOCOL_INCOMPLETE', 'Consulta autorizada sem protocolo verificável.',
      { pending: true, documentId: doc.id });
  const lines = parseAuthorizedInvoiceLines(String(doc.xml_nfe || ''));
  const { error } = await db.rpc('persist_hml_nfe_result', {
    p_document_id: doc.id, p_attempt_token: attemptToken,
    p_status: 'homologada', p_reason: parsed.xMotivo,
    p_response_xml: response, p_protocol: parsed.protocolNumber,
    p_items: lines.map((line) => ({
      item_number: line.invoiceItemNumber, product_code: line.productCode,
      description: line.description, billed_quantity: line.billedQuantity,
      unit_value: line.unitValue, gross_value: line.grossValue,
      discount_value: line.discountValue, product_xml: line.productXml,
      taxes_xml: line.taxesXml,
    })),
  });
  if (error) return failure(503, 'HML_RECONCILIATION_PERSIST_FAILED',
    'SEFAZ confirmou autorização, mas a persistência precisa de reconciliação.',
    { pending: true, documentId: doc.id });
  return { status: 200, body: { success: true, documentId: doc.id,
    orderId: doc.order_id, accessKey: doc.chave_acesso, nfeNumber: doc.numero_nfe,
    series: doc.serie, model: '55', environment: 2,
    protocolNumber: parsed.protocolNumber, protocolDate: parsed.protocolDate,
    signedXml: doc.xml_nfe, cStat: parsed.cStat, xMotivo: parsed.xMotivo } };
}

/** Performs a fresh, read-only SEFAZ query for a document whose authorization is already final. */
export async function consultAuthorizedHmlTechnical(
  doc: Pick<HmlDocumentRow,
    'id' | 'order_id' | 'numero_nfe' | 'serie' | 'chave_acesso' | 'modelo' |
    'ambiente' | 'status' | 'numero_protocolo' | 'fiscal_ruleset_version'>
): Promise<Result> {
  if (doc.ambiente !== 2 || doc.modelo !== '55' || doc.status !== 'homologada' ||
      !isHmlRuleSet(doc.fiscal_ruleset_version) || !/^\d{44}$/.test(doc.chave_acesso) ||
      !doc.numero_protocolo)
    return failure(409, 'HML_AUTHORIZED_DOCUMENT_INVALID',
      'A consulta direta exige uma NF-e 55 de homologação autorizada com chave e protocolo persistidos.');

  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx)
    return failure(503, 'HML_CERTIFICATE_UNAVAILABLE', 'Certificado A1 não configurado.');
  let cert: ReturnType<typeof extractCertificateAndKey>;
  try { cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || ''); }
  catch { return failure(503, 'HML_CERTIFICATE_INVALID', 'Certificado A1 inválido.'); }

  const consultedAt = new Date().toISOString();
  const query = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  let response: string;
  try {
    response = await sendSoapToSefaz({
      url: consultEndpoint,
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: query,
      certPem: cert.certPem,
      privateKeyPem: cert.privateKeyPem,
    });
  } catch (error) {
    const transportDiagnostic = sefazTransportDiagnostic(error);
    console.error('SEFAZ_HML_AUTHORIZED_CONSULT', transportDiagnostic);
    return failure(502, 'HML_AUTHORIZED_CONSULT_UNKNOWN',
      'A consulta direta à SEFAZ não teve resposta confirmada. A autorização persistida foi preservada.',
      { pending: true, documentId: doc.id, sefazConsulted: false, transportDiagnostic });
  }

  const situation = parseSefazNfeSituation(response);
  const parsed = parseSefazAuthorization(response);
  if (situation.state !== 'authorized' || !parsed.authorized ||
      parsed.protocolNumber !== doc.numero_protocolo || !hasProtocolKey(response, doc.chave_acesso)) {
    return failure(409, 'HML_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED',
      situation.state === 'cancelled'
        ? 'A consulta encontrou um estado diferente da autorização persistida. Reconciliação fiscal manual necessária; nenhum dado foi sobrescrito.'
        : 'A consulta não confirmou a autorização e o protocolo persistidos. Reconciliação fiscal manual necessária; nenhum dado foi sobrescrito.',
      { pending: true, documentId: doc.id, sefazConsulted: true,
        cStat: situation.cStat || parsed.cStat, xMotivo: situation.xMotivo || parsed.xMotivo,
        protocolMatches: parsed.protocolNumber === doc.numero_protocolo,
        responseHash: createHash('sha256').update(response).digest('hex') });
  }

  return { status: 200, body: {
    success: true,
    state: 'authorized',
    sefazConsulted: true,
    consultedAt,
    documentId: doc.id,
    orderId: doc.order_id,
    nfeNumber: doc.numero_nfe,
    series: doc.serie,
    model: '55',
    environment: 2,
    cStat: parsed.cStat,
    xMotivo: situation.xMotivo || parsed.xMotivo,
    protocolNumber: parsed.protocolNumber,
    protocolDate: parsed.protocolDate,
    responseHash: createHash('sha256').update(response).digest('hex'),
  } };
}

async function transmitAndPersist(
  db: Database, documentId: string, signedXml: string, accessKey: string,
  nfeNumber: number, metadata: Record<string, unknown>,
  cert: ReturnType<typeof extractCertificateAndKey>, attemptToken: string
): Promise<Result> {
  try {
    // Re-read the immutable contract even on retransmission; never today's form/catalog.
    const { data: persisted, error } = await db.from('nfe_fiscal_snapshots')
      .select('snapshot_data').eq('id', String(metadata.fiscalSnapshotId || '')).maybeSingle();
    if (error || !persisted) throw new Error('Snapshot fiscal indisponível na transmissão.');
    await assertXmlFiscalSelections(persisted.snapshot_data, signedXml);
  } catch {
    return failure(422, 'HML_TRANSMISSION_INTEGRITY_FAILED',
      'XML assinado e campos confirmados não puderam ser reconciliados. Transmissão bloqueada.',
      { ...metadata, sefazContacted: false, numberReserved: true });
  }
  let responseXml: string;
  try {
    const envelope = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${nfeNumber}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    responseXml = await sendSoapToSefaz({ url: endpoint,
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
      xmlPayload: envelope, certPem: cert.certPem, privateKeyPem: cert.privateKeyPem });
  } catch (error) {
    const transportDiagnostic = sefazTransportDiagnostic(error);
    console.error('SEFAZ_HML_TRANSPORT', transportDiagnostic);
    await db.rpc('persist_hml_nfe_result', { p_document_id: documentId,
      p_attempt_token: attemptToken,
      p_status: 'pendente', p_reason: 'Resposta da transmissão HML desconhecida',
      p_response_xml: '', p_protocol: null, p_items: [] });
    return failure(502, 'HML_TRANSMISSION_UNCERTAIN',
      'Transmissão sem resposta confirmada. Consulte a chave antes de qualquer nova tentativa.',
      { pending: true, ...metadata, transportDiagnostic });
  }
  const parsed = parseSefazAuthorization(responseXml);
  const protocolMatches = hasProtocolKey(responseXml, accessKey);
  const authorized = parsed.authorized && protocolMatches;
  const status = authorized ? 'homologada' :
    parsed.pending || parsed.cStat === '100' || !/^\d{3}$/.test(parsed.cStat)
      ? 'pendente' : 'erro';
  const lines = authorized ? parseAuthorizedInvoiceLines(signedXml).map((line) => ({
    item_number: line.invoiceItemNumber, product_code: line.productCode,
    description: line.description, billed_quantity: line.billedQuantity,
    unit_value: line.unitValue, gross_value: line.grossValue,
    discount_value: line.discountValue, product_xml: line.productXml,
    taxes_xml: line.taxesXml,
  })) : [];
  const { error: persistError } = await db.rpc('persist_hml_nfe_result', {
    p_document_id: documentId, p_attempt_token: attemptToken, p_status: status,
    p_reason: parsed.xMotivo || `SEFAZ cStat ${parsed.cStat || 'desconhecido'}`,
    p_response_xml: responseXml, p_protocol: authorized ? parsed.protocolNumber || null : null,
    p_items: lines,
  });
  if (persistError)
    return failure(503, 'HML_RESULT_PERSIST_FAILED',
      'Resposta SEFAZ recebida, mas não persistida; reconciliação obrigatória.',
      { pending: true, ...metadata });
  return { status: 200, body: { success: authorized, pending: status === 'pendente',
    ...metadata, signedXml, sefazResponseXml: responseXml,
    cStat: parsed.cStat, xMotivo: parsed.xMotivo,
    protocolNumber: parsed.protocolNumber, protocolDate: parsed.protocolDate } };
}

async function releaseAttempt(db: Database, documentId: string, attemptToken: string): Promise<void> {
  try {
    await db.rpc('release_hml_nfe_attempt', {
      p_document_id: documentId, p_attempt_token: attemptToken,
    });
  } catch {
    // The lease expires server-side if releasing it fails. Never mask the fiscal result.
  }
}

export async function retryHmlTechnical(
  db: Database, documentId: string, allowRetransmission = true
): Promise<Result> {
  const { data: doc, error } = await db.from('nfe_documents').select('*').eq('id', documentId).maybeSingle();
  if (error || !doc || doc.ambiente !== 2 || doc.modelo !== '55' ||
      !isHmlRuleSet(doc.fiscal_ruleset_version))
    return failure(404, 'HML_DOCUMENT_NOT_FOUND', 'Tentativa HML original não encontrada.');
  if (doc.status === 'homologada')
    return { status: 200, body: { success: true, documentId: doc.id,
      orderId: doc.order_id, accessKey: doc.chave_acesso, nfeNumber: doc.numero_nfe,
      series: doc.serie, model: '55', environment: 2,
      protocolNumber: doc.numero_protocolo, signedXml: doc.xml_nfe } };
  if (doc.status === 'erro' && parseSefazAuthorization(String(doc.xml_protocolo || '')).cStat === '244')
    return failure(409, 'HML_SERIES_CORRECTION_REQUIRED',
      '244: A SEFAZ rejeitou a série. Corrija a série nas configurações fiscais e solicite uma nova tentativa vinculada; o XML rejeitado será preservado.',
      { documentId: doc.id, cStat: '244', pending: false, sefazContacted: false,
        orderId: doc.order_id, nfeNumber: doc.numero_nfe, series: doc.serie, model: '55', environment: 2 });
  if (doc.status === 'erro' && parseSefazAuthorization(String(doc.xml_protocolo || '')).cStat === '209')
    return failure(409, 'HML_ISSUER_IE_CORRECTION_REQUIRED',
      '209: A SEFAZ rejeitou a inscrição estadual do emitente. Confira o cadastro da Receita/PR ou a contabilidade; o XML e a resposta rejeitados serão preservados.',
      { documentId: doc.id, cStat: '209', pending: false, sefazContacted: false,
        orderId: doc.order_id, nfeNumber: doc.numero_nfe, series: doc.serie, model: '55', environment: 2 });
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure(503, 'HML_CERTIFICATE_UNAVAILABLE', 'Certificado A1 não configurado.');
  let cert: ReturnType<typeof extractCertificateAndKey>;
  try { cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || ''); }
  catch { return failure(503, 'HML_CERTIFICATE_INVALID', 'Certificado A1 inválido.'); }
  const attemptToken = randomUUID();
  const { data: claimed, error: claimError } = await db.rpc('claim_hml_nfe_attempt', {
    p_document_id: doc.id, p_attempt_token: attemptToken,
  });
  if (claimError || !claimed) return failure(409, 'HML_ATTEMPT_IN_PROGRESS',
    'Outra chamada está conduzindo esta tentativa. Aguarde antes de consultar novamente.',
    { pending: true, documentId: doc.id, accessKey: doc.chave_acesso });
  try {
    let consultation: Result;
    try { consultation = await consultExisting(db, doc, cert, attemptToken); }
    catch (error) { const transportDiagnostic = sefazTransportDiagnostic(error);
      console.error('SEFAZ_HML_CONSULT', transportDiagnostic);
      return failure(502, 'HML_RECONCILIATION_REQUIRED',
      'Consulta da chave original inconclusiva; a retransmissão permanece bloqueada.',
      { pending: true, documentId: doc.id, accessKey: doc.chave_acesso, transportDiagnostic }); }
    if (!allowRetransmission || consultation.body.code !== 'HML_CONFIRMED_NOT_FOUND') return consultation;
    try { validateContributorNfeSeries(doc.serie); }
    catch { return failure(422, 'HML_RETRY_SERIES_INVALID',
      'A série do XML original é incompatível com este emissor. A retransmissão foi bloqueada; preserve a tentativa e corrija a configuração fiscal.',
      { documentId: doc.id, pending: false, sefazContacted: false }); }
    if (!doc.xml_nfe || !doc.chave_acesso || !doc.fiscal_snapshot_id)
      return failure(409, 'HML_RETRY_XML_UNAVAILABLE', 'XML ou snapshot original não disponível.');
    try { await validateNfeAgainstOfficialSchema(doc.xml_nfe); }
    catch { return failure(409, 'HML_RETRY_XML_INVALID', 'XML original falhou no XSD oficial.'); }
    const { error: reactivateError } = await db.rpc('reactivate_hml_nfe_retry',
      { p_document_id: doc.id, p_attempt_token: attemptToken });
    if (reactivateError) return failure(409, 'HML_RETRY_STATE_CHANGED',
      'A tentativa mudou de estado; consulte novamente.', { documentId: doc.id });
    return await transmitAndPersist(db, doc.id, doc.xml_nfe, doc.chave_acesso,
      doc.numero_nfe, { documentId: doc.id, orderId: doc.order_id,
        accessKey: doc.chave_acesso, nfeNumber: doc.numero_nfe,
        fiscalSnapshotId: doc.fiscal_snapshot_id,
        series: doc.serie, model: '55', environment: 2 }, cert, attemptToken);
  } finally {
    await releaseAttempt(db, doc.id, attemptToken);
  }
}

/** Recover persisted facts before loading today's commercial order or issuer settings. */
export async function recoverHmlTechnical(
  db: Database, command: FiscalEmissionCommand
): Promise<Result | null> {
  if (command.environment !== 2)
    return failure(503, 'PRODUCTION_FISCAL_RULESET_REQUIRED',
      'Produção exige uma matriz fiscal aprovada própria.');
  const { data: previous, error: previousError } = await db.from('nfe_documents')
    .select('id,order_id,ambiente,modelo,fiscal_ruleset_version,fiscal_snapshot_id')
    .eq('emission_request_id', command.emissionRequestId).maybeSingle();
  if (previousError) return failure(503, 'HML_ATTEMPT_READ_FAILED',
    'Não foi possível verificar a tentativa anterior. Nenhuma nova transmissão foi iniciada.');
  if (previous) {
    if (previous.order_id !== command.orderId || previous.ambiente !== 2 ||
        previous.modelo !== '55' || !isHmlRuleSet(previous.fiscal_ruleset_version))
      return failure(409, 'HML_IDEMPOTENCY_MISMATCH',
        'A chave de solicitação já pertence a outra tentativa fiscal.');
    if (command.itemCsosnOverrides || command.itemFiscalSelections) {
      if (!previous.fiscal_snapshot_id) return failure(409, 'HML_IDEMPOTENCY_MISMATCH',
        'A tentativa anterior não tem snapshot verificável das escolhas de CSOSN.');
      const { data: snapshot, error } = await db.from('nfe_fiscal_snapshots').select('snapshot_data')
        .eq('id', previous.fiscal_snapshot_id).maybeSingle();
      const sorted = (value: Record<string, string>) => JSON.stringify(Object.entries(value).sort());
      if (error || !snapshot || sorted(snapshot.snapshot_data.emissionRequest.itemCsosnOverrides || {}) !==
          sorted(command.itemCsosnOverrides || {}) ||
          !fiscalSelectionsEqual(snapshot.snapshot_data.emissionRequest.itemFiscalSelections,
            command.itemFiscalSelections))
        return failure(409, 'HML_IDEMPOTENCY_MISMATCH',
          'Esta tentativa já tem escolhas de CSOSN imutáveis. Consulte o documento original.');
    }
    return retryHmlTechnical(db, previous.id, false);
  }
  return null;
}

/** A1, CSRT, numbering, tax decision and transport remain on the server. */
export async function emitHmlTechnical(
  db: Database, command: FiscalEmissionCommand, candidate: FiscalSnapshotCandidate,
  appSettings: Record<string, unknown>
): Promise<Result> {
  if (command.environment !== 2)
    return failure(503, 'PRODUCTION_FISCAL_RULESET_REQUIRED',
      'Produção exige uma matriz fiscal aprovada própria.');
  const recovered = await recoverHmlTechnical(db, command);
  if (recovered) return recovered;
  const technicalFixture = candidate.order.data.fiscalScenario === HML_TECHNICAL_RULESET_VERSION;
  if (!technicalFixture) {
    try { await loadHmlNormalSaleInputs(db, candidate, appSettings); }
    catch (error) { return failure(422, 'FISCAL_DETERMINATION_REQUIRED',
      error instanceof Error ? error.message : 'Fatos do pedido real indisponíveis.',
      { numberReserved: false, sefazContacted: false }); }
  }
  const { data: decisionRow, error: decisionError } = await db.from('settings')
    .select('data').eq('id', 'fiscal_decision_simples_nfe55_normal_sale_v1').maybeSingle();
  if (decisionError || !decisionRow?.data)
    return failure(503, 'HML_FISCAL_DECISION_UNAVAILABLE',
      'Decisão persistida de PIS/COFINS indisponível.');
  let rules;
  try {
    const configuration = await loadHmlCsosnConfiguration(db, true);
    rules = technicalFixture ? createHmlTechnicalRuleSet(candidate, decisionRow.data, configuration)
      : await createHmlNormalSaleRuleSet(candidate, configuration);
  }
  catch (error) {
    return failure(422, 'HML_RULESET_NOT_APPLICABLE',
      error instanceof Error ? error.message : 'Cenário HML inválido.');
  }
  const preflight = resolveFiscalDocument(candidate, rules);
  if (preflight.status !== 'ready')
    return failure(422, 'HML_FISCAL_DOCUMENT_INCOMPLETE',
      'O pedido não passou pela determinação fiscal.',
      { blockers: preflight.blockers, numberReserved: false, sefazContacted: false });
  try { validateParanaIssuerIe(preflight.document.issuer.ie); }
  catch (error) { return failure(422, 'HML_ISSUER_IE_INVALID',
    error instanceof Error ? error.message : 'Inscrição estadual do emitente inválida.',
    { numberReserved: false, sefazContacted: false }); }
  const tech = getResponsibleTechnicianConfig();
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!tech || !pfx)
    return failure(503, 'HML_CERTIFICATE_OR_CSRT_UNAVAILABLE',
      'Certificado A1 ou responsável técnico/CSRT não configurado no servidor.',
      { numberReserved: false, sefazContacted: false,
        configurationIssues: [...getResponsibleTechnicianConfigurationIssues(),
          ...(!pfx ? ['certificate.base64'] : [])] });
  let cert: ReturnType<typeof extractCertificateAndKey>;
  try { cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || ''); }
  catch { return failure(503, 'HML_CERTIFICATE_INVALID', 'Certificado A1 inválido.',
    { numberReserved: false, sefazContacted: false }); }

  let sequence;
  try { sequence = resolveNfeSequenceSettings(appSettings, '55', 2); }
  catch (error) { return failure(422, 'HML_SEQUENCE_INVALID',
    error instanceof Error ? error.message : 'Série HML inválida.',
    { numberReserved: false, sefazContacted: false }); }
  if (!/^\d{1,3}$/.test(sequence.series) ||
      !Number.isInteger(sequence.minimumNumber) || sequence.minimumNumber < 1 || sequence.minimumNumber > 999999999)
    return failure(422, 'HML_SEQUENCE_INVALID', 'Série ou número inicial HML inválido.',
      { numberReserved: false, sefazContacted: false });
  const { data: reservationValue, error: reservationError } = await db.rpc('prepare_nfe_fiscal_snapshot', {
    p_order_id: command.orderId, p_emission_request_id: command.emissionRequestId,
    p_modelo: '55', p_ambiente: 2, p_serie: sequence.series,
    p_numero_minimo: sequence.minimumNumber,
    p_item_csosn_overrides: command.itemCsosnOverrides || {},
    ...(command.itemFiscalSelections ? { p_item_fiscal_selections: command.itemFiscalSelections } : {}),
  });
  const reservation = parseFiscalSnapshotReservation(reservationValue);
  if (reservationError || !reservation)
    return failure(503, 'HML_SNAPSHOT_RESERVATION_FAILED',
      'Não foi possível reservar snapshot e número fiscal HML de forma atômica.',
      { numberReserved: false, sefazContacted: false });
  const { data: saved, error: snapshotError } = await db.from('nfe_fiscal_snapshots')
    .select('snapshot_data,snapshot_sha256,order_id,environment,requested_model,reserved_number,series')
    .eq('id', reservation.snapshotId).maybeSingle();
  if (snapshotError || !saved || saved.snapshot_sha256 !== reservation.snapshotHash ||
      saved.order_id !== command.orderId || saved.environment !== 2 ||
      saved.requested_model !== '55' || saved.reserved_number !== reservation.number ||
      saved.series !== sequence.series)
    return failure(503, 'HML_SNAPSHOT_READ_FAILED', 'Snapshot reservado não pôde ser validado.',
      { numberReserved: true, documentId: reservation.snapshotId });
  const persisted = saved.snapshot_data as FiscalSnapshot;
  const facts: FiscalSnapshotCandidate = {
    schemaVersion: persisted.schemaVersion, capturedAt: persisted.capturedAt,
    order: persisted.order, issuerProfile: persisted.issuerProfile,
    fiscalConfiguration: persisted.fiscalConfiguration,
    fiscalInputs: persisted.fiscalInputs,
    emissionRequest: { id: command.emissionRequestId, environment: 2,
      itemCsosnOverrides: persisted.emissionRequest.itemCsosnOverrides,
      itemFiscalSelections: persisted.emissionRequest.itemFiscalSelections },
    persistedHash: reservation.snapshotHash,
  };
  try { const configuration = parseHmlCsosnConfiguration(persisted.fiscalConfiguration);
    rules = technicalFixture ? createHmlTechnicalRuleSet(facts, decisionRow.data, configuration)
      : await createHmlNormalSaleRuleSet(facts, configuration); }
  catch { return failure(422, 'HML_PERSISTED_CONFIGURATION_INVALID',
    'Configuração fiscal do snapshot não pôde ser validada.', { numberReserved: true }); }
  const resolved = resolveFiscalDocument(facts, rules);
  if (resolved.status !== 'ready')
    return failure(422, 'HML_PERSISTED_SNAPSHOT_INVALID',
      'O snapshot persistido não passou pela determinação fiscal.',
      { blockers: resolved.blockers, numberReserved: true });
  try { validateParanaIssuerIe(resolved.document.issuer.ie); }
  catch (error) { return failure(422, 'HML_PERSISTED_ISSUER_IE_INVALID',
    error instanceof Error ? error.message : 'Inscrição estadual do snapshot inválida.',
    { numberReserved: true, sefazContacted: false }); }
  const issuedAt = saoPauloTimestamp(reservation.issuedAt);
  const cNf = createHash('sha256').update(command.emissionRequestId).digest('hex');
  const randomCode = String(parseInt(cNf.slice(0, 10), 16) % 100000000).padStart(8, '0');
  const accessKey = generateNfeAccessKey({ ufCode: '41',
    yearMonth: issuedAt.slice(2, 4) + issuedAt.slice(5, 7),
    cnpj: resolved.document.issuer.cnpj, model: '55', series: sequence.series,
    number: reservation.number, emissionType: '1', randomCode }).accessKey;
  let signedXml: string;
  try {
    let xml = serializeFiscalDocument(facts, resolved.document, rules, {
      accessKey, series: Number(sequence.series), number: reservation.number, issuedAt,
    });
    xml = appendResponsibleTechnician(xml, accessKey, tech);
    await validateUnsignedNfeStructure(xml);
    signedXml = signNfeXml(xml, cert.privateKeyPem, cert.certDerBase64);
    await validateNfeAgainstOfficialSchema(signedXml);
    await assertXmlFiscalSelections(facts, signedXml);
  } catch (error) {
    return failure(422, 'HML_XML_INVALID',
      error instanceof Error ? error.message : 'XML HML inválido.',
      { numberReserved: true, sefazContacted: false });
  }

  const attemptToken = randomUUID();
  const { data: documentId, error: insertError } = await db.rpc('reserve_hml_nfe_outbound', {
    p_attempt_token: attemptToken,
    p_order_id: command.orderId, p_emission_request_id: command.emissionRequestId,
    p_access_key: accessKey, p_signed_xml: signedXml,
    p_number: reservation.number, p_series: sequence.series,
    p_decision_trace: resolved.document.decisions as unknown as Record<string, unknown>[],
  });
  if (insertError || !documentId)
    return failure(409, 'HML_ACTIVE_ATTEMPT_OR_PERSISTENCE_FAILED',
      'Tentativa fiscal já ativa ou XML não pôde ser persistido. Consulte a emissão antes de repetir.',
      { pending: true, numberReserved: true });
  const metadata = { documentId, orderId: command.orderId, fiscalSnapshotId: reservation.snapshotId, accessKey,
    nfeNumber: reservation.number, series: sequence.series, model: '55', environment: 2 };

  try {
    return await transmitAndPersist(db, documentId, signedXml, accessKey,
      reservation.number, metadata, cert, attemptToken);
  } finally {
    await releaseAttempt(db, documentId, attemptToken);
  }
}