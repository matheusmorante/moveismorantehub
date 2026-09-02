import { supabase } from '../../../services/supabaseClient';

export interface MobileOpportunity {
  id: string;
  name: string;
  slug?: string;
  badge_color?: string;
  active?: boolean;
}

export const fetchMobileOpportunities = async (): Promise<MobileOpportunity[]> => {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, name, slug, badge_color, active')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('[MobileOpportunityService] Erro ao buscar oportunidades:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[MobileOpportunityService] Exceção:', err);
    return [];
  }
};
