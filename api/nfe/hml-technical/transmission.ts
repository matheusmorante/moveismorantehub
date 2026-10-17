import { randomUUID } from 'node:crypto';
import { sendSoapToSefaz } from '../sefazClient';
import { withNfeEmissionStage } from '../nfeEmissionPerformance';
import { assertXmlFiscalSelections } from '../fiscalSelectionIntegrity';
import { embeddedNfeXml } from '../xmlEnvelope';
import { sefazTransportDiagnostic } from '../sefazTransportDiagnostic';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseAuthorizedInvoiceLines } from '../../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import {
  fiscalNumberConflict,
  isDifferentKeyNumberConflict,
} from '../../../shared-utils/fiscalNumbering';
import type { extractCertificateAndKey } from '../nfeSigner';
import type { Database, Result } from './types';
import { hmlEndpoint, failure, hasProtocolKey } from './constants';

export async function releaseAttempt(
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

export async function transmitAndPersist(
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
          serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
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
