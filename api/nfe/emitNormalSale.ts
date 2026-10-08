import { createHash, randomUUID } from 'node:crypto';
import { generateNfeAccessKey } from '../../erp/src/pages/utils/nfe/nfeAccessKey';
import { resolveNfeSequenceSettings } from '../../erp/src/pages/utils/nfe/nfeSequenceSettings';
import { assertXmlFiscalSelections } from './fiscalSelectionIntegrity';
import type {
  FiscalEmissionCommand,
  FiscalSnapshot,
  FiscalSnapshotCandidate,
} from './fiscalSnapshot';
import { resolveFiscalDocument } from './fiscalSnapshot';
import { serializeFiscalDocument } from './fiscalXmlSerializer';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { fiscalAttemptCommand, saoPauloEmissionTimestamp } from './normal-sale/attemptPolicy';
import {
  type OutboundDatabase,
  type OutboundResult,
  outboundFailure,
  productionTransmissionGate,
  reconcileNormalSale,
  recoverNormalSale,
} from './normal-sale/outboundAttempt';
import { obj } from './normal-sale/values';
import { createNormalSaleRuleSet, loadNormalSaleInputs } from './normalSaleRuleSet';
import { validateParanaIssuerIe } from './paranaIssuerIe';
import {
  appendResponsibleTechnician,
  getResponsibleTechnicianConfig,
  getResponsibleTechnicianConfigurationIssues,
} from './responsibleTechnician';
import { validateNfeAgainstOfficialSchema, validateUnsignedNfeStructure } from './schemaValidator';
import { isSyntheticOrderBlockedInProduction } from './normal-sale/testOrderProductionGuard';

/** One normal-sale pipeline for tpAmb 1/2. The database commits number, facts, signed XML and attempt together. */
export async function emitNormalSale(
  db: OutboundDatabase,
  command: FiscalEmissionCommand,
  candidate: FiscalSnapshotCandidate,
  appSettings: Record<string, unknown>,
  actorId: string
): Promise<OutboundResult> {
  if (isSyntheticOrderBlockedInProduction(command.environment, candidate.order.data))
    return outboundFailure(
      403,
      'TEST_ORDER_PRODUCTION_BLOCKED',
      'Pedidos marcados como teste não podem ser emitidos em Produção.',
      { numberReserved: false, sefazContacted: false }
    );

  const recovered = await recoverNormalSale(db, command);
  if (recovered) return recovered;
  const gate = productionTransmissionGate(
    command.environment,
    command.productionConfirmed === true
  );
  if (gate)
    return { ...gate, body: { ...gate.body, numberReserved: false, sefazContacted: false } };
  if (command.supersedesDocumentId)
    return outboundFailure(
      409,
      'FISCAL_REPLACEMENT_POLICY_REQUIRED',
      'A substituição deve seguir a política de correção do documento original.',
      { numberReserved: false, sefazContacted: false }
    );
  if (candidate.order.data.fiscalScenario === 'HML_TECHNICAL_V1')
    return outboundFailure(
      422,
      'SYNTHETIC_FISCAL_SCENARIO',
      'Fixture técnica não pertence ao fluxo de venda normal.',
      { numberReserved: false, sefazContacted: false }
    );

  const facts = structuredClone(candidate);
  let preparationSubmitted = false;
  try {
    await loadNormalSaleInputs(db, facts, appSettings);
    let rules = await createNormalSaleRuleSet(facts);
    const preflight = resolveFiscalDocument(facts, rules);
    if (preflight.status !== 'ready')
      return outboundFailure(
        422,
        'FISCAL_DETERMINATION_REQUIRED',
        'O pedido não passou pela determinação fiscal.',
        { blockers: preflight.blockers, numberReserved: false, sefazContacted: false }
      );
    validateParanaIssuerIe(preflight.document.issuer.ie);
    const model = preflight.document.model;
    // Keep exactly the shared scenario decision that PostgreSQL re-reads under lock.
    const inputs = obj(facts.fiscalInputs);
    const decisions = inputs.contributionDecisions ? obj(inputs.contributionDecisions) : {};
    const { contributionDecisions: _allDecisions, ...ownInputs } = inputs;
    facts.fiscalInputs = {
      ...ownInputs,
      contributionDecision: inputs.contributionDecision ?? decisions[model],
    };
    facts.emissionRequest.modelDecision = preflight.document.modelDecision;
    facts.emissionRequest.finalConsumer = preflight.document.operation.finalConsumer === '1';
    rules = await createNormalSaleRuleSet(facts);
    const resolved = resolveFiscalDocument(facts, rules);
    if (resolved.status !== 'ready' || resolved.document.model !== model)
      throw new Error('Modelo fiscal divergiu durante a preparação.');

    const sequence = resolveNfeSequenceSettings(appSettings, model, command.environment);
    if (
      !Number.isInteger(sequence.minimumNumber) ||
      sequence.minimumNumber < 1 ||
      sequence.minimumNumber > 999999999
    )
      throw new Error('Número inicial fiscal inválido.');
    if (command.requestedNumber !== undefined && command.requestedNumber < sequence.minimumNumber)
      throw new Error(
        `A numeração deve ser igual ou superior ao início configurado (${sequence.minimumNumber}).`
      );
    const minimum = command.requestedNumber ?? sequence.minimumNumber;
    const tech = getResponsibleTechnicianConfig(process.env, command.environment);
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    if (!tech || !pfx)
      return outboundFailure(
        503,
        'FISCAL_CERTIFICATE_OR_CSRT_UNAVAILABLE',
        'Certificado A1 ou responsável técnico/CSRT não configurado para o ambiente.',
        {
          numberReserved: false,
          sefazContacted: false,
          configurationIssues: [
            ...getResponsibleTechnicianConfigurationIssues(process.env, command.environment),
            ...(!pfx ? ['certificate.base64'] : []),
          ],
        }
      );
    const certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
    const issuedAt = saoPauloEmissionTimestamp(facts.capturedAt);
    const code = createHash('sha256').update(command.emissionRequestId).digest('hex');
    const randomCode = String(Number.parseInt(code.slice(0, 10), 16) % 100000000).padStart(8, '0');

    // CAS retries happen before any external call. A losing preparation consumes no number or snapshot.
    for (let preparation = 0; preparation < 3; preparation++) {
      const peek = await db.rpc('peek_nfe_outbound_number', {
        p_issuer_cnpj: resolved.document.issuer.cnpj,
        p_model: model,
        p_environment: command.environment,
        p_series: sequence.series,
        p_minimum: minimum,
      });
      if (peek.error || !Number.isInteger(peek.data))
        return outboundFailure(
          503,
          'FISCAL_SEQUENCE_UNAVAILABLE',
          'Não foi possível consultar a próxima numeração fiscal.',
          { numberReserved: false, sefazContacted: false }
        );
      const number = peek.data as number;
      if (command.requestedNumber !== undefined && number !== command.requestedNumber)
        return outboundFailure(
          409,
          'NFE_NUMBER_ALREADY_USED',
          'A numeração solicitada já está reservada ou foi utilizada.',
          {
            numberReserved: false,
            sefazContacted: false,
            numberConflict: { requestedNumber: command.requestedNumber, nextNumber: number },
            nfeNumber: command.requestedNumber,
          }
        );
      const accessKey = generateNfeAccessKey({
        ufCode: '41',
        yearMonth: issuedAt.slice(2, 4) + issuedAt.slice(5, 7),
        cnpj: resolved.document.issuer.cnpj,
        model,
        series: sequence.series,
        number,
        emissionType: '1',
        randomCode,
      }).accessKey;
      const snapshot: FiscalSnapshot = {
        ...facts,
        emissionRequest: {
          ...facts.emissionRequest,
          requestedModel: model,
          series: sequence.series,
          number,
        },
      };
      let xml = serializeFiscalDocument(facts, resolved.document, rules, {
        accessKey,
        series: Number(sequence.series),
        number,
        issuedAt,
      });
      xml = appendResponsibleTechnician(xml, accessKey, tech);
      await validateUnsignedNfeStructure(xml);
      const signedXml = signNfeXml(xml, certificate.privateKeyPem, certificate.certDerBase64);
      await validateNfeAgainstOfficialSchema(signedXml);
      await assertXmlFiscalSelections(snapshot, signedXml);
      const token = randomUUID();
      preparationSubmitted = true;
      const saved = await db.rpc('prepare_nfe_outbound_attempt', {
        p_snapshot: { ...snapshot, decisionTrace: resolved.document.decisions },
        p_signed_xml: signedXml,
        p_access_key: accessKey,
        p_request_command: fiscalAttemptCommand(command),
        p_attempt_token: token,
        p_actor_id: actorId,
        p_minimum_number: minimum,
      });
      if (
        saved.error?.message.includes('FISCAL_SEQUENCE_CHANGED') &&
        command.requestedNumber === undefined
      ) {
        preparationSubmitted = false;
        continue;
      }
      if (saved.error || !saved.data?.documentId) {
        // A lost RPC response can hide a committed preparation. Resolve the original intent before returning.
        const recovery = await recoverNormalSale(db, command);
        if (recovery) return recovery;
        if (!saved.error?.code)
          return outboundFailure(
            503,
            'FISCAL_PREPARATION_UNCONFIRMED',
            'A resposta da preparação não foi confirmada. Preserve esta intenção e consulte antes de repetir.',
            {
              pending: true,
              emissionRequestId: command.emissionRequestId,
              orderId: command.orderId,
              environment: command.environment,
              sefazContacted: false,
            }
          );
        const reason =
          saved.error?.message.match(/\b[A-Z][A-Z_]{4,}\b/)?.[0] || 'FISCAL_PREPARATION_FAILED';
        return outboundFailure(
          reason === 'IDEMPOTENCY_KEY_REUSED' || reason === 'ALREADY_ACTIVE_FISCAL_ATTEMPT'
            ? 409
            : 503,
          reason,
          'A preparação fiscal não foi concluída. Atualize os dados ou consulte a tentativa original.',
          { numberReserved: false, sefazContacted: false }
        );
      }
      preparationSubmitted = false;
      return reconcileNormalSale(
        db,
        saved.data.documentId,
        true,
        command.productionConfirmed === true,
        saved.data.created ? token : undefined
      );
    }
    return outboundFailure(
      409,
      'FISCAL_SEQUENCE_BUSY',
      'A numeração mudou durante a preparação. Repita a mesma solicitação.',
      { numberReserved: false, sefazContacted: false }
    );
  } catch (error) {
    if (preparationSubmitted) {
      try {
        const recovery = await recoverNormalSale(db, command);
        if (recovery) return recovery;
      } catch {
        /* A transport error can hide a committed preparation. */
      }
      return outboundFailure(
        503,
        'FISCAL_PREPARATION_UNCONFIRMED',
        'A resposta da preparação não foi confirmada. Preserve esta intenção e consulte antes de repetir.',
        {
          pending: true,
          emissionRequestId: command.emissionRequestId,
          orderId: command.orderId,
          environment: command.environment,
          sefazContacted: false,
        }
      );
    }
    return outboundFailure(
      422,
      'FISCAL_PREPARATION_INVALID',
      error instanceof Error ? error.message : 'Preparação fiscal inválida.',
      { numberReserved: false, sefazContacted: false }
    );
  }
}
