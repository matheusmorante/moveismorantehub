import { supabase } from '@/pages/utils/supabaseConfig';
import {
  siteElementDeleteFormSchema,
  siteElementModelFormSchema,
  type SiteElementKind,
  type SiteElementModelFormValues,
} from '../../../../../../shared-utils/siteElementSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

export const SITE_ELEMENT_PAGE_SIZE = 15;
const BUCKET = 'products';
const CAROUSEL_FIELDS = 'id,kind,name,image_path,file_name,mime_type,size_bytes,width,height,updated_at';
const TOP_BAR_FIELDS = 'id,name,image_path,file_name,mime_type,size_bytes,width,height,mobile_image_path,mobile_file_name,mobile_mime_type,mobile_size_bytes,mobile_width,mobile_height,tablet_image_path,tablet_file_name,tablet_mime_type,tablet_size_bytes,tablet_width,tablet_height,updated_at';
const REQUEST_TIMEOUT = 20_000;

export interface SiteElementModel {
  id: string;
  kind: SiteElementKind;
  name: string;
  image_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  mobile_image_path?: string | null;
  mobile_file_name?: string | null;
  mobile_mime_type?: string | null;
  mobile_size_bytes?: number | null;
  mobile_width?: number | null;
  mobile_height?: number | null;
  tablet_image_path?: string | null;
  tablet_file_name?: string | null;
  tablet_mime_type?: string | null;
  tablet_size_bytes?: number | null;
  tablet_width?: number | null;
  tablet_height?: number | null;
  updated_at: string;
}

export function siteElementImageUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchSiteElementModels(kind: SiteElementKind, page: number, signal?: AbortSignal) {
  const table = kind === 'top_bar' ? 'site_element_top_bar_models' : 'site_element_models';
  const fields = kind === 'top_bar' ? TOP_BAR_FIELDS : CAROUSEL_FIELDS;
  let query = supabase.from(table).select(fields, { count: 'exact' }).order('created_at', { ascending: false }).order('id')
    .range((page - 1) * SITE_ELEMENT_PAGE_SIZE, page * SITE_ELEMENT_PAGE_SIZE - 1);
  if (kind === 'carousel') query = query.eq('kind', 'carousel');
  if (signal) query = query.abortSignal(signal);
  const result = await withTimeout(query, REQUEST_TIMEOUT, null, 'Consultar elementos do site');
  if (!result) throw new Error('A consulta demorou demais. Tente atualizar a lista.');
  if (result.error) throw result.error;
  const rows = (result.data || []).map((row) => kind === 'top_bar' ? { ...row, kind: 'top_bar' as const } : row);
  return { rows: rows as SiteElementModel[], count: result.count || 0 };
}

async function removeImages(paths: Array<string | null | undefined>): Promise<boolean> {
  const uniquePaths = [...new Set(paths.filter((path): path is string => !!path))];
  if (!uniquePaths.length) return true;
  try {
    const result = await withTimeout(supabase.storage.from(BUCKET).remove(uniquePaths), REQUEST_TIMEOUT, null, 'Remover imagens do elemento');
    return !!result && !result.error;
  } catch {
    return false;
  }
}

export async function saveSiteElementModel(values: SiteElementModelFormValues, original?: SiteElementModel) {
  const parsed = siteElementModelFormSchema.parse(values);
  if (original && (original.kind !== parsed.kind
    || original.image_path !== parsed.existingImagePath
    || (original.mobile_image_path ?? null) !== parsed.mobile.existingImagePath
    || (original.tablet_image_path ?? null) !== parsed.tablet.existingImagePath)) {
    throw new Error('O modelo mudou. Feche o formulário e abra novamente.');
  }
  if (!original && (!parsed.file || (parsed.kind === 'top_bar' && (!parsed.mobile.file || !parsed.tablet.file)))) {
    throw new Error('Selecione uma imagem para cada proporção do modelo.');
  }
  const id = original?.id || crypto.randomUUID();
  const assets = {
    desktop: { file: parsed.file },
    mobile: { file: parsed.mobile.file },
    tablet: { file: parsed.tablet.file },
  } as const;
  const uploadedPaths: string[] = [];
  const imagePaths: Record<keyof typeof assets, string> = {
    desktop: original?.image_path || '',
    mobile: original?.mobile_image_path || '',
    tablet: original?.tablet_image_path || '',
  };
  for (const slot of ['desktop', 'mobile', 'tablet'] as const) {
    const file = assets[slot].file;
    if (!file) continue;
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
    const path = `site-elements/${parsed.kind}/${id}/${crypto.randomUUID()}.${extension}`;
    let upload;
    try {
      upload = await withTimeout(supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type, cacheControl: '31536000', upsert: false,
      }), REQUEST_TIMEOUT, null, 'Enviar imagem do elemento');
    } catch (error) {
      await removeImages(uploadedPaths);
      throw error;
    }
    if (!upload) {
      await removeImages(uploadedPaths);
      throw new Error('O envio da imagem não foi confirmado. Confira a conexão antes de tentar novamente.');
    }
    if (upload.error) {
      await removeImages(uploadedPaths);
      throw upload.error;
    }
    uploadedPaths.push(path);
    imagePaths[slot] = path;
  }
  const desktopFile = assets.desktop.file;
  const mobileFile = assets.mobile.file;
  const tabletFile = assets.tablet.file;
  const basePayload = {
    id, name: parsed.name, image_path: imagePaths.desktop,
    file_name: desktopFile?.name ?? original!.file_name,
    mime_type: desktopFile?.type ?? original!.mime_type,
    size_bytes: desktopFile?.size ?? original!.size_bytes,
    width: parsed.width, height: parsed.height,
    updated_at: new Date().toISOString(),
  };
  const payload = parsed.kind === 'top_bar' ? {
    ...basePayload,
    mobile_image_path: imagePaths.mobile,
    mobile_file_name: mobileFile?.name ?? original?.mobile_file_name,
    mobile_mime_type: mobileFile?.type ?? original?.mobile_mime_type,
    mobile_size_bytes: mobileFile?.size ?? original?.mobile_size_bytes,
    mobile_width: parsed.mobile.width,
    mobile_height: parsed.mobile.height,
    tablet_image_path: imagePaths.tablet,
    tablet_file_name: tabletFile?.name ?? original?.tablet_file_name,
    tablet_mime_type: tabletFile?.type ?? original?.tablet_mime_type,
    tablet_size_bytes: tabletFile?.size ?? original?.tablet_size_bytes,
    tablet_width: parsed.tablet.width,
    tablet_height: parsed.tablet.height,
  } : { ...basePayload, kind: parsed.kind };
  const table = parsed.kind === 'top_bar' ? 'site_element_top_bar_models' : 'site_element_models';
  const fields = parsed.kind === 'top_bar' ? TOP_BAR_FIELDS : CAROUSEL_FIELDS;
  const mutation = original
    ? supabase.from(table).update(payload).eq('id', id).eq('updated_at', original.updated_at)
    : supabase.from(table).insert(payload);
  const result = await withTimeout(mutation.select(fields).maybeSingle(), REQUEST_TIMEOUT, null, 'Salvar modelo do site');
  // Uma resposta incerta pode já apontar para os novos arquivos; nesse caso, preserve-os.
  if (!result) throw new Error('O salvamento não foi confirmado. Feche o formulário e atualize a lista antes de repetir.');
  if (result.error || !result.data) {
    if (uploadedPaths.length && (!result.error || /^(22|23|42|PGRST)/.test(result.error.code || ''))) await removeImages(uploadedPaths);
    if (result.error) throw result.error;
    throw new Error('O modelo foi alterado ou removido por outro usuário. Atualize a lista.');
  }
  const oldPaths = original ? [original.image_path, original.mobile_image_path, original.tablet_image_path]
    .filter((path): path is string => !!path && !Object.values(imagePaths).includes(path)) : [];
  const cleanupFailed = oldPaths.length > 0 && !(await removeImages(oldPaths));
  const model = parsed.kind === 'top_bar' ? { ...result.data, kind: 'top_bar' as const } : result.data;
  return { model: model as SiteElementModel, cleanupFailed };
}

export async function deleteSiteElementModel(model: SiteElementModel) {
  const parsed = siteElementDeleteFormSchema.parse(model);
  const table = parsed.kind === 'top_bar' ? 'site_element_top_bar_models' : 'site_element_models';
  const fields = parsed.kind === 'top_bar' ? 'id,image_path,mobile_image_path,tablet_image_path' : 'id,image_path';
  let deletion = supabase.from(table).delete().eq('id', parsed.id).eq('updated_at', model.updated_at);
  if (parsed.kind === 'carousel') deletion = deletion.eq('kind', 'carousel');
  const result = await withTimeout(deletion.select(fields).maybeSingle(), REQUEST_TIMEOUT, null, 'Excluir modelo do site');
  if (!result) throw new Error('A exclusão não foi confirmada. Atualize a lista antes de repetir.');
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O modelo foi alterado ou removido por outro usuário. Atualize a lista.');
  const deleted = result.data as { image_path: string; mobile_image_path?: string | null; tablet_image_path?: string | null };
  return { cleanupFailed: !(await removeImages([deleted.image_path, deleted.mobile_image_path, deleted.tablet_image_path])) };
}

export function siteElementErrorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : 'Não foi possível concluir a operação. Tente novamente.';
}
