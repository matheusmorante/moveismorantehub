import { supabase } from '@/pages/utils/supabaseConfig';
import type { GridModel, GridModelDraft } from '../types/LabelGridModelTypes';
import type { LabelConfig } from '../utils/LabelConstants';
import { mapDbToModel, mapModelToDb } from '../utils/LabelUtils';

type LabelArtConfig = NonNullable<LabelConfig['artConfig']>;

export interface RemoteLayoutResult<T> {
  readonly data: T | null;
  readonly error: unknown | null;
}

export interface LabelArtConfigInput {
  readonly layoutId: string;
  readonly category: string;
  readonly artConfig: LabelArtConfig;
}

export interface LabelLayoutArtworkUpdate {
  readonly de_price_por_group_pos_x?: number;
  readonly de_price_por_group_pos_y?: number;
  readonly de_price_por_group_rotation?: number;
  readonly de_price_por_group_gap?: number;
  readonly art_config?: LabelArtConfig;
}

export async function upsertRemoteLabelArtConfig({
  layoutId,
  category,
  artConfig,
}: LabelArtConfigInput): Promise<{ error: unknown | null }> {
  const { error } = await supabase.from('label_art_configs').upsert(
    {
      layout_id: layoutId,
      category,
      art_config: artConfig,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'layout_id' }
  );
  return { error };
}

export async function updateRemoteLabelLayoutArtwork(
  layoutId: string,
  update: LabelLayoutArtworkUpdate
): Promise<{ error: unknown | null }> {
  const { error } = await supabase.from('label_layouts').update(update).eq('id', layoutId);
  return { error };
}

export async function fetchRemoteLabelLayouts(): Promise<RemoteLayoutResult<GridModel[]>> {
  const { data, error } = await supabase.from('label_layouts').select('*');
  return {
    data: data && !error ? data.map(mapDbToModel) : null,
    error,
  };
}

export async function insertRemoteLabelLayout(
  model: GridModelDraft
): Promise<RemoteLayoutResult<GridModel>> {
  const { data, error } = await supabase
    .from('label_layouts')
    .insert([mapModelToDb(model)])
    .select()
    .single();

  return {
    data: data && !error ? mapDbToModel(data) : null,
    error,
  };
}

export async function updateRemoteLabelLayout(
  id: string,
  model: GridModelDraft
): Promise<RemoteLayoutResult<GridModel>> {
  const { data, error } = await supabase
    .from('label_layouts')
    .update(mapModelToDb(model))
    .eq('id', id)
    .select()
    .single();

  return {
    data: data && !error ? mapDbToModel(data) : null,
    error,
  };
}

export async function deleteRemoteLabelLayout(id: string | number): Promise<{ error: unknown | null }> {
  const { error } = await supabase.from('label_layouts').delete().eq('id', id);
  return { error };
}
