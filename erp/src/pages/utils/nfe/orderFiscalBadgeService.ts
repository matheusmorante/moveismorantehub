import { supabase } from '../supabaseConfig';
import type { OrderFiscalBadgeStatuses } from './orderFiscalBadgeRules';
import {
  type BadgeDocumentRow,
  type FiscalBadgeSupplement,
  type RelatedOrderRow,
  loadScopedBadgeSupplement,
  fetchBadgeSupplementFromApi,
  assembleOrderFiscalBadgeStatuses,
  getInFlightBadgeRequest,
  setInFlightBadgeRequest,
  clearInFlightBadgeRequest,
} from './orderFiscalBadge';

export type { BadgeDocumentRow, FiscalBadgeSupplement, RelatedOrderRow };
export { loadScopedBadgeSupplement };

export const fetchOrderFiscalBadgeStatuses = async (
  orderIds: readonly string[]
): Promise<Record<string, OrderFiscalBadgeStatuses>> => {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (uniqueOrderIds.length === 0) return {};

  const cacheKey = uniqueOrderIds.slice().sort().join(',');
  const existing = getInFlightBadgeRequest(cacheKey);
  if (existing) return existing;

  const requestPromise = (async () => {
    try {
      let supplement: FiscalBadgeSupplement = {};
      let documentRows: BadgeDocumentRow[] | null = null;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        const apiSupplement = await fetchBadgeSupplementFromApi(uniqueOrderIds, accessToken);
        if (apiSupplement) {
          supplement = apiSupplement;
          if (Array.isArray(supplement.documents)) {
            documentRows = supplement.documents;
          }
        }
      }

      if (!documentRows) {
        const direct = await loadScopedBadgeSupplement(uniqueOrderIds, true);
        supplement = { ...supplement, ...direct.supplement };
        documentRows = direct.documents;
      }

      if (!Array.isArray(supplement.cancelledOrderIds)) {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('id,status')
          .in('id', uniqueOrderIds);
        if (error) throw error;
        supplement = {
          ...supplement,
          cancelledOrderIds: (orders || [])
            .filter((order) =>
              ['cancelled', 'cancelado'].includes(String(order.status || '').toLowerCase())
            )
            .map((order) => String(order.id)),
        };
      }

      return assembleOrderFiscalBadgeStatuses(uniqueOrderIds, documentRows, supplement);
    } finally {
      clearInFlightBadgeRequest(cacheKey);
    }
  })();

  setInFlightBadgeRequest(cacheKey, requestPromise);
  return requestPromise;
};
