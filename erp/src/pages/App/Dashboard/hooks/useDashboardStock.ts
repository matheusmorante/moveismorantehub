import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import { z } from 'zod';
import { withAbortTimeout } from '../../../../../../shared-utils/withAbortTimeout';

export interface LowStockItem {
  productId: string;
  variationId?: string;
  name: string;
  stock: number;
  minStock: number;
  isZero: boolean;
}

interface DashboardStockSnapshot {
  zeroStockCount: number;
  lowStockCount: number;
  lowStockItems: LowStockItem[];
  pendingInventory: { code: string; date: string; responsibleName?: string } | null;
}

export interface StockData extends DashboardStockSnapshot {
  loading: boolean;
  error: boolean;
  retry: () => Promise<unknown>;
}

const stockSummarySchema = z.object({
  zeroStockCount: z.number().int().nonnegative(),
  lowStockCount: z.number().int().nonnegative(),
  lowStockItems: z.array(z.object({
    productId: z.string().min(1),
    variationId: z.string().min(1).optional(),
    name: z.string(),
    stock: z.number().finite(),
    minStock: z.number().finite(),
    isZero: z.boolean(),
  })).max(8),
  pendingInventory: z.object({
    code: z.string(), date: z.string(), responsibleName: z.string().optional(),
  }).nullable(),
});

async function fetchDashboardStock(signal?: AbortSignal): Promise<DashboardStockSnapshot> {
  const { data, error } = await withAbortTimeout(supabase.rpc('get_dashboard_stock_summary'),
    'dashboard:resumo-estoque', 15_000, signal);
  if (error) throw error;
  return stockSummarySchema.parse(data);
}

export const useDashboardStock = (): StockData => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';
  const roleScope = [profile?.role ?? '', ...(profile?.roles ?? [])].sort().join(',');
  const queryKey = useMemo(() => ['dashboard-stock', userId, roleScope] as const, [userId, roleScope]);
  const enabled = Boolean(userId && profile?.id === userId);
  const query = useQuery({
    queryKey,
    enabled,
    queryFn: ({ signal }) => fetchDashboardStock(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void queryClient.invalidateQueries({ queryKey }), 200);
    };
    const channel = supabase.channel('dashboard-stock-and-inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_moves' }, invalidate)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') invalidate();
      });
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, queryKey]);

  return {
    zeroStockCount: query.data?.zeroStockCount ?? 0,
    lowStockCount: query.data?.lowStockCount ?? 0,
    lowStockItems: query.data?.lowStockItems ?? [],
    pendingInventory: query.data?.pendingInventory ?? null,
    loading: !enabled || query.isLoading,
    error: query.isError,
    retry: () => query.refetch(),
  };
};
