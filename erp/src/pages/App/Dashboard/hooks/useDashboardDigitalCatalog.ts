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
      return {
        products: Number(result.products ?? 0),
        published: Number(result.published ?? 0),
        draft: Number(result.draft ?? 0),
        categories: Number(result.categories ?? 0),
        views: Number(result.views ?? 0),
        uniqueVisitors: Number(result.uniqueVisitors ?? 0),
        conversionRate: FIXED_CATALOG_CONVERSION_ESTIMATE,
      };
    },
  });
}
