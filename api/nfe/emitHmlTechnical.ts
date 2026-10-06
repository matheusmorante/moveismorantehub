import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateNfeAccessKey } from '../../erp/src/pages/utils/nfe/nfeAccessKey';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { parseSefazNfeSituation } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import {
  resolveNfeSequenceSettings,
  validateContributorNfeSeries,
} from '../../erp/src/pages/utils/nfe/nfeSequenceSettings';
import {
  resolveFiscalDocument,
  parseFiscalSnapshotReservation,
  type FiscalEmissionCommand,
  type FiscalSnapshotCandidate,
  type FiscalSnapshot,
} from './fiscalSnapshot';
import { createHmlTechnicalRuleSet, HML_TECHNICAL_RULESET_VERSION } from './hmlTechnicalRuleSet';
import { serializeFiscalDocument } from './fiscalXmlSerializer';
import {
  appendResponsibleTechnician,
  getResponsibleTechnicianConfig,
  getResponsibleTechnicianConfigurationIssues,
} from './responsibleTechnician';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { validateUnsignedNfeStructure, validateNfeAgainstOfficialSchema } from './schemaValidator';
import { sendSoapToSefaz } from './sefazClient';
import { withNfeEmissionStage } from './nfeEmissionPerformance';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { loadHmlCsosnConfiguration, parseHmlCsosnConfiguration } from './csosnPolicy';
import { assertXmlFiscalSelections } from './fiscalSelectionIntegrity';
import { embeddedNfeXml } from './xmlEnvelope';
import {
  canAbandonBeforeHmlTransmission,
  getFiscalSelectionMismatchDetails,
  isFormallyAbandonedHmlAttempt,
} from './hmlAttemptSafety';
import {
  createHmlNormalSaleRuleSet,
  HML_NORMAL_SALE_RULESET_VERSION,
  loadHmlNormalSaleInputs,
} from './hmlNormalSaleRuleSet';
import { sefazTransportDiagnostic } from './sefazTransportDiagnostic';
import { validateParanaIssuerIe } from './paranaIssuerIe';
import {
  fiscalNumberConflict,
  isDifferentKeyNumberConflict,
} from '../../shared-utils/fiscalNumbering';
import { isValidRecipientTaxId, normalizeRecipientTaxId } from '../../shared-utils/recipientTaxId';
import { isSameFiscalModelDecision } from '../../shared-utils/fiscalDocumentModel';

export const isHmlRuleSet = (version: unknown) =>
  version === HML_TECHNICAL_RULESET_VERSION ||
  version === 'HML_NORMAL_SALE_V1' ||
  version === HML_NORMAL_SALE_RULESET_VERSION;

type Database = SupabaseClient<FiscalDatabase>;
type Result = { status: number; body: Record<string, unknown> };
type HmlDocumentRow = FiscalDatabase['public']['Tables']['nfe_documents']['Row'];
const hmlEndpoint = (model: unknown, service: string) => {
  if (model !== '55' && model !== '65') throw new Error('Modelo fiscal inválido.');
  const prefix = model === '65' ? 'nfce' : 'nfe';
  return `https://homologacao.${prefix}.sefa.pr.gov.br/${prefix}/${service}`;
};
const failure = (
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {}
): Result => ({ status, body: { success: false, code, error, ...extra } });

const SNAPSHOT_REASON_MESSAGES: Record<string, string> = {
  ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL: 'O pedido não é venda/showroom ativa ou está cancelado.',
  ORDER_FISCAL_DATA_UNAVAILABLE: 'O pedido não possui dados fiscais válidos.',
  ORDER_REVISION_UNAVAILABLE: 'O pedido não possui versão/data de atualização registrada.',
  HML_ORDER_NOT_ISOLATED:
    'O pedido técnico HML precisa estar isolado (rascunho, excluído e sem pagamentos).',
  NCM_NOT_ACTIVE: 'Algum item usa NCM inexistente, inativo ou fora da vigência.',
  ISSUER_PROFILE_UNAVAILABLE: 'Configurações da empresa emitente não encontradas.',
  HML_CSOSN_CONFIGURATION_UNAVAILABLE:
    'Configuração padrão de CSOSN da homologação não encontrada.',
  ISSUER_MUNICIPALITY_UNAVAILABLE:
    'Código IBGE do município do emitente ausente ou inválido (7 dígitos).',
  ALREADY_ACTIVE_FISCAL_ATTEMPT:
    'Já existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.',
  HML_ORDER_ALREADY_HAS_ATTEMPT:
    'O pedido de teste técnico HML já possui uma tentativa registrada.',
};

/** Extrai o código de negócio levantado pela RPC (token seguro, sem dados pessoais). */
function snapshotReasonOf(error: unknown) {
  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message.trim()
      : '';
  if (/^[A-Z][A-Z0-9_]{2,80}$/.test(message)) return message;
  const check = message.match(
    /relation "([\w.]{1,80})" violates check constraint "([\w.]{1,120})"/
  );
  return check ? `CHECK:${check[1]}.${check[2]}` : undefined;
}

/** Find the conflicting intent without assuming the blocked request describes its SEFAZ contact. */
async function activeAttemptMetadata(db: Database, orderId: string, model?: string) {
  const { data: doc, error } = await db
    .from('nfe_documents')
    .select('id,emission_request_id,chave_acesso,numero_nfe,serie,modelo,fiscal_snapshot_id')
    .eq('order_id', orderId)
    .eq('ambiente', 2)
    .eq('document_type', 'outbound')
    .in('status', ['pendente', 'processando', 'homologada', 'autorizada'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return {};
  if (doc)
    return {
      documentId: doc.id,
      emissionRequestId: doc.emission_request_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      fiscalSnapshotId: doc.fiscal_snapshot_id,
    };
  if (!model) return {};
  const { data: snapshot, error: snapshotError } = await db
    .from('nfe_fiscal_snapshots')
    .select('id,emission_request_id,reserved_number,series,requested_model')
    .eq('order_id', orderId)
    .eq('environment', 2)
    .eq('requested_model', model)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotError || !snapshot) return {};
  return {
    emissionRequestId: snapshot.emission_request_id,
    fiscalSnapshotId: snapshot.id,
    nfeNumber: snapshot.reserved_number,
    series: snapshot.series,
    model: snapshot.requested_model,
    reservationRecoveryRequired: true,
  };
}

function classifySnapshotReservationError(error: unknown) {
  const databaseCode =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z0-9]{5,8}$/.test(error.code)
      ? error.code
      : 'UNKNOWN';
  const databaseReason = snapshotReasonOf(error);
  const reasonMessage = databaseReason ? SNAPSHOT_REASON_MESSAGES[databaseReason] : undefined;
  if (reasonMessage)
    return {
      databaseCode,
      databaseReason,
      category: 'DATABASE_VALIDATION_REJECTED',
      hint: reasonMessage,
    };
  if (databaseCode === '42883')
    return {
      databaseCode,
      category: 'SQL_FUNCTION_NOT_FOUND',
      hint: 'O PostgreSQL não encontrou a função SQL solicitada. Verifique se a migration da reserva foi aplicada com a assinatura esperada.',
    };
  if (databaseCode === 'PGRST202')
    return {
      databaseCode,
      category: 'RPC_MISSING_FROM_SCHEMA_CACHE',
      hint: 'A função não foi localizada no schema cache do PostgREST. Confira a migration e atualize o cache do Supabase.',
    };
  if (databaseCode === 'PGRST203')
    return {
      databaseCode,
      category: 'RPC_SIGNATURE_AMBIGUOUS',
      hint: 'Há sobrecarga ambígua para a função de reserva. Confira e remova assinaturas conflitantes.',
    };
  if (databaseCode === '42501')
    return {
      databaseCode,
      category: 'DATABASE_PERMISSION_DENIED',
      hint: 'O papel de serviço não tem permissão para executar a reserva fiscal.',
    };
  if (databaseCode === '23505')
    return {
      databaseCode,
      category: 'DATABASE_UNIQUE_CONFLICT',
      hint: 'A reserva encontrou um registro fiscal duplicado ou uma chave de idempotência já usada.',
    };
  if (databaseCode === '23502')
    return {
      databaseCode,
      category: 'DATABASE_REQUIRED_VALUE_MISSING',
      hint: 'A reserva encontrou um campo obrigatório ausente no snapshot ou na sequência fiscal.',
    };
  if (databaseCode === '23503')
    return {
      databaseCode,
      category: 'DATABASE_REFERENCE_CONFLICT',
      hint: 'A reserva encontrou uma referência fiscal inexistente.',
    };
  if (databaseCode === '23514' || databaseCode === '22023')
    return {
      databaseCode,
      category: 'DATABASE_VALIDATION_REJECTED',
      hint: 'O banco rejeitou um parâmetro ou valor do snapshot fiscal.',
    };
  if (databaseCode.startsWith('08'))
    return {
      databaseCode,
      category: 'DATABASE_CONNECTION_FAILED',
      hint: 'O banco não conseguiu concluir a chamada de reserva.',
    };
  return {
    databaseCode,
    category: 'SNAPSHOT_RESERVATION_FAILED',
    hint: 'Consulte o log do servidor pelo identificador de diagnóstico para encontrar a causa.',
  };
}

const hasProtocolKey = (xml: string, key: string) => {
  const protocol =
    xml.match(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/i)?.[1] || '';
  return (
    /^\d{44}$/.test(key) &&
    new RegExp(`<(?:[\\w.-]+:)?chNFe>\\s*${key}\\s*<\\/(?:[\\w.-]+:)?chNFe>`, 'i').test(protocol)
  );
};

function saoPauloTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error('Data da reserva inválida.');
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value])
  );
  const offset = String(parts.timeZoneName || '').replace('GMT', '') || '+00:00';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/** NFC-e authorizations reject dhEmi more than five minutes behind SEFAZ time. */
function nfceXmlNeedsFreshEmission(xml: string | null | undefined, now = Date.now()) {
  const issuedAtText = xml?.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1];
  const issuedAt = issuedAtText ? Date.parse(issuedAtText) : Number.NaN;
  // Leave a one-minute margin for signing, network latency, and SEFAZ queueing.
  return !Number.isFinite(issuedAt) || now - issuedAt >= 4 * 60_000 || issuedAt > now + 60_000;
}

function freshNfceEmissionRequired(
  doc: FiscalDatabase['public']['Tables']['nfe_documents']['Row'],
  cStat: string
) {
  return failure(
    409,
    'HML_NEW_EMISSION_REQUIRED',
    cStat === '217'
      ? 'A SEFAZ confirmou que a NFC-e original não consta, mas seu horário de emissão expirou. Inicie uma nova tentativa para gerar XML assinado com horário e numeração atuais.'
      : 'A SEFAZ rejeitou a NFC-e original por data-hora de emissão atrasada. Inicie uma nova tentativa para gerar XML assinado com horário e numeração atuais.',
    {
      documentId: doc.id,
      orderId: doc.order_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      environment: 2,
      cStat,
      pending: false,
      sefazContacted: true,
      safeNewEmission: true,
    }
  );
}

async function consultExisting(
  db: Database,
  doc: FiscalDatabase['public']['Tables']['nfe_documents']['Row'],
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
    !/^\d{44}$/.test(doc.chave_acesso) ||
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

async function transmitAndPersist(
  db: Database,
  documentId: string,
  signedXml: string,
  accessKey: string,
  nfeNumber: number,
  metadata: Record<string, unknown>,
  cert: ReturnType<typeof extractCertificateAndKey>,
  attemptToken: string
): Promise<Result> {
  try {
    // Re-read the immutable contract even on retransmission; never today's form/catalog.
    const { data: persisted, error } = await db
      .from('nfe_fiscal_snapshots')
      .select('snapshot_data')
      .eq('id', String(metadata.fiscalSnapshotId || ''))
      .maybeSingle();
    if (error || !persisted) throw new Error('Snapshot fiscal indisponível na transmissão.');
    await assertXmlFiscalSelections(persisted.snapshot_data, signedXml);
  } catch {
    return failure(
      422,
      'HML_TRANSMISSION_INTEGRITY_FAILED',
      'XML assinado e campos confirmados não puderam ser reconciliados. Transmissão bloqueada.',
      { ...metadata, sefazContacted: false, numberReserved: true }
    );
  }
  let responseXml: string;
  try {
    const envelope = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${nfeNumber}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    responseXml = await withNfeEmissionStage(
      'sefaz_transmission',
      () =>
        sendSoapToSefaz({
          url: hmlEndpoint(metadata.model, 'NFeAutorizacao4'),
          action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
          xmlPayload: envelope,
          certPem: cert.certPem,
          privateKeyPem: cert.privateKeyPem,
        }),
      { environment: 2, model: String(metadata.model || '') }
    );
  } catch (error) {
    const transportDiagnostic = sefazTransportDiagnostic(error);
    const diagnosticId = randomUUID();
    const attemptDiagnostic = {
      diagnosticId,
      emissionRequestId: metadata.emissionRequestId,
      ...transportDiagnostic,
    };
    console.error('SEFAZ_HML_TRANSPORT', { documentId, ...attemptDiagnostic });
    const { error: diagnosticPersistError } = await db.rpc('persist_hml_nfe_result', {
      p_document_id: documentId,
      p_attempt_token: attemptToken,
      p_status: 'pendente',
      p_reason: `Resposta da transmissão HML desconhecida: ${JSON.stringify(attemptDiagnostic)}`,
      p_response_xml: '',
      p_protocol: null,
      p_items: [],
    });
    return failure(
      502,
      'HML_TRANSMISSION_UNCERTAIN',
      'Transmissão sem resposta confirmada. Consulte a chave antes de qualquer nova tentativa.',
      {
        pending: true,
        ...metadata,
        transportDiagnostic,
        diagnosticId,
        diagnosticStage: 'sefaz-transmission',
        diagnosticCategory: 'SEFAZ_TRANSPORT_FAILED',
        transportDiagnosticPersisted: !diagnosticPersistError,
      }
    );
  }
  const parsed = parseSefazAuthorization(responseXml);
  const protocolMatches = hasProtocolKey(responseXml, accessKey);
  const authorized = parsed.authorized && protocolMatches;
  const numberConflict = isDifferentKeyNumberConflict(parsed.cStat, parsed.xMotivo, accessKey)
    ? fiscalNumberConflict(nfeNumber)
    : undefined;
  const status = authorized
    ? 'homologada'
    : parsed.pending ||
        parsed.cStat === '100' ||
        parsed.cStat === '204' ||
        !/^\d{3}$/.test(parsed.cStat)
      ? 'pendente'
      : 'erro';
  const lines = authorized
    ? parseAuthorizedInvoiceLines(signedXml).map((line) => ({
        item_number: line.invoiceItemNumber,
        product_code: line.productCode,
        description: line.description,
        billed_quantity: line.billedQuantity,
        unit_value: line.unitValue,
        gross_value: line.grossValue,
        discount_value: line.discountValue,
        product_xml: line.productXml,
        taxes_xml: line.taxesXml,
      }))
    : [];
  const { error: persistError } = await db.rpc('persist_hml_nfe_result', {
    p_document_id: documentId,
    p_attempt_token: attemptToken,
    p_status: status,
    p_reason: parsed.xMotivo || `SEFAZ cStat ${parsed.cStat || 'desconhecido'}`,
    p_response_xml: responseXml,
    p_protocol: authorized ? parsed.protocolNumber || null : null,
    p_items: lines,
  });
  if (persistError)
    return failure(
      503,
      'HML_RESULT_PERSIST_FAILED',
      'Resposta SEFAZ recebida, mas não persistida; reconciliação obrigatória.',
      { pending: true, ...metadata }
    );
  return {
    status: numberConflict ? 409 : status === 'erro' ? 422 : 200,
    body: {
      success: authorized,
      pending: status === 'pendente',
      ...(numberConflict
        ? {
            code: 'NFE_NUMBER_ALREADY_USED',
            error: `A numeração ${nfeNumber} já está sendo usada. Escolha o número sugerido ou informe outro.`,
            numberConflict,
          }
        : status === 'erro'
          ? {
              code: 'HML_SEFAZ_REJECTED',
              error: `${parsed.cStat ? parsed.cStat + ': ' : ''}${parsed.xMotivo || 'Rejeição da SEFAZ.'}`,
            }
          : {}),
      ...metadata,
      signedXml,
      sefazResponseXml: responseXml,
      cStat: parsed.cStat,
      xMotivo: parsed.xMotivo,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate,
    },
  };
}

async function releaseAttempt(
  db: Database,
  documentId: string,
  attemptToken: string
): Promise<void> {
  try {
    await db.rpc('release_hml_nfe_attempt', {
      p_document_id: documentId,
      p_attempt_token: attemptToken,
    });
  } catch {
    // The lease expires server-side if releasing it fails. Never mask the fiscal result.
  }
}

export async function retryHmlTechnical(
  db: Database,
  documentId: string,
  allowRetransmission = true
): Promise<Result> {
  const { data: doc, error } = await db
    .from('nfe_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();
  if (
    error ||
    !doc ||
    doc.ambiente !== 2 ||
    !['55', '65'].includes(doc.modelo) ||
    !isHmlRuleSet(doc.fiscal_ruleset_version)
  )
    return failure(404, 'HML_DOCUMENT_NOT_FOUND', 'Tentativa HML original não encontrada.');
  if (doc.status === 'homologada')
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
        protocolNumber: doc.numero_protocolo,
        signedXml: doc.xml_nfe,
      },
    };
  if (
    doc.status === 'erro' &&
    parseSefazAuthorization(String(doc.xml_protocolo || '')).cStat === '244'
  )
    return failure(
      409,
      'HML_SERIES_CORRECTION_REQUIRED',
      '244: A SEFAZ rejeitou a série. Corrija a série nas configurações fiscais e solicite uma nova tentativa vinculada; o XML rejeitado será preservado.',
      {
        documentId: doc.id,
        cStat: '244',
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      }
    );
  if (
    doc.status === 'erro' &&
    parseSefazAuthorization(String(doc.xml_protocolo || '')).cStat === '209'
  )
    return failure(
      409,
      'HML_ISSUER_IE_CORRECTION_REQUIRED',
      '209: A SEFAZ rejeitou a inscrição estadual do emitente. Confira o cadastro da Receita/PR ou a contabilidade; o XML e a resposta rejeitados serão preservados.',
      {
        documentId: doc.id,
        cStat: '209',
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      }
    );
  const previousRejection = parseSefazAuthorization(String(doc.xml_protocolo || ''));
  if (doc.status === 'erro' && doc.modelo === '65' && previousRejection.cStat === '704')
    return freshNfceEmissionRequired(doc, previousRejection.cStat);
  if (
    doc.status === 'erro' &&
    isDifferentKeyNumberConflict(
      previousRejection.cStat,
      previousRejection.xMotivo,
      String(doc.chave_acesso || '')
    )
  ) {
    return failure(
      409,
      'NFE_NUMBER_ALREADY_USED',
      `A numeração ${doc.numero_nfe} já está sendo usada; revise o número sugerido antes de tentar novamente.`,
      {
        documentId: doc.id,
        cStat: previousRejection.cStat,
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
        numberConflict: fiscalNumberConflict(doc.numero_nfe),
      }
    );
  }
  if (
    doc.status === 'erro' &&
    previousRejection.cStat &&
    !['100', '101', '105', '204', '217'].includes(previousRejection.cStat)
  ) {
    return failure(
      409,
      'HML_SEFAZ_REJECTED',
      `${previousRejection.cStat}: ${previousRejection.xMotivo || doc.motivo_status || 'Tentativa anterior rejeitada pela SEFAZ.'}`,
      {
        documentId: doc.id,
        cStat: previousRejection.cStat,
        xMotivo: previousRejection.xMotivo,
        pending: false,
        sefazContacted: true,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      }
    );
  }
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure(503, 'HML_CERTIFICATE_UNAVAILABLE', 'Certificado A1 não configurado.');
  let cert: ReturnType<typeof extractCertificateAndKey>;
  try {
    cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
  } catch {
    return failure(503, 'HML_CERTIFICATE_INVALID', 'Certificado A1 inválido.');
  }
  const attemptToken = randomUUID();
  const { data: claimed, error: claimError } = await db.rpc('claim_hml_nfe_attempt', {
    p_document_id: doc.id,
    p_attempt_token: attemptToken,
  });
  if (claimError || !claimed)
    return failure(
      409,
      'HML_ATTEMPT_IN_PROGRESS',
      'Outra chamada está conduzindo esta tentativa. Aguarde antes de consultar novamente.',
      { pending: true, documentId: doc.id, accessKey: doc.chave_acesso }
    );
  try {
    let consultation: Result;
    try {
      consultation = await consultExisting(db, doc, cert, attemptToken);
    } catch (error) {
      const transportDiagnostic = sefazTransportDiagnostic(error);
      const diagnosticId = randomUUID();
      const attemptDiagnostic = {
        diagnosticId,
        emissionRequestId: doc.emission_request_id,
        ...transportDiagnostic,
      };
      console.error('SEFAZ_HML_CONSULT', { documentId: doc.id, ...attemptDiagnostic });
      const { error: diagnosticPersistError } = await db.rpc('persist_hml_nfe_result', {
        p_document_id: doc.id,
        p_attempt_token: attemptToken,
        p_status: 'pendente',
        p_reason: `Consulta HML inconclusiva por transporte: ${JSON.stringify(attemptDiagnostic)}`,
        p_response_xml: String(doc.xml_protocolo || ''),
        p_protocol: null,
        p_items: [],
      });
      return failure(
        502,
        'HML_RECONCILIATION_REQUIRED',
        'Consulta da chave original inconclusiva; a retransmissão permanece bloqueada.',
        {
          pending: true,
          documentId: doc.id,
          accessKey: doc.chave_acesso,
          transportDiagnostic,
          diagnosticId,
          diagnosticStage: 'sefaz-consultation',
          diagnosticCategory: 'SEFAZ_TRANSPORT_FAILED',
          transportDiagnosticPersisted: !diagnosticPersistError,
        }
      );
    }
    if (consultation.body.code !== 'HML_CONFIRMED_NOT_FOUND') return consultation;
    if (doc.modelo === '65' && nfceXmlNeedsFreshEmission(doc.xml_nfe))
      return freshNfceEmissionRequired(doc, String(consultation.body.cStat || '217'));
    if (!allowRetransmission) return consultation;
    try {
      validateContributorNfeSeries(doc.serie);
    } catch {
      return failure(
        422,
        'HML_RETRY_SERIES_INVALID',
        'A série do XML original é incompatível com este emissor. A retransmissão foi bloqueada; preserve a tentativa e corrija a configuração fiscal.',
        { documentId: doc.id, pending: false, sefazContacted: false }
      );
    }
    if (!doc.xml_nfe || !doc.chave_acesso || !doc.fiscal_snapshot_id)
      return failure(409, 'HML_RETRY_XML_UNAVAILABLE', 'XML ou snapshot original não disponível.');
    try {
      await validateNfeAgainstOfficialSchema(doc.xml_nfe);
    } catch {
      return failure(409, 'HML_RETRY_XML_INVALID', 'XML original falhou no XSD oficial.');
    }
    const { error: reactivateError } = await db.rpc('reactivate_hml_nfe_retry', {
      p_document_id: doc.id,
      p_attempt_token: attemptToken,
    });
    if (reactivateError)
      return failure(
        409,
        'HML_RETRY_STATE_CHANGED',
        'A tentativa mudou de estado; consulte novamente.',
        { documentId: doc.id }
      );
    return await transmitAndPersist(
      db,
      doc.id,
      doc.xml_nfe,
      doc.chave_acesso,
      doc.numero_nfe,
      {
        documentId: doc.id,
        orderId: doc.order_id,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        fiscalSnapshotId: doc.fiscal_snapshot_id,
        emissionRequestId: doc.emission_request_id,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      },
      cert,
      attemptToken
    );
  } finally {
    await releaseAttempt(db, doc.id, attemptToken);
  }
}

/** Recover persisted facts before loading today's commercial order or issuer settings. */
export async function recoverHmlTechnical(
  db: Database,
  command: FiscalEmissionCommand
): Promise<Result | null> {
  if (command.environment !== 2)
    return failure(
      503,
      'PRODUCTION_FISCAL_RULESET_REQUIRED',
      'Produção exige uma matriz fiscal aprovada própria.'
    );
  const { data: previous, error: previousError } = await db
    .from('nfe_documents')
    .select(
      'id,order_id,emission_request_id,ambiente,modelo,status,document_type,fiscal_ruleset_version,fiscal_snapshot_id,hml_attempt_token,hml_attempt_expires_at,numero_protocolo,xml_protocolo,hml_response_history,supersedes_document_id,numero_nfe,serie'
    )
    .eq('emission_request_id', command.emissionRequestId)
    .maybeSingle();
  if (previousError)
    return failure(
      503,
      'HML_ATTEMPT_READ_FAILED',
      'Não foi possível verificar a tentativa anterior. Nenhuma nova transmissão foi iniciada.'
    );
  if (previous) {
    if (
      previous.order_id !== command.orderId ||
      previous.ambiente !== 2 ||
      !['55', '65'].includes(previous.modelo) ||
      !isHmlRuleSet(previous.fiscal_ruleset_version)
    )
      return failure(
        409,
        'HML_IDEMPOTENCY_MISMATCH',
        'A chave de solicitação já pertence a outra tentativa fiscal.'
      );
    if (isFormallyAbandonedHmlAttempt(previous.hml_response_history))
      return failure(
        409,
        'HML_ATTEMPT_FORMALLY_ABANDONED',
        'Esta tentativa foi encerrada antes do envio à SEFAZ. Use a ação explícita para iniciar uma nova tentativa fiscal.',
        {
          pending: false,
          documentId: previous.id,
          emissionRequestId: command.emissionRequestId,
          orderId: command.orderId,
          environment: 2,
          model: previous.modelo,
          hmlCanAbandonTlsFailure: false,
        }
      );
    if ((previous.supersedes_document_id || null) !== (command.supersedesDocumentId || null))
      return failure(
        409,
        'HML_IDEMPOTENCY_MISMATCH',
        'A tentativa já está vinculada a outra origem fiscal. Consulte o documento original.'
      );
    if (
      command.itemCsosnOverrides !== undefined ||
      command.itemFiscalSelections ||
      command.recipientTaxId !== undefined ||
      command.finalConsumer !== undefined ||
      command.deliveryByIssuer !== undefined ||
      command.cardNotIntegrated !== undefined ||
      command.requestedNumber !== undefined
    ) {
      if (!previous.fiscal_snapshot_id)
        return failure(
          409,
          'HML_IDEMPOTENCY_MISMATCH',
          'A tentativa anterior não tem snapshot verificável das escolhas de CSOSN.'
        );
      const { data: snapshot, error } = await db
        .from('nfe_fiscal_snapshots')
        .select('snapshot_data,reserved_number')
        .eq('id', previous.fiscal_snapshot_id)
        .maybeSingle();
      if (error || !snapshot)
        return failure(
          409,
          'HML_IDEMPOTENCY_MISMATCH',
          'O snapshot fiscal original não está disponível para comparar esta tentativa. Consulte o documento original.'
        );
      const fiscalMismatchFields = getFiscalSelectionMismatchDetails(
        snapshot.snapshot_data,
        command
      );
      if (
        command.requestedNumber !== undefined &&
        snapshot.reserved_number !== command.requestedNumber
      )
        fiscalMismatchFields.push({
          field: 'número fiscal',
          snapshotValue: String(snapshot.reserved_number),
          currentValue: String(command.requestedNumber),
        });
      if (fiscalMismatchFields.length)
        return failure(
          409,
          'HML_IDEMPOTENCY_MISMATCH',
          'A tentativa fiscal existente não pode ser reutilizada porque os dados fiscais foram alterados após a criação do snapshot.',
          {
            pending: false,
            documentId: previous.id,
            orderId: command.orderId,
            emissionRequestId: command.emissionRequestId,
            nfeNumber: previous.numero_nfe,
            series: previous.serie,
            environment: 2,
            model: previous.modelo,
            fiscalMismatchFields,
            hmlCanAbandonTlsFailure: canAbandonBeforeHmlTransmission(previous),
          }
        );
    }
    return retryHmlTechnical(db, previous.id, false);
  }
  const activeAttempt = await activeAttemptMetadata(db, command.orderId);
  if ('documentId' in activeAttempt)
    return failure(
      409,
      'HML_SNAPSHOT_RESERVATION_FAILED',
      SNAPSHOT_REASON_MESSAGES.ALREADY_ACTIVE_FISCAL_ATTEMPT,
      {
        ...activeAttempt,
        pending: true,
        environment: 2,
        orderId: command.orderId,
        databaseCode: '23505',
        databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
        diagnosticStage: 'snapshot-reservation',
        numberReserved: false,
        sefazContacted: false,
      }
    );
  return null;
}

/** A1, CSRT, numbering, tax decision and transport remain on the server. */
export async function emitHmlTechnical(
  db: Database,
  command: FiscalEmissionCommand,
  candidate: FiscalSnapshotCandidate,
  appSettings: Record<string, unknown>
): Promise<Result> {
  if (command.environment !== 2)
    return failure(
      503,
      'PRODUCTION_FISCAL_RULESET_REQUIRED',
      'Produção exige uma matriz fiscal aprovada própria.'
    );
  if (command.recipientTaxId && !isValidRecipientTaxId(command.recipientTaxId))
    return failure(
      422,
      'NFE_RECIPIENT_TAX_ID_INVALID',
      'CPF/CNPJ do destinatário inválido para emitir NF-e modelo 55.',
      { field: 'recipientTaxId', numberReserved: false, sefazContacted: false }
    );
  const recovered = await recoverHmlTechnical(db, command);
  if (recovered) return recovered;
  const technicalFixture = candidate.order.data.fiscalScenario === HML_TECHNICAL_RULESET_VERSION;
  if (!technicalFixture) {
    try {
      await loadHmlNormalSaleInputs(db, candidate, appSettings);
    } catch (error) {
      return failure(
        422,
        'FISCAL_DETERMINATION_REQUIRED',
        error instanceof Error ? error.message : 'Fatos do pedido real indisponíveis.',
        { numberReserved: false, sefazContacted: false }
      );
    }
    if (command.recipientTaxId !== undefined) {
      const customer = candidate.fiscalInputs?.customer;
      if (customer && typeof customer === 'object' && !Array.isArray(customer))
        customer.cpfCnpj = normalizeRecipientTaxId(command.recipientTaxId);
    }
  }
  const recipient = candidate.fiscalInputs?.customer;
  const effectiveRecipientTaxId =
    command.recipientTaxId !== undefined
      ? command.recipientTaxId
      : !technicalFixture && recipient && typeof recipient === 'object' && !Array.isArray(recipient)
        ? String(recipient.cpfCnpj || '')
        : '';
  if (
    !technicalFixture &&
    effectiveRecipientTaxId &&
    !isValidRecipientTaxId(effectiveRecipientTaxId)
  )
    return failure(
      422,
      'NFE_RECIPIENT_TAX_ID_INVALID',
      'CPF/CNPJ do destinatário inválido para emitir NF-e modelo 55.',
      { field: 'recipientTaxId', numberReserved: false, sefazContacted: false }
    );
  if (!technicalFixture)
    candidate.emissionRequest.recipientTaxId = normalizeRecipientTaxId(effectiveRecipientTaxId);
  const { data: decisionRow, error: decisionError } = await db
    .from('settings')
    .select('data')
    .eq('id', 'fiscal_decision_simples_nfe55_normal_sale_v1')
    .maybeSingle();
  if (decisionError || !decisionRow?.data)
    return failure(
      503,
      'HML_FISCAL_DECISION_UNAVAILABLE',
      'Decisão persistida de PIS/COFINS indisponível.'
    );
  let rules: Awaited<ReturnType<typeof createHmlNormalSaleRuleSet>>;
  try {
    const configuration = await loadHmlCsosnConfiguration(db, true);
    rules = technicalFixture
      ? createHmlTechnicalRuleSet(candidate, decisionRow.data, configuration)
      : await createHmlNormalSaleRuleSet(candidate, configuration);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cenário HML inválido.';
    if (message.includes('do destinatário é obrigatório'))
      return failure(422, 'NFE_RECIPIENT_TAX_ID_REQUIRED', message, {
        field: 'recipientTaxId',
        numberReserved: false,
        sefazContacted: false,
      });
    if (message.includes('CPF/CNPJ do destinatário inválido'))
      return failure(422, 'NFE_RECIPIENT_TAX_ID_INVALID', message, {
        field: 'recipientTaxId',
        numberReserved: false,
        sefazContacted: false,
      });
    const interstateMatrixUnavailable = message.includes(
      'não está coberta pela matriz HML_NORMAL_SALE_V2'
    );
    const interstateMatrixExecutionNotReady = message.includes(
      'HML_INTERSTATE_MATRIX_EXECUTION_NOT_READY'
    );
    return failure(
      422,
      interstateMatrixExecutionNotReady
        ? 'HML_INTERSTATE_MATRIX_EXECUTION_NOT_READY'
        : interstateMatrixUnavailable
          ? 'HML_INTERSTATE_MATRIX_NOT_APPROVED'
          : 'HML_RULESET_NOT_APPLICABLE',
      message,
      {
        ...(interstateMatrixUnavailable || interstateMatrixExecutionNotReady
          ? { requiredScope: 'approved_interstate_matrix' }
          : {}),
        numberReserved: false,
        sefazContacted: false,
      }
    );
  }
  const preflight = resolveFiscalDocument(candidate, rules);
  if (preflight.status !== 'ready')
    return failure(
      422,
      'HML_FISCAL_DOCUMENT_INCOMPLETE',
      'O pedido não passou pela determinação fiscal.',
      { blockers: preflight.blockers, numberReserved: false, sefazContacted: false }
    );
  try {
    validateParanaIssuerIe(preflight.document.issuer.ie);
  } catch (error) {
    return failure(
      422,
      'HML_ISSUER_IE_INVALID',
      error instanceof Error ? error.message : 'Inscrição estadual do emitente inválida.',
      { numberReserved: false, sefazContacted: false }
    );
  }
  const tech = getResponsibleTechnicianConfig();
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!tech || !pfx)
    return failure(
      503,
      'HML_CERTIFICATE_OR_CSRT_UNAVAILABLE',
      'Certificado A1 ou responsável técnico/CSRT não configurado no servidor.',
      {
        numberReserved: false,
        sefazContacted: false,
        configurationIssues: [
          ...getResponsibleTechnicianConfigurationIssues(),
          ...(!pfx ? ['certificate.base64'] : []),
        ],
      }
    );
  let cert: ReturnType<typeof extractCertificateAndKey>;
  try {
    cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
  } catch {
    return failure(503, 'HML_CERTIFICATE_INVALID', 'Certificado A1 inválido.', {
      numberReserved: false,
      sefazContacted: false,
    });
  }

  let sequence: ReturnType<typeof resolveNfeSequenceSettings>;
  try {
    sequence = resolveNfeSequenceSettings(appSettings, preflight.document.model, 2);
  } catch (error) {
    return failure(
      422,
      'HML_SEQUENCE_INVALID',
      error instanceof Error ? error.message : 'Série HML inválida.',
      { numberReserved: false, sefazContacted: false }
    );
  }
  if (
    !/^\d{1,3}$/.test(sequence.series) ||
    !Number.isInteger(sequence.minimumNumber) ||
    sequence.minimumNumber < 1 ||
    sequence.minimumNumber > 999999999
  )
    return failure(422, 'HML_SEQUENCE_INVALID', 'Série ou número inicial HML inválido.', {
      numberReserved: false,
      sefazContacted: false,
    });
  if (command.requestedNumber !== undefined && command.requestedNumber < sequence.minimumNumber)
    return failure(
      422,
      'HML_NUMBER_BELOW_SEQUENCE_START',
      `A numeração manual precisa ser igual ou superior ao início configurado (${sequence.minimumNumber}).`,
      { numberReserved: false, sefazContacted: false }
    );
  const snapshotRpcName =
    command.requestedNumber === undefined
      ? technicalFixture
        ? 'prepare_nfe_fiscal_snapshot'
        : 'prepare_nfe_fiscal_snapshot_with_context'
      : technicalFixture
        ? 'prepare_numbered_nfe_fiscal_snapshot'
        : 'prepare_numbered_nfe_fiscal_snapshot_with_context';
  const snapshotArgs = {
    p_order_id: command.orderId,
    p_emission_request_id: command.emissionRequestId,
    p_modelo: preflight.document.model,
    p_ambiente: 2,
    p_serie: sequence.series,
    p_numero_minimo: sequence.minimumNumber,
    p_item_csosn_overrides: command.itemCsosnOverrides || {},
    p_item_fiscal_selections: command.itemFiscalSelections || {},
    ...(technicalFixture
      ? {}
      : { p_recipient_tax_id: normalizeRecipientTaxId(effectiveRecipientTaxId) }),
    ...(technicalFixture
      ? {}
      : {
          p_final_consumer:
            command.finalConsumer ??
            (preflight.document.modelDecision?.status === 'ready' &&
              preflight.document.modelDecision.finalConsumer),
          p_delivery_by_issuer: command.deliveryByIssuer ?? false,
          p_card_not_integrated: command.cardNotIntegrated ?? false,
          p_model_decision: preflight.document.modelDecision,
        }),
    ...(command.requestedNumber === undefined
      ? {}
      : { p_requested_number: command.requestedNumber }),
  };
  const { data: reservationValue, error: reservationError } = await db.rpc(
    snapshotRpcName,
    snapshotArgs
  );
  const reservation = parseFiscalSnapshotReservation(reservationValue);
  if (reservationError?.message?.includes('NFE_NUMBER_ALREADY_USED') && command.requestedNumber) {
    const conflict = fiscalNumberConflict(command.requestedNumber);
    return failure(
      409,
      'NFE_NUMBER_ALREADY_USED',
      `A numeração ${command.requestedNumber} já está sendo usada.${
        conflict.nextNumber
          ? ` Número sugerido: ${command.requestedNumber} → ${conflict.nextNumber}.`
          : ' O limite de numeração foi atingido; informe outro número.'
      }`,
      {
        nfeNumber: command.requestedNumber,
        numberConflict: conflict,
        numberReserved: false,
        sefazContacted: false,
      }
    );
  }
  if (reservationError || !reservation) {
    const diagnosticId = randomUUID();
    const diagnostic = classifySnapshotReservationError(reservationError);
    const databaseReason = snapshotReasonOf(reservationError);
    const activeConflict = databaseReason === 'ALREADY_ACTIVE_FISCAL_ATTEMPT';
    const activeAttempt = activeConflict
      ? await activeAttemptMetadata(db, command.orderId, preflight.document.model)
      : {};
    console.error('[NF-e HML] Falha na reserva atômica do snapshot', {
      diagnosticId,
      stage: 'snapshot-reservation',
      rpc: snapshotRpcName,
      databaseCode: diagnostic.databaseCode,
      databaseReason,
      category: diagnostic.category,
      environment: 2,
      model: preflight.document.model,
    });
    return failure(
      activeConflict ? 409 : 503,
      'HML_SNAPSHOT_RESERVATION_FAILED',
      diagnostic.databaseReason
        ? `Emissão bloqueada pelo banco: ${diagnostic.hint}`
        : 'Não foi possível reservar snapshot e número fiscal HML de forma atômica.',
      {
        diagnosticId,
        diagnosticStage: 'snapshot-reservation',
        databaseCode: diagnostic.databaseCode,
        databaseReason,
        diagnosticCategory: diagnostic.category,
        diagnosticHint: diagnostic.hint,
        numberReserved: false,
        sefazContacted: false,
        ...(activeConflict
          ? { ...activeAttempt, pending: true, orderId: command.orderId, environment: 2 }
          : {}),
      }
    );
  }
  const { data: saved, error: snapshotError } = await db
    .from('nfe_fiscal_snapshots')
    .select(
      'snapshot_data,snapshot_sha256,order_id,environment,requested_model,reserved_number,series'
    )
    .eq('id', reservation.snapshotId)
    .maybeSingle();
  if (
    snapshotError ||
    !saved ||
    saved.snapshot_sha256 !== reservation.snapshotHash ||
    saved.order_id !== command.orderId ||
    saved.environment !== 2 ||
    saved.requested_model !== preflight.document.model ||
    saved.reserved_number !== reservation.number ||
    saved.series !== sequence.series
  )
    return failure(503, 'HML_SNAPSHOT_READ_FAILED', 'Snapshot reservado não pôde ser validado.', {
      numberReserved: true,
      documentId: reservation.snapshotId,
    });
  const persisted = saved.snapshot_data as FiscalSnapshot;
  const facts: FiscalSnapshotCandidate = {
    schemaVersion: persisted.schemaVersion,
    capturedAt: persisted.capturedAt,
    order: persisted.order,
    issuerProfile: persisted.issuerProfile,
    fiscalConfiguration: persisted.fiscalConfiguration,
    fiscalInputs: persisted.fiscalInputs,
    emissionRequest: {
      id: command.emissionRequestId,
      environment: 2,
      itemCsosnOverrides: persisted.emissionRequest.itemCsosnOverrides,
      itemFiscalSelections: persisted.emissionRequest.itemFiscalSelections,
      recipientTaxId: persisted.emissionRequest.recipientTaxId,
      finalConsumer: persisted.emissionRequest.finalConsumer,
      deliveryByIssuer: persisted.emissionRequest.deliveryByIssuer,
      cardNotIntegrated: persisted.emissionRequest.cardNotIntegrated,
      modelDecision: persisted.emissionRequest.modelDecision,
    },
    persistedHash: reservation.snapshotHash,
  };
  try {
    const configuration = parseHmlCsosnConfiguration(persisted.fiscalConfiguration);
    rules = technicalFixture
      ? createHmlTechnicalRuleSet(facts, decisionRow.data, configuration)
      : await createHmlNormalSaleRuleSet(facts, configuration);
  } catch {
    return failure(
      422,
      'HML_PERSISTED_CONFIGURATION_INVALID',
      'Configuração fiscal do snapshot não pôde ser validada.',
      { numberReserved: true }
    );
  }
  const resolved = resolveFiscalDocument(facts, rules);
  if (
    resolved.status !== 'ready' ||
    resolved.document.model !== saved.requested_model ||
    (!technicalFixture &&
      !isSameFiscalModelDecision(
        resolved.document.modelDecision,
        persisted.emissionRequest.modelDecision
      ))
  )
    return failure(
      422,
      'HML_PERSISTED_SNAPSHOT_INVALID',
      'O snapshot persistido não passou pela determinação fiscal.',
      { blockers: resolved.status === 'blocked' ? resolved.blockers : [], numberReserved: true }
    );
  try {
    validateParanaIssuerIe(resolved.document.issuer.ie);
  } catch (error) {
    return failure(
      422,
      'HML_PERSISTED_ISSUER_IE_INVALID',
      error instanceof Error ? error.message : 'Inscrição estadual do snapshot inválida.',
      { numberReserved: true, sefazContacted: false }
    );
  }
  const issuedAt = saoPauloTimestamp(reservation.issuedAt);
  const cNf = createHash('sha256').update(command.emissionRequestId).digest('hex');
  const randomCode = String(parseInt(cNf.slice(0, 10), 16) % 100000000).padStart(8, '0');
  const accessKey = generateNfeAccessKey({
    ufCode: '41',
    yearMonth: issuedAt.slice(2, 4) + issuedAt.slice(5, 7),
    cnpj: resolved.document.issuer.cnpj,
    model: resolved.document.model,
    series: sequence.series,
    number: reservation.number,
    emissionType: '1',
    randomCode,
  }).accessKey;
  let signedXml: string;
  try {
    let xml = serializeFiscalDocument(facts, resolved.document, rules, {
      accessKey,
      series: Number(sequence.series),
      number: reservation.number,
      issuedAt,
    });
    xml = appendResponsibleTechnician(xml, accessKey, tech);
    await validateUnsignedNfeStructure(xml);
    signedXml = signNfeXml(xml, cert.privateKeyPem, cert.certDerBase64);
    await validateNfeAgainstOfficialSchema(signedXml);
    await assertXmlFiscalSelections(facts, signedXml);
  } catch (error) {
    return failure(
      422,
      'HML_XML_INVALID',
      error instanceof Error ? error.message : 'XML HML inválido.',
      { numberReserved: true, sefazContacted: false }
    );
  }

  const attemptToken = randomUUID();
  const { data: documentId, error: insertError } = await db.rpc(
    'reserve_hml_nfe_outbound_with_replacement',
    {
      p_attempt_token: attemptToken,
      p_order_id: command.orderId,
      p_emission_request_id: command.emissionRequestId,
      p_access_key: accessKey,
      p_signed_xml: signedXml,
      p_number: reservation.number,
      p_series: sequence.series,
      p_decision_trace: resolved.document.decisions as unknown as Record<string, unknown>[],
      p_supersedes_document_id: command.supersedesDocumentId || null,
    }
  );
  if (insertError || !documentId) {
    const activeAttempt = await activeAttemptMetadata(
      db,
      command.orderId,
      preflight.document.model
    );
    return failure(
      409,
      'HML_ACTIVE_ATTEMPT_OR_PERSISTENCE_FAILED',
      'Tentativa fiscal já ativa ou XML não pôde ser persistido. Consulte a emissão antes de repetir.',
      {
        pending: true,
        numberReserved: true,
        ...activeAttempt,
        ...('documentId' in activeAttempt
          ? { databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT' }
          : {}),
      }
    );
  }
  const metadata = {
    emissionRequestId: command.emissionRequestId,
    documentId,
    orderId: command.orderId,
    fiscalSnapshotId: reservation.snapshotId,
    accessKey,
    nfeNumber: reservation.number,
    series: sequence.series,
    model: resolved.document.model,
    environment: 2,
  };

  try {
    return await transmitAndPersist(
      db,
      documentId,
      signedXml,
      accessKey,
      reservation.number,
      metadata,
      cert,
      attemptToken
    );
  } finally {
    await releaseAttempt(db, documentId, attemptToken);
  }
}
