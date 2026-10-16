export interface OrderUpdateOptions {
  /** Persist metadata without resolving customer snapshots, CRM sync, or order alerts. */
  metadataOnly?: boolean;
  /** Physical return confirmation stays bound to the operator's current intent. */
  returnFulfillment?: { isCurrent: () => boolean };
}
