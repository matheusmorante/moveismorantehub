import type { OrderFiscalBadgeStatuses } from '../orderFiscalBadgeRules';

export const inFlightBadgeRequests = new Map<
  string,
  Promise<Record<string, OrderFiscalBadgeStatuses>>
>();

export function getInFlightBadgeRequest(
  cacheKey: string
): Promise<Record<string, OrderFiscalBadgeStatuses>> | undefined {
  return inFlightBadgeRequests.get(cacheKey);
}

export function setInFlightBadgeRequest(
  cacheKey: string,
  promise: Promise<Record<string, OrderFiscalBadgeStatuses>>
): void {
  inFlightBadgeRequests.set(cacheKey, promise);
}

export function clearInFlightBadgeRequest(cacheKey: string): void {
  inFlightBadgeRequests.delete(cacheKey);
}
