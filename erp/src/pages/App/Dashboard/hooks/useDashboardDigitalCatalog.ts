import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';

export interface DashboardDigitalCatalogMetrics {
  products: number;
  published: number;
  draft: number;
  categories: number;
  views: number;
  uniqueVisitors: number;
  catalogVisits30Days: number;
  uniqueVisitors30Days: number;
  productViews30Days: number;
  productClicks30Days: number;
  daily: Array<{
    date: string;
    catalogVisits: number;
    productViews: number;
    productClicks: number;
  }>;
  topViewedProducts: Array<{ id: string; name: string; slug: string; count: number }>;
  topClickedProducts: Array<{ id: string; name: string; slug: string; count: number }>;
  /** Mantido por compatibilidade; o painel não apresenta esta estimativa como conversão real. */
  conversionRate: number;
}

export const FIXED_CATALOG_CONVERSION_ESTIMATE = 3.5;

export function useDashboardDigitalCatalog() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? '';
  const roleScope = [profile?.role ?? '', ...(profile?.roles ?? [])].sort().join(',');

  return useQuery({
    queryKey: ['dashboard-digital-catalog', userId, roleScope],
    enabled: Boolean(userId && profile?.id === userId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DashboardDigitalCatalogMetrics> => {
      const { data, error } = await supabase.rpc('get_dashboard_digital_catalog_metrics');
      if (error) throw error;
      if (!data || typeof data !== 'object') throw new Error('Resposta inválida das métricas do catálogo.');
      const result = data as Record<string, unknown>;
      const parseProducts = (value: unknown) => Array.isArray(value)
        ? value.flatMap((entry) => {
            if (!entry || typeof entry !== 'object') return [];
            const product = entry as Record<string, unknown>;
            if (typeof product.id !== 'string' || typeof product.name !== 'string') return [];
            return [{
              id: product.id,
              name: product.name,
              slug: typeof product.slug === 'string' ? product.slug : '',
              count: Number(product.count ?? 0),
            }];
          })
        : [];

      return {
        products: Number(result.products ?? 0),
        published: Number(result.published ?? 0),
        draft: Number(result.draft ?? 0),
        categories: Number(result.categories ?? 0),
        views: Number(result.views ?? 0),
        uniqueVisitors: Number(result.uniqueVisitors ?? 0),
        catalogVisits30Days: Number(result.catalogVisits30Days ?? 0),
        uniqueVisitors30Days: Number(result.uniqueVisitors30Days ?? 0),
        productViews30Days: Number(result.productViews30Days ?? 0),
        productClicks30Days: Number(result.productClicks30Days ?? 0),
        daily: Array.isArray(result.daily)
          ? result.daily.flatMap((entry) => {
              if (!entry || typeof entry !== 'object') return [];
              const day = entry as Record<string, unknown>;
              if (typeof day.date !== 'string') return [];
              return [{
                date: day.date,
                catalogVisits: Number(day.catalogVisits ?? 0),
                productViews: Number(day.productViews ?? 0),
                productClicks: Number(day.productClicks ?? 0),
              }];
            })
          : [],
        topViewedProducts: parseProducts(result.topViewedProducts),
        topClickedProducts: parseProducts(result.topClickedProducts),
        conversionRate: FIXED_CATALOG_CONVERSION_ESTIMATE,
      };
    },
  });
}
