import { createHash, randomUUID } from 'node:crypto';
import { generateNfeAccessKey } from '../../erp/src/pages/utils/nfe/nfeAccessKey';
import { resolveNfeSequenceSettings } from '../../erp/src/pages/utils/nfe/nfeSequenceSettings';
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
import { loadHmlCsosnConfiguration, parseHmlCsosnConfiguration } from './csosnPolicy';
import { assertXmlFiscalSelections } from './fiscalSelectionIntegrity';
import {
  createHmlNormalSaleRuleSet,
  loadHmlNormalSaleInputs,
} from './hmlNormalSaleRuleSet';
import { validateParanaIssuerIe } from './paranaIssuerIe';
import { fiscalNumberConflict } from '../../shared-utils/fiscalNumbering';
import { isValidRecipientTaxId, normalizeRecipientTaxId } from '../../shared-utils/recipientTaxId';
import { isSameFiscalModelDecision } from '../../shared-utils/fiscalDocumentModel';
import type { ApprovedFiscalRuleSet } from './fiscalCore';
import type { Database, Result } from './hml-technical/types';
import { failure, saoPauloTimestamp } from './hml-technical/constants';
import {
  snapshotReasonOf,
  classifySnapshotReservationError,
  activeAttemptMetadata,
} from './hml-technical/snapshotClassification';
import { transmitAndPersist, releaseAttempt } from './hml-technical/transmission';
import { recoverHmlTechnical } from './hml-technical/retryAndRecovery';

export {
  isHmlRuleSet,
  consultAuthorizedHmlTechnical,
  retryHmlTechnical,
  recoverHmlTechnical,
} from './hml-technical';

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
  let rules: ApprovedFiscalRuleSet;
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
