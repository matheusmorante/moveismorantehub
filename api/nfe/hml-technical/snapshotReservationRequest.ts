import { normalizeRecipientTaxId } from '../../../shared-utils/recipientTaxId';
import type { FiscalDocument, FiscalEmissionCommand } from '../fiscalSnapshot';

type HmlSnapshotReservationRpcName =
  | 'prepare_nfe_fiscal_snapshot'
  | 'prepare_nfe_fiscal_snapshot_with_context'
  | 'prepare_numbered_nfe_fiscal_snapshot'
  | 'prepare_numbered_nfe_fiscal_snapshot_with_context';

export function buildHmlSnapshotReservationRequest(
  command: FiscalEmissionCommand,
  document: FiscalDocument,
  technicalFixture: boolean,
  sequence: { series: string; minimumNumber: number },
  effectiveRecipientTaxId: string
) {
  const snapshotRpcName: HmlSnapshotReservationRpcName =
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
    p_modelo: document.model,
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
            (document.modelDecision?.status === 'ready' &&
              document.modelDecision.finalConsumer),
          p_delivery_by_issuer: command.deliveryByIssuer ?? false,
          p_card_not_integrated: command.cardNotIntegrated ?? false,
          p_model_decision: document.modelDecision,
        }),
    ...(command.requestedNumber === undefined
      ? {}
      : { p_requested_number: command.requestedNumber }),
  };

  return { snapshotRpcName, snapshotArgs };
}
