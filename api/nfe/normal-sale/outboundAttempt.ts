import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateOrdinaryOutboundEnvelope } from '../../../erp/src/pages/utils/nfe/fiscalEnvelope';
import { parseAuthorizedInvoiceLines } from '../../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { parseSefazNfeSituation } from '../../../erp/src/pages/utils/nfe/nfeEventRules';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';
import { getNfeServiceEndpoint } from '../fiscalEnvironmentPolicy';
import { assertXmlFiscalSelections } from '../fiscalSelectionIntegrity';
import type { FiscalEmissionCommand } from '../fiscalSnapshot';
import { extractCertificateAndKey } from '../nfeSigner';
import { isNfeProductionEnabled } from '../productionGuard';
import { validateNfeAgainstOfficialSchema } from '../schemaValidator';
import { sendSoapToSefaz } from '../sefazClient';
import { embeddedNfeXml } from '../xmlEnvelope';
import {
  canonicalFiscalCommand,
  fiscalAttemptCommand,
  isUncertainAuthorization,
} from './attemptPolicy';

export type OutboundDatabase = SupabaseClient<FiscalDatabase>;
export type OutboundResult = { status: number; body: Record<string, unknown> };
type Attempt = FiscalDatabase['public']['Tables']['nfe_outbound_attempts']['Row'];
type Document = FiscalDatabase['public']['Tables']['nfe_documents']['Row'];
export const outboundFailure = (
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {}
): OutboundResult => ({ status, body: { success: false, code, error, ...extra } });
const metadata = (a: Attempt) => ({
  documentId: a.document_id,
  orderId: a.order_id,
  emissionRequestId: a.emission_request_id,
  fiscalSnapshotId: a.snapshot_id,
  accessKey: a.access_key,
  nfeNumber: a.number,
  series: a.series,
  model: a.model,
  environment: a.environment,
  numberReserved: true,
});

export function productionTransmissionGate(
  environment: 1 | 2,
  confirmed: boolean
): OutboundResult | null {
  if (
    environment === 1 &&
    (!isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED) || !confirmed)
  )
    return outboundFailure(
      403,
      'PRODUCTION_EMISSION_DISABLED',
      'Habilite a emissão produtiva no servidor e confirme o ambiente de Produção.'
    );
  return null;
}

async function persist(
  db: OutboundDatabase,
  a: Attempt,
  token: string,
  state: string,
  reason: string,
  response: string,
  protocol: string | null = null,
  xml = ''
) {
  const items =
    state === 'authorized'
      ? parseAuthorizedInvoiceLines(xml).map((line) => ({
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
  const result = await db.rpc('persist_nfe_outbound_result', {
    p_document_id: a.document_id,
    p_attempt_token: token,
    p_state: state,
    p_reason: reason,
    p_response_xml: response,
    p_protocol: protocol,
    p_items: items,
  });
  if (result.error) throw new Error('FISCAL_RESULT_PERSIST_FAILED');
}

function finalResult(a: Attempt, doc: Document): OutboundResult {
  const parsed = parseSefazAuthorization(String(doc.xml_protocolo || ''));
  return {
    status: 200,
    body: {
      ...parsed,
      success: a.state === 'authorized' && doc.status !== 'cancelada',
      ...metadata(a),
      state: doc.status === 'cancelada' ? 'cancelled' : a.state,
      pending: false,
      signedXml: doc.xml_nfe,
      sefazResponseXml: doc.xml_protocolo,
      protocolNumber: doc.numero_protocolo,
      xMotivo: doc.motivo_status,
      ...(doc.status === 'cancelada'
        ? {
            code: 'FISCAL_ALREADY_CANCELLED',
            error: 'O documento original está cancelado. Seu histórico foi preservado.',
          }
        : {}),
      ...(a.state === 'rejected'
        ? { code: 'FISCAL_SEFAZ_REJECTED', error: doc.motivo_status }
        : {}),
    },
  };
}

/** Called with an owned lease. There is exactly one SOAP call, after the durable start marker. */
export async function transmitPreparedOutbound(
  db: OutboundDatabase,
  a: Attempt,
  doc: Document,
  token: string,
  certificate: ReturnType<typeof extractCertificateAndKey>,
  productionConfirmed: boolean
): Promise<OutboundResult> {
  const gate = productionTransmissionGate(a.environment, productionConfirmed);
  if (gate) return { ...gate, body: { ...gate.body, ...metadata(a), sefazContacted: false } };
  try {
    const saved = await db
      .from('nfe_fiscal_snapshots')
      .select('snapshot_data')
      .eq('id', a.snapshot_id)
      .maybeSingle();
    const xml = String(doc.xml_nfe || '');
    if (
      saved.error ||
      !saved.data ||
      createHash('sha256').update(xml).digest('hex') !== a.xml_sha256
    )
      throw new Error('Snapshot ou XML reservado indisponível.');
    const envelopeError = validateOrdinaryOutboundEnvelope({
      xml,
      accessKey: a.access_key,
      model: a.model,
      environment: a.environment,
      nfeNumber: a.number,
      series: a.series,
    });
    if (envelopeError) throw new Error(envelopeError);
    await assertXmlFiscalSelections(saved.data.snapshot_data, xml);
    await validateNfeAgainstOfficialSchema(xml);
    // Existing online NFC-e policy: an expired dhEmi needs a controlled new intent, never a silent XML rewrite.
    const issuedAt = xml.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1];
    if (a.model === '65' && (!issuedAt || Date.now() - Date.parse(issuedAt) > 5 * 60_000))
      return outboundFailure(
        409,
        'FISCAL_XML_EXPIRED',
        'XML NFC-e reservado fora do prazo de emissão. A reserva foi preservada para tratamento fiscal.',
        { ...metadata(a), state: a.state, sefazContacted: false }
      );
  } catch (error) {
    return outboundFailure(
      422,
      'FISCAL_TRANSMISSION_INTEGRITY_FAILED',
      error instanceof Error ? error.message : 'XML reservado inválido.',
      { ...metadata(a), sefazContacted: false }
    );
  }
  const started = await db.rpc('start_nfe_outbound_transmission', {
    p_document_id: a.document_id,
    p_attempt_token: token,
  });
  if (started.error)
    return outboundFailure(
      503,
      'FISCAL_START_NOT_CONFIRMED',
      'Não foi possível confirmar o início da transmissão. Consulte a tentativa original.',
      { ...metadata(a), pending: true, sefazContacted: false }
    );
  let response: string;
  try {
    response = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(a.model, a.environment, 'NFeAutorizacao4'),
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
      xmlPayload: `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${a.number}</idLote><indSinc>1</indSinc>${embeddedNfeXml(String(doc.xml_nfe))}</enviNFe>`,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
  } catch {
    let recorded = false;
    try {
      await persist(
        db,
        a,
        token,
        'reconciling',
        'Transmissão sem resposta confirmada; consulta obrigatória antes de retry.',
        ''
      );
      recorded = true;
    } catch {
      /* Durable transmitting marker remains authoritative. */
    }
    return outboundFailure(
      502,
      'FISCAL_TRANSMISSION_UNCERTAIN',
      'Transmissão sem resposta confirmada. Consulte a chave reservada antes de repetir.',
      { ...metadata(a), pending: true, state: 'unknown', reconciliationRecorded: recorded }
    );
  }
  const parsed = parseSefazAuthorization(response);
  // PostgreSQL validates protocol key, tpAmb and cStat atomically with items and final status.
  const state = parsed.authorized
    ? 'authorized'
    : isUncertainAuthorization(parsed.cStat, parsed.pending)
      ? 'reconciling'
      : 'rejected';
  try {
    await persist(
      db,
      a,
      token,
      state,
      parsed.xMotivo || 'Resposta SEFAZ inconclusiva.',
      response,
      state === 'authorized' ? parsed.protocolNumber || null : null,
      String(doc.xml_nfe)
    );
  } catch {
    return outboundFailure(
      503,
      'FISCAL_RESULT_PERSIST_FAILED',
      'Resposta recebida sem confirmação local. Consulte a tentativa original; não retransmita.',
      { ...metadata(a), pending: true, state: 'unknown' }
    );
  }
  return {
    status: state === 'rejected' ? 422 : 200,
    body: {
      ...parsed,
      success: state === 'authorized',
      pending: state === 'reconciling',
      state,
      ...metadata(a),
      signedXml: doc.xml_nfe,
      sefazResponseXml: response,
      ...(state === 'rejected' ? { code: 'FISCAL_SEFAZ_REJECTED', error: parsed.xMotivo } : {}),
    },
  };
}

export async function loadOutboundAttempt(db: OutboundDatabase, documentId: string) {
  const [attempt, document] = await Promise.all([
    db.from('nfe_outbound_attempts').select('*').eq('document_id', documentId).maybeSingle(),
    db.from('nfe_documents').select('*').eq('id', documentId).maybeSingle(),
  ]);
  if (attempt.error || document.error || !attempt.data || !document.data)
    throw new Error('FISCAL_ATTEMPT_UNAVAILABLE');
  return { attempt: attempt.data, document: document.data };
}

/** Consultation never allocates or rebuilds. A formerly uncertain request stops after the first confirmed 217. */
export async function reconcileNormalSale(
  db: OutboundDatabase,
  documentId: string,
  allowTransmission = false,
  productionConfirmed = false,
  ownedToken?: string
): Promise<OutboundResult> {
  let loaded: Awaited<ReturnType<typeof loadOutboundAttempt>>;
  try {
    loaded = await loadOutboundAttempt(db, documentId);
  } catch {
    return outboundFailure(
      503,
      'FISCAL_ATTEMPT_UNAVAILABLE',
      'Tentativa fiscal indisponível. Nenhuma nova numeração foi reservada.',
      { documentId, pending: true }
    );
  }
  const { attempt: a, document: doc } = loaded;
  if (['authorized', 'rejected'].includes(a.state)) return finalResult(a, doc);
  const token = ownedToken || randomUUID();
  if (!ownedToken) {
    const claimed = await db.rpc('claim_nfe_outbound_attempt', {
      p_document_id: documentId,
      p_attempt_token: token,
    });
    if (claimed.error || !claimed.data)
      return outboundFailure(
        409,
        'FISCAL_ATTEMPT_IN_PROGRESS',
        'Outra operação fiscal está em andamento. Consulte novamente após sua conclusão.',
        { ...metadata(a), pending: true }
      );
  }
  try {
    if (a.state === 'prepared' && !allowTransmission)
      return outboundFailure(
        409,
        'FISCAL_PREPARED_NOT_SENT',
        'Documento reservado; a transmissão não foi iniciada.',
        { ...metadata(a), pending: false, state: 'prepared', sefazContacted: false }
      );
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    if (!pfx)
      return outboundFailure(
        503,
        'FISCAL_CERTIFICATE_UNAVAILABLE',
        'Certificado A1 indisponível para consultar ou transmitir.',
        { ...metadata(a), pending: a.state !== 'prepared' }
      );
    const certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
    if (a.state === 'prepared' && allowTransmission)
      return await transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed);
    const response = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(a.model, a.environment, 'NFeConsultaProtocolo4'),
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${a.environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${a.access_key}</chNFe></consSitNFe>`,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
    const situation = parseSefazNfeSituation(response);
    if (situation.state === 'authorized') {
      const parsed = parseSefazAuthorization(response);
      await persist(
        db,
        a,
        token,
        'authorized',
        parsed.xMotivo,
        response,
        parsed.protocolNumber || null,
        String(doc.xml_nfe)
      );
      return {
        status: 200,
        body: {
          ...parsed,
          success: true,
          pending: false,
          state: 'authorized',
          ...metadata(a),
          signedXml: doc.xml_nfe,
          sefazResponseXml: response,
        },
      };
    }
    if (situation.state === 'not_found') {
      await persist(db, a, token, 'confirmed_not_found', `217: ${situation.xMotivo}`, response);
      if (allowTransmission && a.state === 'confirmed_not_found')
        return await transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed);
      return outboundFailure(
        409,
        'FISCAL_CONFIRMED_NOT_FOUND',
        '217: Documento não encontrado. Uma nova tentativa explícita reutilizará o XML, a chave e o número reservados.',
        {
          ...metadata(a),
          pending: false,
          state: 'not_found',
          cStat: '217',
          xMotivo: situation.xMotivo,
        }
      );
    }
    await persist(
      db,
      a,
      token,
      'reconciling',
      'Consulta não confirmou autorização nem ausência do documento.',
      response
    );
    return outboundFailure(
      409,
      'FISCAL_RECONCILIATION_REQUIRED',
      'Consulta inconclusiva. Não retransmita sem confirmar a situação da chave reservada.',
      { ...metadata(a), pending: true, state: 'unknown', cStat: situation.cStat }
    );
  } catch {
    return outboundFailure(
      502,
      'FISCAL_RECONCILIATION_REQUIRED',
      'Não foi possível confirmar e persistir a situação fiscal. A tentativa e o número foram preservados.',
      { ...metadata(a), pending: true, state: 'unknown' }
    );
  } finally {
    try {
      await db.rpc('release_nfe_outbound_attempt', {
        p_document_id: documentId,
        p_attempt_token: token,
      });
    } catch {
      /* Lease expires in PostgreSQL. */
    }
  }
}

export async function recoverNormalSale(
  db: OutboundDatabase,
  command: FiscalEmissionCommand
): Promise<OutboundResult | null> {
  const prior = await db
    .from('nfe_outbound_attempts')
    .select('*')
    .eq('emission_request_id', command.emissionRequestId)
    .maybeSingle();
  if (prior.error)
    return outboundFailure(
      503,
      'FISCAL_RECOVERY_UNAVAILABLE',
      'Não foi possível verificar a idempotência. Nenhum número novo será reservado.',
      { pending: true }
    );
  if (!prior.data) return null;
  if (
    canonicalFiscalCommand(prior.data.request_command) !==
    canonicalFiscalCommand(fiscalAttemptCommand(command))
  )
    return outboundFailure(
      409,
      'IDEMPOTENCY_KEY_REUSED',
      'A chave de idempotência já pertence a outro payload fiscal.',
      metadata(prior.data)
    );
  return reconcileNormalSale(
    db,
    prior.data.document_id,
    true,
    command.productionConfirmed === true
  );
}
