import { supabase } from '@/pages/utils/supabaseConfig';
import type { GridModel, GridModelDraft } from '../types/LabelGridModelTypes';
import type { LabelConfig } from '../utils/LabelConstants';
import { mapDbToModel, mapModelToDb } from './labelLayoutMapper';
import { labelLayoutDeleteFormSchema, labelRemoteLayoutDraftSchema, labelRemoteLayoutRecordSchema, LabelLayoutUnconfirmedError } from '../../../../../../../shared-utils/labelLayoutFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { labelArtConfigInputSchema, labelLayoutArtworkCommandSchema, labelArtworkSaveFormSchema } from '../../../../../../../shared-utils/labelArtworkFormSchemas';

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
  const parsed = labelArtConfigInputSchema.safeParse({ layoutId, category, artConfig });
  if (!parsed.success) return { error: parsed.error };
  const payload = { layout_id: parsed.data.layoutId, category: parsed.data.category, art_config: parsed.data.artConfig };
  try {
    const response = await withTimeout(supabase.from('label_art_configs').upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'layout_id' }).select('layout_id,category,art_config').single(), 20_000, null, 'etiquetas:salvar-arte');
    const error = writeError(response); if (error) return { error };
    const row = response?.data;
    return { error: row && (['layout_id', 'category', 'art_config'] as const).every((key) => canonical(row[key]) === canonical(payload[key])) ? null : new LabelLayoutUnconfirmedError() };
  } catch { return { error: new LabelLayoutUnconfirmedError() }; }
}

export async function updateRemoteLabelLayoutArtwork(
  layoutId: string,
  update: LabelLayoutArtworkUpdate
): Promise<{ error: unknown | null }> {
  const parsed = labelLayoutArtworkCommandSchema.safeParse({ layoutId, update });
  if (!parsed.success) return { error: parsed.error };
  try {
    const response = await withTimeout(supabase.from('label_layouts').update(parsed.data.update).eq('id', parsed.data.layoutId).select('*').single(), 20_000, null, 'etiquetas:salvar-vinculo-arte');
    const error = writeError(response); if (error) return { error };
    const row = response?.data;
    return { error: row?.id === parsed.data.layoutId && Object.entries(parsed.data.update).every(([key, value]) => value === undefined || canonical(row[key]) === canonical(value)) ? null : new LabelLayoutUnconfirmedError() };
  } catch { return { error: new LabelLayoutUnconfirmedError() }; }
}

const parseLayout = (row: Parameters<typeof mapDbToModel>[0]): GridModel => {
  const id: unknown = row?.id;
  if (!(typeof id === 'string' && id.trim()) && !(typeof id === 'number' && Number.isSafeInteger(id) && id > 0)) throw new Error('Modelo sem identificação válida.');
  return labelRemoteLayoutRecordSchema.parse(mapDbToModel(row));
};

export async function fetchRemoteLabelLayouts(): Promise<RemoteLayoutResult<GridModel[]>> {
  try {
    const response = await withTimeout(supabase.from('label_layouts').select('*'), 15_000, null, 'etiquetas:consultar-modelos');
    if (!response) throw new Error('A consulta dos modelos não foi confirmada.');
    if (response.error) return { data: null, error: response.error };
    if (!Array.isArray(response.data)) throw new Error('A consulta não retornou uma lista de modelos.');
    return { data: response.data.map(parseLayout), error: null };
  } catch (error) { return { data: null, error }; }
}

type LayoutWriteResponse = { data?: unknown; error?: unknown; status?: number } | null;
const writeError = (response: LayoutWriteResponse): unknown | null => {
  if (!response || response.status === 0) return new LabelLayoutUnconfirmedError();
  if (!response.error) return null;
  const code = (response.error as { code?: string }).code;
  if (!code && [401, 402, 403].includes(response.status ?? 0)) return response.error;
  return !code || code === '40003' || code === 'PGRST116' || code.startsWith('08')
    ? new LabelLayoutUnconfirmedError() : response.error;
};
// PostgreSQL JSON objects may reorder keys, including nested artwork metadata.
const canonical = (value: unknown) => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ? Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) : entry);
const confirmLayout = (response: LayoutWriteResponse, payload: ReturnType<typeof mapModelToDb>, id?: string): RemoteLayoutResult<GridModel> => {
  const error = writeError(response); if (error) return { data: null, error };
  try {
    const row = response?.data as Record<string, unknown> | null;
    if (!row || (id && row.id !== id)) throw new LabelLayoutUnconfirmedError();
    for (const [key, expected] of Object.entries(payload)) {
      if (expected === undefined) continue;
      const actual = ['price_font_size_tens', 'price_font_size_ten_thousands'].includes(key) && typeof row[key] === 'string' && (row[key] as string).trim()
        ? Number(row[key]) : row[key];
      if (canonical(actual) !== canonical(expected)) throw new LabelLayoutUnconfirmedError();
    }
    return { data: parseLayout(row as Parameters<typeof mapDbToModel>[0]), error: null };
  } catch { return { data: null, error: new LabelLayoutUnconfirmedError() }; }
};

export async function insertRemoteLabelLayout(
  model: GridModelDraft
): Promise<RemoteLayoutResult<GridModel>> {
  const parsed = labelRemoteLayoutDraftSchema.safeParse(model);
  if (!parsed.success) return { data: null, error: parsed.error };
  const payload = mapModelToDb(parsed.data);
  try {
    const response = await withTimeout(supabase.from('label_layouts').insert([payload]).select().single(), 20_000, null, 'etiquetas:inserir-modelo');
    return confirmLayout(response, payload);
  } catch { return { data: null, error: new LabelLayoutUnconfirmedError() }; }
}

export async function updateRemoteLabelLayout(
  id: string,
  model: GridModelDraft
): Promise<RemoteLayoutResult<GridModel>> {
  const selection = labelLayoutDeleteFormSchema.safeParse({ id });
  const parsed = labelRemoteLayoutDraftSchema.safeParse(model);
  if (!selection.success || !parsed.success) return { data: null, error: !selection.success ? selection.error : !parsed.success ? parsed.error : null };
  const payload = mapModelToDb(parsed.data);
  try {
    const response = await withTimeout(supabase.from('label_layouts').update(payload).eq('id', selection.data.id).select().single(), 20_000, null, 'etiquetas:atualizar-modelo');
    return confirmLayout(response, payload, selection.data.id);
  } catch { return { data: null, error: new LabelLayoutUnconfirmedError() }; }
}

export async function deleteRemoteLabelLayout(
  id: string | number
): Promise<{ error: unknown | null }> {
  const parsed = labelLayoutDeleteFormSchema.safeParse({ id: typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? String(id) : id });
  if (!parsed.success) return { error: parsed.error };
  try {
    const response = await withTimeout(supabase.from('label_layouts').delete().eq('id', parsed.data.id).select('id'), 20_000, null, 'etiquetas:excluir-modelo');
    const error = writeError(response); if (error) return { error };
    const rows = response?.data;
    if (Array.isArray(rows) && rows.length === 0) return { error: new Error('O modelo não está mais disponível. Recarregue a lista.') };
    const removedId: unknown = Array.isArray(rows) && rows.length === 1 ? rows[0]?.id : undefined;
    const validId = typeof removedId === 'string' || (typeof removedId === 'number' && Number.isSafeInteger(removedId) && removedId > 0);
    return { error: validId && String(removedId) === parsed.data.id ? null : new LabelLayoutUnconfirmedError() };
  } catch { return { error: new LabelLayoutUnconfirmedError() }; }
}

export interface PersistPriceLabelArtworkParams {
  readonly layoutId: string;
  readonly category?: string | null;
  readonly updated: Partial<LabelConfig>;
  readonly isCurrent?: () => boolean;
}

export async function persistPriceLabelArtwork({
  layoutId,
  category,
  updated,
  isCurrent = () => true,
}: PersistPriceLabelArtworkParams): Promise<boolean> {
  const parsed = labelArtworkSaveFormSchema.parse({ layoutId, category: category ?? 'precos', updated: { ...updated } });
  if (!isCurrent()) return false;
  const values = parsed.updated, groupPos = values.dePricePorGroupPos;
  if (!values.artConfig && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parsed.layoutId)) throw new Error('Informe a arte completa para atualizar um modelo padrão.');
  let artSaved = false;
  const changedContext = () => Object.assign(new Error('A arte foi confirmada em outro contexto. Recarregue antes de salvar novamente.'), { requiresRefresh: true });
  if (values.artConfig) {
    const { error } = await upsertRemoteLabelArtConfig({
      layoutId: parsed.layoutId,
      category: parsed.category,
      artConfig: values.artConfig,
    });
    if (error) throw error;
    artSaved = true;
  }
  if (!isCurrent()) { if (artSaved) throw changedContext(); return false; }
  if (
    (groupPos || values.artConfig) &&
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parsed.layoutId)
  ) {
    const { error } = await updateRemoteLabelLayoutArtwork(parsed.layoutId, {
      ...(groupPos
        ? {
            de_price_por_group_pos_x: groupPos.x,
            de_price_por_group_pos_y: groupPos.y,
            de_price_por_group_rotation: values.dePricePorGroupRotation ?? 0,
            de_price_por_group_gap: values.dePricePorGroupGap ?? 10,
          }
        : {}),
      ...(values.artConfig ? { art_config: values.artConfig } : {}),
    });
    if (error) {
      if (!artSaved) throw error;
      throw Object.assign(new Error('A arte foi salva, mas a atualização do modelo não foi confirmada. Confira o modelo antes de continuar.'), { partial: true, uncertain: Boolean((error as { uncertain?: boolean })?.uncertain), cause: error });
    }
  }
  if (!isCurrent()) throw changedContext();
  return true;
}
