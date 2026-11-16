import type { SyncEvent } from './offlineTypes';

export const eventPatch = (event: SyncEvent): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    ...(event.payload as Record<string, unknown>),
    lastSyncEventId: event.eventId,
  };
  // Independent delivery operations have their own server-side revision and patch.
  // Never convert them into the legacy whole-order delivery patch.
  if (typeof (event.payload as any)?.operationId === 'string') return base;
  if (event.type === 'DELIVERY_START_PREPARATION')
    return {
      ...base,
      deliveryPreparationStartedAt:
        (event.payload as any)?.deliveryPreparationStartedAt ?? event.occurredAt,
    };
  if (event.type === 'DELIVERY_START_ROUTE')
    return {
      ...base,
      deliveryStatus: 'in_progress',
      deliveryStartedAt: event.occurredAt,
      deliveryPreparationStartedAt: null,
      deliveryResponsibles:
        (event.payload as any)?.deliveryResponsibles ?? base.deliveryResponsibles,
      deliveryResponsibleName:
        (event.payload as any)?.deliveryResponsibleName ?? base.deliveryResponsibleName,
      deliveryResponsibleId:
        (event.payload as any)?.deliveryResponsibleId ?? base.deliveryResponsibleId,
    };
  if (event.type === 'DELIVERY_ARRIVE_DESTINATION')
    return {
      ...base,
      deliveryStatus: (event.payload as any)?.deliveryStatus ?? 'arrived',
      deliveryArrivedAt: (event.payload as any)?.deliveryArrivedAt ?? event.occurredAt,
    };
  if (event.type === 'DELIVERY_START_SERVICE')
    return {
      ...base,
      deliveryStatus: 'in_service',
      deliveryServiceStartedAt:
        (event.payload as any)?.deliveryServiceStartedAt ?? event.occurredAt,
    };
  if (event.type === 'DELIVERY_FINISH')
    return {
      ...base,
      deliveryStatus: 'completed',
      deliveryFinishedAt: event.occurredAt,
      status: 'fulfilled',
    };
  if (event.type === 'DELIVERY_UNATTENDED')
    return { ...base, deliveryStatus: 'unattended', unattendedAt: event.occurredAt };
  if (event.type === 'DELIVERY_STEP_BACK') {
    const payloadObj = (event.payload as Record<string, unknown>) || {};
    return {
      ...base,
      deliveryStatus: payloadObj.deliveryStatus ?? null,
      deliveryStartedAt: payloadObj.deliveryStartedAt ?? null,
      deliveryArrivedAt: payloadObj.deliveryArrivedAt ?? null,
      deliveryServiceStartedAt: payloadObj.deliveryServiceStartedAt ?? null,
    };
  }
  if (event.type === 'DELIVERY_CANCEL') {
    return {
      ...base,
      status: 'scheduled',
      deliveryStatus: null,
      deliveryStartedAt: null,
      deliveryArrivedAt: null,
      deliveryServiceStartedAt: null,
      deliveryFinishedAt: null,
      deliveryPreparationStartedAt: null,
      deliveryChecklist: null,
      unattendedAt: null,
      unattendedReason: null,
      unattendedNotes: null,
      unattendedProofUrl: null,
      unattendedProofUrls: null,
    };
  }
  return base;
};
