import { supabase } from '@/pages/utils/supabaseConfig';
import type { Opportunity } from '../types/PriceLabelArtEditorTypes';
import type { LabelConfig } from '../utils/LabelConstants';
import { upsertRemoteLabelArtConfig } from './labelLayoutService';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { labelArtLayoutSelectionSchema, labelArtConfigSchema, labelOpportunitiesSchema } from '../../../../../../../shared-utils/labelArtworkFormSchemas';

type LabelArtConfig = NonNullable<LabelConfig['artConfig']>;
export interface PriceLabelArtConfigResult { data: LabelArtConfig | null; error: unknown | null }
export interface PriceLabelOpportunitiesResult { data: Opportunity[]; error: unknown | null }

export async function fetchPriceLabelArtConfigResult(layoutId: string): Promise<PriceLabelArtConfigResult> {
  const selection = labelArtLayoutSelectionSchema.safeParse({ layoutId });
  if (!selection.success) return { data: null, error: selection.error };
  try {
    const response = await withTimeout(supabase.from('label_art_configs').select('layout_id,art_config')
      .eq('layout_id', selection.data.layoutId).maybeSingle(), 15_000, null, 'etiquetas:consultar-arte');
    if (!response || response.status === 0) throw new Error('A consulta da arte não foi confirmada.');
    if (response.error) return { data: null, error: response.error };
    if (response.data === null) return { data: null, error: null };
    if (response.data?.layout_id !== selection.data.layoutId) throw new Error('A consulta retornou arte de outro modelo.');
    const parsed = labelArtConfigSchema.safeParse(response.data.art_config);
    if (!parsed.success) return { data: null, error: parsed.error };
    return { data: parsed.data, error: null };
  } catch (error) { return { data: null, error }; }
}

/**
 * Serviço de persistência remota para configurações de arte de etiqueta de preço no Supabase.
 */
export async function fetchPriceLabelArtConfig(
  layoutId: string
): Promise<Record<string, any> | null> {
  return (await fetchPriceLabelArtConfigResult(layoutId)).data;
}

export async function savePriceLabelArtConfig(
  layoutId: string,
  artConfig: Record<string, any>
): Promise<boolean> {
  try {
    const result = await upsertRemoteLabelArtConfig({ layoutId, category: 'precos', artConfig });
    return result?.error === null;
  } catch { return false; }
}

export async function fetchOpportunitiesResult(): Promise<PriceLabelOpportunitiesResult> {
  try {
    const response = await withTimeout(supabase.from('opportunities').select('id, name, slug, badge_color, border_color'),
      15_000, null, 'etiquetas:consultar-oportunidades');
    if (!response || response.status === 0) throw new Error('A consulta das oportunidades não foi confirmada.');
    if (response.error) return { data: [], error: response.error };
    const parsed = labelOpportunitiesSchema.safeParse(response.data);
    return parsed.success ? { data: parsed.data, error: null } : { data: [], error: parsed.error };
  } catch (error) { return { data: [], error }; }
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  return (await fetchOpportunitiesResult()).data;
}
