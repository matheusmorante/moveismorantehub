import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import Order from '../../../types/order.type';
import { dashboardRevenueFactor } from '../dashboardRevenue';

export interface ProductStat {
  productId: string;
  variationId?: string;
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
  margin: number;
  lastSoldAt?: string | null;
}

export type StalledPeriod = 30 | 60 | 90;

export interface ProductsData {
  topByQuantity: ProductStat[];
  topByRevenue: ProductStat[];
  topByProfit: ProductStat[];
  stalled: ProductStat[];
  stalledPeriod: StalledPeriod;
  setStalledPeriod: (p: StalledPeriod) => void;
  stalledLoading: boolean;
  stalledError: boolean;
  retryStalled: () => Promise<unknown>;
}

export const useDashboardProducts = (filteredOrders: Order[]): ProductsData => {
  const [stalledPeriod, setStalledPeriod] = useState<StalledPeriod>(60);
  const { user, profile } = useAuth();
  const userId = user?.id ?? '';
  const roleScope = [profile?.role ?? '', ...(profile?.roles ?? [])].sort().join(',');
  const stalledQuery = useQuery({
    queryKey: ['dashboard-stalled-products', userId, roleScope, stalledPeriod],
    enabled: Boolean(userId && profile?.id === userId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProductStat[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_stalled_products', { p_days: stalledPeriod });
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error('Resposta inválida dos produtos sem venda.');
      return data.map((row: any) => ({
        productId: String(row.product_id),
        variationId: row.variation_id ? String(row.variation_id) : undefined,
        name: String(row.product_name || 'Produto'),
        quantity: 0,
        revenue: 0,
        profit: 0,
        margin: 0,
        lastSoldAt: row.last_sold_at ?? null,
      }));
    },
  });

  const productMap = useMemo(() => {
    const map = new Map<string, ProductStat>();

    for (const order of filteredOrders) {
      const factor = dashboardRevenueFactor(order);
      if (factor === 0) continue;
      for (const item of order.items || []) {
        if (!item.productId || item.isTemporaryProduct) continue;
        const key = item.variationId ? item.variationId : item.productId;
        const existing = map.get(key) || {
          productId: item.productId,
          variationId: item.variationId,
          name: item.description,
          quantity: 0,
          revenue: 0,
          profit: 0,
          margin: 0,
        };
        const revenue = (item.unitPrice - item.unitDiscount) * item.quantity;
        const unitCost = item.unitCost ?? item.costPrice ?? 0;
        const cost = unitCost * item.quantity;
        existing.quantity += factor * item.quantity;
        existing.revenue += factor * revenue;
        existing.profit += factor * (revenue - cost);
        map.set(key, existing);
      }
    }

    const result = Array.from(map.values()).map((p) => ({
      ...p,
      margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
    }));
    return result;
  }, [filteredOrders]);

  const top5 = (arr: ProductStat[], key: 'quantity' | 'revenue' | 'profit'): ProductStat[] =>
    [...arr].sort((a, b) => b[key] - a[key]).slice(0, 5);

  return {
    topByQuantity: top5(productMap, 'quantity'),
    topByRevenue: top5(productMap, 'revenue'),
    topByProfit: top5(productMap, 'profit'),
    stalled: stalledQuery.data ?? [],
    stalledPeriod,
    setStalledPeriod,
    stalledLoading: stalledQuery.isLoading,
    stalledError: stalledQuery.isError,
    retryStalled: () => stalledQuery.refetch(),
  };
};
