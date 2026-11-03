import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import { isTestProduct } from '../../../utils/hmlTestData';

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

const PAGE_SIZE = 1000;
const VARIATION_BATCH_SIZE = 100;

async function fetchDashboardStock(): Promise<DashboardStockSnapshot> {
  const productRows: any[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('products')
      .select('id, description, stock, min_stock, has_variations, active, deleted_at, observations, item_type')
      .is('deleted_at', null)
      .eq('active', true)
      .or('item_type.eq.product,item_type.is.null')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    productRows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const products = productRows.filter((product) => !isTestProduct(product));
  const productIds = products.filter((product) => product.has_variations).map((product) => product.id);
  const variationRows: any[] = [];
  for (let start = 0; start < productIds.length; start += VARIATION_BATCH_SIZE) {
    const batchIds = productIds.slice(start, start + VARIATION_BATCH_SIZE);
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('product_variations')
        .select('id, product_id, name, sku, stock, active')
        .in('product_id', batchIds)
        .eq('active', true)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      variationRows.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
    }
  }

  const { data: moveRows, error: movesError } = await supabase
    .from('inventory_moves')
    .select('date, observation')
    .order('date', { ascending: false })
    .limit(30);
  if (movesError) throw movesError;

  const variationsByProductId = new Map<string, any[]>();
  for (const variation of variationRows) {
    const values = variationsByProductId.get(String(variation.product_id)) ?? [];
    values.push(variation);
    variationsByProductId.set(String(variation.product_id), values);
  }

  const items: LowStockItem[] = [];
  for (const product of products) {
    const variations = variationsByProductId.get(String(product.id));
    if (product.has_variations && variations?.length) {
      for (const variation of variations) {
        const stock = Number(variation.stock ?? 0);
        const minStock = Number(product.min_stock ?? 0);
        if (stock === 0 || (minStock > 0 && stock <= minStock)) {
          items.push({
            productId: String(product.id),
            variationId: String(variation.id),
            name: `${product.description} — ${variation.name || variation.sku}`,
            stock,
            minStock,
            isZero: stock === 0,
          });
        }
      }
    } else {
      const stock = Number(product.stock ?? 0);
      const minStock = Number(product.min_stock ?? 0);
      if (stock === 0 || (minStock > 0 && stock <= minStock)) {
        items.push({
          productId: String(product.id),
          name: product.description,
          stock,
          minStock,
          isZero: stock === 0,
        });
      }
    }
  }
  items.sort((a, b) => (a.isZero === b.isZero ? a.stock - b.stock : a.isZero ? -1 : 1));

  let pendingInventory: DashboardStockSnapshot['pendingInventory'] = null;
  for (const move of moveRows ?? []) {
    let observation: any;
    try {
      observation = JSON.parse(move.observation || '{}');
    } catch {
      continue;
    }
    if (observation.inventoryAudit !== true || observation.status !== 'in_progress') continue;
    pendingInventory = {
      code: observation.inventoryCode || '—',
      date: move.date || '',
      responsibleName: observation.responsibleName,
    };
    break;
  }

  return {
    zeroStockCount: items.filter((item) => item.isZero).length,
    lowStockCount: items.filter((item) => !item.isZero).length,
    lowStockItems: items.slice(0, 8),
    pendingInventory,
  };
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
    queryFn: fetchDashboardStock,
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
