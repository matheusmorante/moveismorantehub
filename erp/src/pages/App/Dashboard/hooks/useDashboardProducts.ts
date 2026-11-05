import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { DashboardMetrics } from '../dashboardMetrics';

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

export const useDashboardProducts = (rankings: DashboardMetrics['products']): ProductsData => {
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

  return {
    ...rankings,
    stalled: stalledQuery.data ?? [],
    stalledPeriod,
    setStalledPeriod,
    stalledLoading: stalledQuery.isLoading,
    stalledError: stalledQuery.isError,
    retryStalled: () => stalledQuery.refetch(),
  };
};
