import { createHash } from 'node:crypto';
import { resolveNfeSequenceSettings } from '../../../erp/src/pages/utils/nfe/nfeSequenceSettings';
import type {
  FiscalEmissionCommand,
  FiscalSnapshotCandidate,
  ResolvedFiscalDocument,
} from '../fiscalSnapshot';
import { resolveFiscalDocument } from '../fiscalSnapshot';
import { extractCertificateAndKey, type CertificateAndKey } from '../nfeSigner';
import { saoPauloEmissionTimestamp } from './attemptPolicy';
import {
  type OutboundDatabase,
  type OutboundResult,
  outboundFailure,
  productionTransmissionGate,
  recoverNormalSale,
} from './outboundAttempt';
import { withNfeEmissionStage } from '../nfeEmissionPerformance';
import { obj } from './values';
import { createNormalSaleRuleSet, loadNormalSaleInputs, type NormalSaleRuleSet } from '../normalSaleRuleSet';
import { validateParanaIssuerIe } from '../paranaIssuerIe';
import {
  getResponsibleTechnicianConfig,
  getResponsibleTechnicianConfigurationIssues,
  type ResponsibleTechnicianConfig,
} from '../responsibleTechnician';
import { isSyntheticOrderBlockedInProduction } from './testOrderProductionGuard';

export async function validateNormalSalePreconditions(
  db: OutboundDatabase,
  command: FiscalEmissionCommand,
  candidate: FiscalSnapshotCandidate
): Promise<OutboundResult | null> {
  if (isSyntheticOrderBlockedInProduction(command.environment, candidate.order.data))
    return outboundFailure(
      403,
      'TEST_ORDER_PRODUCTION_BLOCKED',
      'Pedidos marcados como teste não podem ser emitidos em Produção.',
      { numberReserved: false, sefazContacted: false }
    );

  const recovered = command.previewOnly ? null : await recoverNormalSale(db, command);
  if (recovered) return recovered;

  const gate = command.previewOnly
    ? null
    : productionTransmissionGate(command.environment, command.productionConfirmed === true);
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

  return null;
}

export interface ResolvedSaleFactsOutcome {
  facts: FiscalSnapshotCandidate;
  rules: NormalSaleRuleSet;
  resolved: ResolvedFiscalDocument;
  model: '55' | '65';
}

export async function resolveNormalSaleFactsAndRules(
  db: OutboundDatabase,
  command: FiscalEmissionCommand,
  candidate: FiscalSnapshotCandidate,
  appSettings: Record<string, unknown>
): Promise<{ outcome: ResolvedSaleFactsOutcome } | { errorResult: OutboundResult }> {
  const facts = structuredClone(candidate);

  await withNfeEmissionStage(
    'inputs_fetch',
    () => loadNormalSaleInputs(db, facts, appSettings),
    { emissionRequestId: command.emissionRequestId }
  );

  let rules = await createNormalSaleRuleSet(facts);
  const preflight = resolveFiscalDocument(facts, rules);

  if (preflight.status !== 'ready') {
    console.error('[PREFLIGHT BLOCKERS]', JSON.stringify(preflight.blockers));
    return {
      errorResult: outboundFailure(
        422,
        'FISCAL_DETERMINATION_REQUIRED',
        'O pedido não passou pela determinação fiscal.',
        { blockers: preflight.blockers, numberReserved: false, sefazContacted: false }
      ),
    };
  }

  validateParanaIssuerIe(preflight.document.issuer.ie);
  const model = preflight.document.model;
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

  return {
    outcome: {
      facts,
      rules,
      resolved,
      model,
    },
  };
}

export interface ResolvedSaleCredentialsOutcome {
  sequence: ReturnType<typeof resolveNfeSequenceSettings>;
  minimum: number;
  tech: ResponsibleTechnicianConfig;
  certificate: CertificateAndKey;
  issuedAt: string;
  randomCode: string;
}

export async function resolveNormalSaleCredentials(
  command: FiscalEmissionCommand,
  model: '55' | '65',
  facts: FiscalSnapshotCandidate,
  appSettings: Record<string, unknown>
): Promise<{ outcome: ResolvedSaleCredentialsOutcome } | { errorResult: OutboundResult }> {
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
    return {
      errorResult: outboundFailure(
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
      ),
    };

  const certificate = await withNfeEmissionStage(
    'cert_extract',
    () => extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || ''),
    { emissionRequestId: command.emissionRequestId }
  );

  const issuedAt = saoPauloEmissionTimestamp(facts.capturedAt);
  const code = createHash('sha256').update(command.emissionRequestId).digest('hex');
  const randomCode = String(Number.parseInt(code.slice(0, 10), 16) % 100000000).padStart(8, '0');

  return {
    outcome: {
      sequence,
      minimum,
      tech,
      certificate,
      issuedAt,
      randomCode,
    },
  };
}
