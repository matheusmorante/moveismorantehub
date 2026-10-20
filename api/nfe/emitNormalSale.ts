import type {
  FiscalEmissionCommand,
  FiscalSnapshotCandidate,
} from './fiscalSnapshot';
import { FiscalXmlAuditError } from './fiscalXmlAudit';
import {
  type OutboundDatabase,
  type OutboundResult,
  outboundFailure,
} from './normal-sale/outboundAttempt';
import { executeCasPreparationLoop } from './normal-sale/normalSalePreparation';
import {
  validateNormalSalePreconditions,
  resolveNormalSaleFactsAndRules,
  resolveNormalSaleCredentials,
} from './normal-sale/normalSaleContext';

/** One normal-sale pipeline for tpAmb 1/2. The database commits number, facts, signed XML and attempt together. */
export async function emitNormalSale(
  db: OutboundDatabase,
  command: FiscalEmissionCommand,
  candidate: FiscalSnapshotCandidate,
  appSettings: Record<string, unknown> = {},
  actorId = 'anonymous'
): Promise<OutboundResult> {
  const earlyPreconditionBlock = await validateNormalSalePreconditions(db, command, candidate);
  if (earlyPreconditionBlock) return earlyPreconditionBlock;

  try {
    const factsResult = await resolveNormalSaleFactsAndRules(db, command, candidate, appSettings);
    if ('errorResult' in factsResult) return factsResult.errorResult;
    const { facts, rules, resolved, model } = factsResult.outcome;

    const credsResult = await resolveNormalSaleCredentials(command, model, facts, appSettings);
    if ('errorResult' in credsResult) return credsResult.errorResult;
    const { sequence, minimum, tech, certificate, issuedAt, randomCode } = credsResult.outcome;

    const casOutcome = await executeCasPreparationLoop({
      db,
      command,
      facts,
      resolved,
      rules,
      model,
      sequence,
      minimum,
      tech,
      certificate,
      issuedAt,
      randomCode,
      actorId,
    });

    if ('result' in casOutcome) {
      return casOutcome.result;
    }

    return outboundFailure(
      409,
      'FISCAL_SEQUENCE_BUSY',
      'A numeração mudou durante a preparação. Repita a mesma solicitação.',
      { numberReserved: false, sefazContacted: false }
    );
  } catch (error) {
    return outboundFailure(
      422,
      'FISCAL_PREPARATION_INVALID',
      error instanceof Error ? error.message : 'Preparação fiscal inválida.',
      {
        numberReserved: false,
        sefazContacted: false,
        ...(error instanceof FiscalXmlAuditError
          ? {
              fiscalMismatchFields: error.mismatches.map(({ field, expected, actual }) => ({
                field,
                snapshotValue: String(expected),
                currentValue: String(actual),
              })),
            }
          : {}),
      }
    );
  }
}
