export type InventorySubmissionContractVersion = 1 | 2;

export interface InventorySubmissionProtocolPayload {
  contractVersion: InventorySubmissionContractVersion;
  auditId: string;
  code: string;
  observation: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  responsibleName: string;
}

export const INVENTORY_FINALIZATION_RPC_TIMEOUT_MS = 30_000;
export const INVENTORY_FINALIZATION_RPC_TIMEOUT_ERROR =
  'A confirmação da finalização do inventário excedeu o tempo limite.';

export const getInventoryFinalizationRpcName = (
  contractVersion: InventorySubmissionContractVersion
): 'finalize_inventory_transaction' | 'finalize_inventory_transaction_v2' =>
  contractVersion === 2
    ? 'finalize_inventory_transaction_v2'
    : 'finalize_inventory_transaction';

export const buildInventorySubmissionRpcParams = (
  submission: InventorySubmissionProtocolPayload
) => ({
  p_audit_id: submission.auditId,
  p_code: submission.code,
  p_observation: submission.observation,
  p_items: submission.items,
  p_responsible_name: submission.responsibleName,
});

export const buildInventorySubmissionClaimRpcParams = (
  submission: InventorySubmissionProtocolPayload
) => ({
  p_contract_version: submission.contractVersion,
  ...buildInventorySubmissionRpcParams(submission),
});

export const isInventorySubmissionClaimAcknowledged = (
  result: unknown,
  expectedAuditId: string
): result is {
  auditId: string;
  status: 'claimed' | 'already_claimed' | 'already_processed';
  markerMoveId?: string | null;
} => {
  if (!result || typeof result !== 'object') return false;
  const acknowledgement = result as Record<string, unknown>;
  return (
    acknowledgement.auditId === expectedAuditId &&
    (acknowledgement.status === 'claimed' ||
      acknowledgement.status === 'already_claimed' ||
      acknowledgement.status === 'already_processed')
  );
};
