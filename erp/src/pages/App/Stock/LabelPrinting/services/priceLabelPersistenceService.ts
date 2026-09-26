import { supabase } from '@/pages/utils/supabaseConfig';
import { Opportunity } from '../types/PriceLabelArtEditorTypes';

/**
 * Serviço de persistência remota para configurações de arte de etiqueta de preço no Supabase.
 */
export async function fetchPriceLabelArtConfig(layoutId: string): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabase
      .from('label_art_configs')
      .select('art_config')
      .eq('layout_id', layoutId)
      .maybeSingle();

    if (error) {
      console.warn('[PriceLabelPersistence] Aviso ao consultar Supabase:', error.message);
      return null;
    }

    return (data?.art_config as Record<string, any>) || null;
  } catch (err) {
    console.error('[PriceLabelPersistence] Falha inesperada ao carregar art_config:', err);
    return null;
  }
}

export async function savePriceLabelArtConfig(layoutId: string, artConfig: Record<string, any>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('label_art_configs')
      .upsert({
        layout_id: layoutId,
        art_config: artConfig,
        updated_at: new Date().toISOString()
      }, { onConflict: 'layout_id' });

    if (error) {
      console.error('[PriceLabelPersistence] Erro ao salvar art_config no Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[PriceLabelPersistence] Falha inesperada ao salvar art_config:', err);
    return false;
  }
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, name, slug, badge_color, border_color');

    if (error) {
      console.warn('[PriceLabelPersistence] Aviso ao buscar oportunidades:', error.message);
      return [];
    }

    return (data as Opportunity[]) || [];
  } catch (err) {
    console.error('[PriceLabelPersistence] Erro ao carregar oportunidades:', err);
    return [];
  }
}
