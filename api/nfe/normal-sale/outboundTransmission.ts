import { createHash } from 'node:crypto';
import { validateOrdinaryOutboundEnvelope } from '../../../erp/src/pages/utils/nfe/fiscalEnvelope';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import { getNfeServiceEndpoint } from '../fiscalEnvironmentPolicy';
import { assertXmlFiscalSelections } from '../fiscalSelectionIntegrity';
import { assertSignedFiscalXmlMatchesSnapshot } from '../fiscalXmlAudit';
import type {
  FiscalDocument,
  FiscalSnapshotCandidate,
} from '../fiscalSnapshot';
import { extractCertificateAndKey } from '../nfeSigner';
import { validateNfeAgainstOfficialSchema } from '../schemaValidator';
import { sendSoapToSefaz } from '../sefazClient';
import { withNfeEmissionStage } from '../nfeEmissionPerformance';
import { embeddedNfeXml } from '../xmlEnvelope';
import { isUncertainAuthorization } from './attemptPolicy';
import {
  type Attempt,
  type Document,
  type OutboundDatabase,
  type OutboundResult,
  metadata,
  outboundFailure,
} from './outboundTypes';
import { persistResultToDatabase } from './outboundPersistence';
import { productionTransmissionGate } from './outboundRecovery';

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

    const snapshot = saved.data.snapshot_data as unknown as FiscalSnapshotCandidate & {
      resolvedDocument?: FiscalDocument;
    };
    if (!snapshot.resolvedDocument)
      throw new Error('Snapshot fiscal sem documento resolvido para a auditoria final.');

    const issuedAt = xml.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1];
    if (!issuedAt) throw new Error('XML reservado sem instante de emissão fiscal.');

    assertSignedFiscalXmlMatchesSnapshot(
      snapshot,
      snapshot.resolvedDocument,
      xml,
      { series: a.series, number: a.number, accessKey: a.access_key, issuedAt },
      certificate.certPem
    );
    await assertXmlFiscalSelections(snapshot, xml);
    await validateNfeAgainstOfficialSchema(xml);

    // Existing online NFC-e policy: an expired dhEmi needs a controlled new intent, never a silent XML rewrite.
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

  const started = await withNfeEmissionStage(
    'start_transmission_rpc',
    () =>
      db.rpc('start_nfe_outbound_transmission', {
        p_document_id: a.document_id,
        p_attempt_token: token,
      }),
    { emissionRequestId: a.emission_request_id }
  );
  if (started.error)
    return outboundFailure(
      503,
      'FISCAL_START_NOT_CONFIRMED',
      'Não foi possível confirmar o início da transmissão. Consulte a tentativa original.',
      { ...metadata(a), pending: true, sefazContacted: false }
    );

  let response: string;
  try {
    response = await withNfeEmissionStage(
      'sefaz_transmission',
      () =>
        sendSoapToSefaz({
          url: getNfeServiceEndpoint(a.model, a.environment, 'NFeAutorizacao4'),
          action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
          xmlPayload: `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${a.number}</idLote><indSinc>1</indSinc>${embeddedNfeXml(String(doc.xml_nfe))}</enviNFe>`,
          certPem: certificate.certPem,
          privateKeyPem: certificate.privateKeyPem,
        }),
      { model: a.model, environment: a.environment, emissionRequestId: a.emission_request_id }
    );
  } catch {
    let recorded = false;
    try {
      await persistResultToDatabase(
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
  const state = parsed.authorized
    ? 'authorized'
    : isUncertainAuthorization(parsed.cStat, parsed.pending)
      ? 'reconciling'
      : 'rejected';

  try {
    await withNfeEmissionStage(
      'persist_result_rpc',
      () =>
        persistResultToDatabase(
          db,
          a,
          token,
          state,
          parsed.xMotivo || 'Resposta SEFAZ inconclusiva.',
          response,
          state === 'authorized' ? parsed.protocolNumber || null : null,
          String(doc.xml_nfe)
        ),
      { emissionRequestId: a.emission_request_id }
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
