import type { FiscalEmissionCommand } from '../fiscalSnapshot';
import {
  canonicalFiscalCommand,
  fiscalAttemptCommand,
} from './attemptPolicy';
import {
  type Attempt,
  type OutboundDatabase,
  type OutboundResult,
  metadata,
  outboundFailure,
} from './outboundTypes';
import { loadOutboundAttempt } from './outboundPersistence';

export function productionTransmissionGate(
  environment: 1 | 2,
  confirmed: boolean
): OutboundResult | null {
  if (environment === 1 && !confirmed)
    return outboundFailure(
      403,
      'PRODUCTION_CONFIRMATION_REQUIRED',
      'Confirme explicitamente a emissão em Produção.'
    );
  return null;
}

/** A losing request reports the existing intent; this lookup never reserves or transmits. */
export async function describeActiveNormalSaleConflict(
  db: OutboundDatabase,
  command: Pick<FiscalEmissionCommand, 'orderId' | 'environment'>,
  issuerCnpj: string
): Promise<OutboundResult> {
  const active = await db
    .from('nfe_outbound_attempts')
    .select('*')
    .eq('order_id', command.orderId)
    .eq('environment', command.environment)
    .eq('issuer_cnpj', issuerCnpj)
    .in('state', ['prepared', 'transmitting', 'reconciling', 'authorized']);

  if (active.error || active.data?.length !== 1)
    return outboundFailure(
      503,
      'FISCAL_RECOVERY_UNAVAILABLE',
      'Já existe uma tentativa fiscal para este pedido, mas não foi possível identificá-la com segurança. Atualize a consulta antes de continuar.',
      {
        pending: true,
        orderId: command.orderId,
        environment: command.environment,
        numberReserved: false,
        sefazContacted: false,
      }
    );

  const attempt = active.data[0];
  return outboundFailure(
    409,
    'ALREADY_ACTIVE_FISCAL_ATTEMPT',
    'Já existe uma tentativa fiscal em andamento para este pedido. Consulte a tentativa original antes de continuar.',
    {
      ...metadata(attempt),
      state: attempt.state,
      databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
      pending: true,
      numberReserved: false,
      sefazContacted: false,
    }
  );
}

export async function recoverNormalSale(
  db: OutboundDatabase,
  command: FiscalEmissionCommand,
  reconcileFn: (
    db: OutboundDatabase,
    documentId: string,
    allowTransmission?: boolean,
    productionConfirmed?: boolean
  ) => Promise<OutboundResult>
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

  if (!['authorized', 'rejected'].includes(prior.data.state)) {
    try {
      await loadOutboundAttempt(db, prior.data.document_id);
    } catch {
      return outboundFailure(
        503,
        'FISCAL_RECOVERY_UNAVAILABLE',
        'Não foi possível revalidar o XML da tentativa reservada.',
        { ...metadata(prior.data), sefazContacted: false }
      );
    }
  }

  return reconcileFn(
    db,
    prior.data.document_id,
    true,
    command.productionConfirmed === true
  );
}
