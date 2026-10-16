export interface OrderUpdateOptions {
  /** Persist metadata without resolving customer snapshots, CRM sync, or order alerts. */
  metadataOnly?: boolean;
  /** Physical return confirmation stays bound to the operator's current intent. */
  returnFulfillment?: { isCurrent: () => boolean };
  /** Cancellation of a scheduled commercial return, with no physical receipt. */
  returnCancellation?: { isCurrent: () => boolean };
}
