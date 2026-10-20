import type { FiscalEmissionCommand } from '../fiscalSnapshot';
import {
  type Attempt,
  type Document,
  type OutboundDatabase,
  type OutboundResult,
  metadata,
  outboundFailure,
} from './outboundTypes';
import { loadOutboundAttempt, persistResultToDatabase } from './outboundPersistence';
import {
  describeActiveNormalSaleConflict,
  productionTransmissionGate,
  recoverNormalSale as recoverNormalSaleBase,
} from './outboundRecovery';
import { transmitPreparedOutbound } from './outboundTransmission';
import { finalResult, reconcileNormalSale } from './outboundReconciliation';

export {
  outboundFailure,
  describeActiveNormalSaleConflict,
  productionTransmissionGate,
  loadOutboundAttempt,
  transmitPreparedOutbound,
  reconcileNormalSale,
};

export type { OutboundDatabase, OutboundResult, Attempt, Document };

export async function recoverNormalSale(
  db: OutboundDatabase,
  command: FiscalEmissionCommand
): Promise<OutboundResult | null> {
  return recoverNormalSaleBase(db, command, reconcileNormalSale);
}
