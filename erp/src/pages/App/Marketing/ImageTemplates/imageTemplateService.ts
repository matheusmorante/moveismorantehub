import { supabase } from '@/pages/utils/supabaseConfig';
import { withAbortTimeout } from '../../../../../../shared-utils/withAbortTimeout';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  deleteImageTemplateSchema, imageTemplateFormSchema, imageTemplateMetadataSchema, templateAssetIds,
  type DeleteImageTemplateValues, type ImageTemplateFormValues,
} from '../../../../../../shared-utils/catalogImageTemplate';
import type { TemplateListQuery } from './imageTemplateListFilters';

export const IMAGE_TEMPLATE_PAGE_SIZE = 15;
const SUMMARY = 'id,name,description,created_at,updated_at';
const TABLE = 'catalog_image_templates';
const ASSETS = 'catalog_image_template_assets';
const TIMEOUT = 20_000;

export interface ImageTemplateSummary {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}
export type SavedImageTemplate = ImageTemplateSummary & ImageTemplateFormValues;
export type TemplateAsset = { id: string; webp_base64: string };
export const assetSource = (asset: TemplateAsset) => `data:image/webp;base64,${asset.webp_base64}`;

export function imageTemplateError(error: unknown) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : 'Não foi possível concluir a operação.';
}

export async function listImageTemplates(page: number, criteria: TemplateListQuery, signal: AbortSignal) {
  const offset = (page - 1) * IMAGE_TEMPLATE_PAGE_SIZE;
  let query = supabase.from('catalog_image_template_list').select(SUMMARY, { count: 'exact' });
  if (criteria.pattern) query = query.filter('search_text', 'match', criteria.pattern);
  if (criteria.from) query = query.gte('created_on', criteria.from);
  if (criteria.through) query = query.lte('created_on', criteria.through);
  const result = await withAbortTimeout(query.order(criteria.column, { ascending: criteria.ascending }).order('id')
    .range(offset, offset + IMAGE_TEMPLATE_PAGE_SIZE - 1),
  'modelos-de-imagem:lista', TIMEOUT, signal);
  if (result.error) throw result.error;
  return { rows: (result.data || []) as ImageTemplateSummary[], total: result.count ?? 0 };
}

export async function readImageTemplate(id: string, signal: AbortSignal): Promise<SavedImageTemplate> {
  const result = await withAbortTimeout(supabase.from(TABLE).select(`${SUMMARY},design`).eq('id', id).maybeSingle(),
    'modelos-de-imagem:detalhe', TIMEOUT, signal);
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Modelo removido ou indisponível. Atualize a lista.');
  const parsed = imageTemplateFormSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('O conteúdo deste modelo é inválido.');
  return { ...result.data as ImageTemplateSummary, ...parsed.data };
}

export async function readTemplateAssets(ids: string[], signal: AbortSignal) {
  if (!ids.length) return [];
  const result = await withAbortTimeout(supabase.from(ASSETS).select('id,webp_base64').in('id', ids),
    'modelos-de-imagem:elementos', TIMEOUT, signal);
  if (result.error) throw result.error;
  return (result.data || []) as TemplateAsset[];
}

async function requireWrite<T>(request: PromiseLike<{ data: T | null; error: unknown }>, label: string) {
  const result = await withTimeout(request, TIMEOUT, null, label);
  if (!result) throw new Error('A operação não foi confirmada. Confira o estado do modelo antes de tentar novamente.');
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O modelo foi alterado ou removido. Abra a versão mais recente.');
  return result.data;
}

export async function saveImageTemplate(
  id: string, input: ImageTemplateFormValues, original: ImageTemplateSummary | null,
  pendingAssets: ReadonlyMap<string, TemplateAsset>,
): Promise<ImageTemplateSummary> {
  const values = imageTemplateFormSchema.parse(input);
  const pending = templateAssetIds(values.design).flatMap((assetId) => {
    const asset = pendingAssets.get(assetId);
    return asset ? [asset] : [];
  });
  if (pending.length) {
    const result = await withTimeout(supabase.from(ASSETS).upsert(pending, { onConflict: 'id', ignoreDuplicates: true }),
      TIMEOUT, null, 'Enviar imagens do modelo');
    if (!result) throw new Error('O envio das imagens não foi confirmado. Tente salvar novamente.');
    if (result.error) throw result.error;
  }
  const query = original
    ? supabase.from(TABLE).update(values).eq('id', id).eq('updated_at', original.updated_at)
    : supabase.from(TABLE).insert({ id, ...values });
  return requireWrite(query.select(SUMMARY).maybeSingle(), 'Salvar modelo de imagem') as Promise<ImageTemplateSummary>;
}

export async function renameImageTemplate(original: ImageTemplateSummary, values: { name: string; description: string }) {
  const metadata = imageTemplateMetadataSchema.parse(values);
  return requireWrite(supabase.from(TABLE).update(metadata).eq('id', original.id).eq('updated_at', original.updated_at)
    .select('id').maybeSingle(), 'Renomear modelo de imagem');
}

export async function deleteImageTemplate(values: DeleteImageTemplateValues) {
  const target = deleteImageTemplateSchema.parse(values);
  return requireWrite(supabase.from(TABLE).delete().eq('id', target.id).eq('updated_at', target.updated_at)
    .select('id').maybeSingle(), 'Excluir modelo de imagem');
}

export async function prepareTemplateAsset(file: File): Promise<TemplateAsset> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
    throw new Error('Selecione uma imagem PNG, JPG ou WebP de até 5 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 24_000_000) {
      throw new Error('A imagem deve ter até 24 megapixels.');
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não conseguiu preparar a imagem.');
    const initialScale = Math.min(1, 1080 / Math.max(bitmap.width, bitmap.height));
    for (const factor of [1, .75, .5]) {
      canvas.width = Math.max(1, Math.round(bitmap.width * initialScale * factor));
      canvas.height = Math.max(1, Math.round(bitmap.height * initialScale * factor));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', .88));
      if (blob?.type !== 'image/webp' || blob.size > 307_200) continue;
      const buffer = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const id = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
      return { id, webp_base64: btoa(binary) };
    }
    throw new Error('Não foi possível otimizar a imagem. Tente um arquivo menor.');
  } finally {
    bitmap.close();
  }
}
