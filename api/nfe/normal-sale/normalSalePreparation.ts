import { createHash, randomUUID } from 'node:crypto';
import { generateNfeAccessKey } from '../../../erp/src/pages/utils/nfe/nfeAccessKey';
import { assertXmlFiscalSelections } from '../fiscalSelectionIntegrity';
import type {
  FiscalEmissionCommand,
  FiscalSnapshot,
  FiscalSnapshotCandidate,
} from '../fiscalSnapshot';
import {
  assertSignedFiscalXmlMatchesSnapshot,
  fiscalPreviewFingerprint,
} from '../fiscalXmlAudit';
import { serializeFiscalDocument } from '../fiscalXmlSerializer';
import { extractCertificateAndKey, signNfeXml } from '../nfeSigner';
import { fiscalAttemptCommand } from './attemptPolicy';
import {
  type OutboundDatabase,
  type OutboundResult,
  outboundFailure,
  describeActiveNormalSaleConflict,
  reconcileNormalSale,
} from './outboundAttempt';
import { readOutboundAttemptStatus } from './outboundStatus';
import { withNfeEmissionStage } from '../nfeEmissionPerformance';
import { appendResponsibleTechnician } from '../responsibleTechnician';
import { validateNfeAgainstOfficialSchema, validateUnsignedNfeStructure } from '../schemaValidator';
import { withTimeout } from '../../../shared-utils/withTimeout';

export const OUTBOUND_PREPARATION_TIMEOUT_MS = 20_000;

export interface CasPreparationContext {
  db: OutboundDatabase;
  command: FiscalEmissionCommand;
  facts: FiscalSnapshotCandidate;
  resolved: any;
  rules: any;
  model: '55' | '65';
  sequence: { series: string; minimumNumber: number };
  minimum: number;
  tech: any;
  certificate: ReturnType<typeof extractCertificateAndKey>;
  issuedAt: string;
  randomCode: string;
  actorId: string;
}

function recordPreparationRpcFailure(
  emissionRequestId: string,
  error: unknown
): { diagnosticId: string; diagnosticStage: string; databaseCode?: string } {
  const diagnosticId = randomUUID();
  const candidate = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const rawCode = typeof candidate.code === 'string' ? candidate.code : undefined;
  const databaseCode = rawCode && /^[A-Za-z0-9_.-]{1,48}$/.test(rawCode) ? rawCode : undefined;
  const errorType =
    typeof candidate.name === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(candidate.name)
      ? candidate.name
      : undefined;
  const httpStatus =
    Number.isInteger(candidate.status) && Number(candidate.status) >= 100 && Number(candidate.status) <= 599
      ? Number(candidate.status)
      : undefined;

  console.error('[NF-e preparation] prepare-attempt RPC was not confirmed', {
    diagnosticId,
    diagnosticStage: 'prepare-attempt-rpc',
    emissionRequestId,
    ...(databaseCode ? { databaseCode } : {}),
    ...(errorType ? { errorType } : {}),
    ...(httpStatus ? { httpStatus } : {}),
  });

  return {
    diagnosticId,
    diagnosticStage: 'prepare-attempt-rpc',
    ...(databaseCode ? { databaseCode } : {}),
  };
}

async function resolvePreparationRpcFailure(
  db: OutboundDatabase,
  command: FiscalEmissionCommand,
  error: unknown,
  confirmedFailure?: OutboundResult
): Promise<OutboundResult> {
  const diagnostic = recordPreparationRpcFailure(command.emissionRequestId, error);
  let status: Awaited<ReturnType<typeof readOutboundAttemptStatus>>;
  try {
    status = await readOutboundAttemptStatus(
      db,
      command.orderId,
      command.environment,
      command.emissionRequestId,
      diagnostic.diagnosticId
    );
  } catch {
    status = { kind: 'unavailable', diagnosticId: diagnostic.diagnosticId };
  }

  const identity = {
    emissionRequestId: command.emissionRequestId,
    orderId: command.orderId,
    environment: command.environment,
    ...diagnostic,
  };

  if (
    status.kind === 'not_found' &&
    (diagnostic.databaseCode === '55P03' || confirmedFailure?.body.code === 'FISCAL_PREPARATION_BUSY')
  )
    return outboundFailure(
      409,
      'FISCAL_PREPARATION_BUSY',
      'Outra preparação fiscal está usando este pedido ou esta tentativa. Consulte a mesma tentativa antes de continuar.',
      { ...identity, pending: true, sefazContacted: false }
    );

  if (status.kind === 'not_found' && confirmedFailure)
    return {
      status: confirmedFailure.status,
      body: {
        ...confirmedFailure.body,
        ...identity,
        pending: false,
        numberReserved: false,
        sefazContacted: false,
      },
    };

  if (status.kind === 'not_found')
    return outboundFailure(
      503,
      'FISCAL_PREPARATION_UNCONFIRMED',
      'A resposta da preparação não foi confirmada e ainda não há registro durável visível. Preserve o identificador e consulte a mesma tentativa antes de continuar.',
      {
        ...identity,
        pending: true,
        sefazContacted: false,
      }
    );

  if (status.kind === 'unavailable')
    return outboundFailure(
      503,
      'FISCAL_RECOVERY_UNAVAILABLE',
      'A gravação não foi confirmada e a consulta local da mesma tentativa também falhou. Preserve o identificador e consulte novamente.',
      { ...identity, pending: true, sefazContacted: false }
    );

  if (status.kind === 'inconsistent')
    return outboundFailure(
      503,
      'FISCAL_ATTEMPT_STATUS_INCONSISTENT',
      'A consulta encontrou registros locais incompletos para esta tentativa. Preserve-a para conferência antes de continuar.',
      {
        ...identity,
        ...(status.documentId ? { documentId: status.documentId } : {}),
        pending: true,
        numberReserved: status.numberReserved,
      }
    );

  const { attempt, document } = status;
  const metadata = {
    ...identity,
    documentId: attempt.document_id,
    model: attempt.model,
    series: attempt.series,
    nfeNumber: attempt.number,
    state: attempt.state,
    numberReserved: true,
    sefazContacted: attempt.transmission_started_at ? undefined : false,
  };

  if (
    attempt.state === 'authorized' &&
    ['autorizada', 'homologada'].includes(document.status) &&
    document.numero_protocolo
  )
    return {
      status: 200,
      body: {
        success: true,
        ...metadata,
        pending: false,
        protocolNumber: document.numero_protocolo || undefined,
      },
    };

  if (attempt.state === 'rejected' && document.status === 'erro')
    return outboundFailure(422, 'FISCAL_SEFAZ_REJECTED', 'A tentativa original está registrada como rejeitada.', {
      ...metadata,
      pending: false,
    });

  if (attempt.state === 'confirmed_not_found' && document.status === 'erro')
    return outboundFailure(
      409,
      'FISCAL_CONFIRMED_NOT_FOUND',
      'A tentativa original foi consultada e consta como não encontrada na SEFAZ.',
      { ...metadata, pending: false }
    );

  if (['authorized', 'rejected', 'confirmed_not_found'].includes(attempt.state))
    return outboundFailure(
      503,
      'FISCAL_ATTEMPT_STATUS_INCONSISTENT',
      'O estado local do documento diverge da tentativa. Preserve-a para conferência fiscal.',
      { ...metadata, pending: true }
    );

  if (attempt.state === 'prepared' && !attempt.transmission_started_at)
    return outboundFailure(
      503,
      'FISCAL_PREPARATION_UNCONFIRMED',
      'A tentativa foi gravada e reservou o número; a transmissão ainda não começou. Retome somente esta tentativa.',
      {
        ...metadata,
        pending: true,
        databaseReason: 'PREPARED_ATTEMPT_FOUND',
      }
    );

  return outboundFailure(
    502,
    'FISCAL_TRANSMISSION_UNCERTAIN',
    'A tentativa persistida já iniciou o fluxo de transmissão. Consulte o estado da mesma nota antes de continuar.',
    { ...metadata, pending: true, state: 'unknown' }
  );
}

export async function executeCasPreparationLoop(
  ctx: CasPreparationContext
): Promise<{ result: OutboundResult } | { sequenceChanged: boolean }> {
  const {
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
  } = ctx;

  for (let preparation = 0; preparation < 3; preparation++) {
    const peek = await withNfeEmissionStage(
      'number_peek_rpc',
      () =>
        db.rpc('peek_nfe_outbound_number', {
          p_issuer_cnpj: resolved.document.issuer.cnpj,
          p_model: model,
          p_environment: command.environment,
          p_series: sequence.series,
          p_minimum: minimum,
        }),
      { emissionRequestId: command.emissionRequestId }
    );

    if (peek.error || !Number.isInteger(peek.data))
      return {
        result: outboundFailure(
          503,
          'FISCAL_SEQUENCE_UNAVAILABLE',
          'Não foi possível consultar a próxima numeração fiscal.',
          { numberReserved: false, sefazContacted: false }
        ),
      };

    const number = peek.data as number;
    if (command.requestedNumber !== undefined && number !== command.requestedNumber)
      return {
        result: outboundFailure(
          409,
          'NFE_NUMBER_ALREADY_USED',
          'A numeração solicitada já está reservada ou foi utilizada.',
          {
            numberReserved: false,
            sefazContacted: false,
            numberConflict: { requestedNumber: command.requestedNumber, nextNumber: number },
            nfeNumber: command.requestedNumber,
          }
        ),
      };

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
      resolvedDocument: resolved.document,
      emissionRequest: {
        ...facts.emissionRequest,
        requestedModel: model,
        series: sequence.series,
        number,
      },
    };

    let xml = await withNfeEmissionStage(
      'xml_serialization',
      () =>
        serializeFiscalDocument(facts, resolved.document, rules, {
          accessKey,
          series: Number(sequence.series),
          number,
          issuedAt,
        }),
      { emissionRequestId: command.emissionRequestId }
    );

    xml = appendResponsibleTechnician(xml, accessKey, tech);
    await withNfeEmissionStage(
      'xml_unsigned_validation',
      () => validateUnsignedNfeStructure(xml),
      { emissionRequestId: command.emissionRequestId }
    );

    const signedXml = await withNfeEmissionStage(
      'xml_signing',
      () => signNfeXml(xml, certificate.privateKeyPem, certificate.certDerBase64),
      { emissionRequestId: command.emissionRequestId }
    );

    if (command.previewOnly) {
      await withNfeEmissionStage(
        'xml_schema_validation',
        () => validateNfeAgainstOfficialSchema(signedXml),
        { emissionRequestId: command.emissionRequestId }
      );
    }

    await assertXmlFiscalSelections(snapshot, signedXml);
    const identity = { series: sequence.series, number, accessKey };
    assertSignedFiscalXmlMatchesSnapshot(
      snapshot,
      resolved.document,
      signedXml,
      { ...identity, issuedAt },
      certificate.certPem
    );

    const previewFingerprint = fiscalPreviewFingerprint(
      snapshot,
      resolved.document,
      { ...identity, issuedAt },
      signedXml
    );

    if (command.previewOnly)
      return {
        result: {
          status: 200,
          body: {
            success: true,
            preview: true,
            previewStatus: 'PREVIEW_ONLY_NOT_AUTHORIZED',
            signedXml,
            previewProof: {
              fingerprint: previewFingerprint,
              capturedAt: facts.capturedAt,
              issuedAt,
              model,
              series: sequence.series,
              number,
              accessKey,
            },
            orderId: command.orderId,
            emissionRequestId: command.emissionRequestId,
            model,
            series: sequence.series,
            nfeNumber: number,
            accessKey,
            environment: command.environment,
            numberReserved: false,
            sefazContacted: false,
          },
        },
      };

    const token = randomUUID();
    let saved;
    try {
      saved = await withNfeEmissionStage(
        'prepare_attempt_rpc',
        async () => {
          const response = await withTimeout(
            db.rpc('prepare_nfe_outbound_attempt', {
              p_snapshot: { ...snapshot, decisionTrace: resolved.document.decisions },
              p_signed_xml: signedXml,
              p_access_key: accessKey,
              p_request_command: fiscalAttemptCommand(command),
              p_attempt_token: token,
              p_actor_id: actorId,
              p_minimum_number: minimum,
            }),
            OUTBOUND_PREPARATION_TIMEOUT_MS,
            null,
            'nfe:prepare-attempt-rpc'
          );
          if (response === null)
            throw Object.assign(new Error('FISCAL_PREPARATION_TIMEOUT'), {
              code: 'FISCAL_PREPARATION_TIMEOUT',
            });
          return response;
        },
        { emissionRequestId: command.emissionRequestId }
      );
    } catch (error) {
      return { result: await resolvePreparationRpcFailure(db, command, error) };
    }

    if (
      saved.error?.message.includes('FISCAL_SEQUENCE_CHANGED') &&
      command.requestedNumber === undefined
    ) {
      continue;
    }

    if (saved.error || !saved.data?.documentId) {
      if (saved.error) {
        const reason =
          saved.error.message.match(/\b[A-Z][A-Z_]{4,}\b/)?.[0] || 'FISCAL_PREPARATION_FAILED';
        if (reason === 'ALREADY_ACTIVE_FISCAL_ATTEMPT') {
          const conflict = await describeActiveNormalSaleConflict(
            db,
            command,
            resolved.document.issuer.cnpj
          );
          return { result: conflict };
        }

        return {
          result: await resolvePreparationRpcFailure(
            db,
            command,
            saved.error,
            reason === 'FISCAL_PREPARATION_FAILED'
              ? undefined
              : outboundFailure(
                  ['IDEMPOTENCY_KEY_REUSED', 'FISCAL_SOURCE_CHANGED'].includes(reason) ? 409 : 503,
                  reason,
                  reason === 'FISCAL_SOURCE_CHANGED'
                    ? 'Os dados do pedido, produtos ou cliente foram alterados durante a preparação. Atualize os dados fiscais e tente novamente.'
                    : 'A preparação fiscal foi recusada. Consulte o código técnico antes de corrigir os dados.',
                  { pending: false }
                )
          ),
        };
      }

      return {
        result: await resolvePreparationRpcFailure(
          db,
          command,
          new Error('MissingPreparedDocumentId')
        ),
      };
    }

    const reconciled = await reconcileNormalSale(
      db,
      saved.data.documentId,
      true,
      command.productionConfirmed === true,
      saved.data.created ? token : undefined,
      certificate
    );

    return { result: reconciled };
  }

  return { sequenceChanged: true };
}
