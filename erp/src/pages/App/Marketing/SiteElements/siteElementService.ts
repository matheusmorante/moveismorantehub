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
const FIELDS = 'id,kind,name,image_path,file_name,mime_type,size_bytes,width,height,updated_at';
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
  updated_at: string;
}

export function siteElementImageUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchSiteElementModels(kind: SiteElementKind, page: number, signal?: AbortSignal) {
  let query = supabase.from('site_element_models').select(FIELDS, { count: 'exact' })
    .eq('kind', kind).order('created_at', { ascending: false }).order('id')
    .range((page - 1) * SITE_ELEMENT_PAGE_SIZE, page * SITE_ELEMENT_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const result = await withTimeout(query, REQUEST_TIMEOUT, null, 'Consultar elementos do site');
  if (!result) throw new Error('A consulta demorou demais. Tente atualizar a lista.');
  if (result.error) throw result.error;
  return { rows: (result.data || []) as SiteElementModel[], count: result.count || 0 };
}

async function removeImage(path: string): Promise<boolean> {
  try {
    const result = await withTimeout(supabase.storage.from(BUCKET).remove([path]), REQUEST_TIMEOUT, null, 'Remover imagem do elemento');
    return !!result && !result.error;
  } catch {
    return false;
  }
}

export async function saveSiteElementModel(values: SiteElementModelFormValues, original?: SiteElementModel) {
  const parsed = siteElementModelFormSchema.parse(values);
  if (original && (original.kind !== parsed.kind || original.image_path !== parsed.existingImagePath)) {
    throw new Error('O modelo mudou. Feche o formulário e abra novamente.');
  }
  if (!original && !parsed.file) throw new Error('Selecione a imagem do modelo.');
  const id = original?.id || crypto.randomUUID();
  let imagePath = original?.image_path || '';
  let uploadedPath: string | null = null;
  if (parsed.file) {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[parsed.file.type];
    imagePath = `site-elements/${parsed.kind}/${id}/${crypto.randomUUID()}.${extension}`;
    const upload = await withTimeout(supabase.storage.from(BUCKET).upload(imagePath, parsed.file, {
      contentType: parsed.file.type, cacheControl: '31536000', upsert: false,
    }), REQUEST_TIMEOUT, null, 'Enviar imagem do elemento');
    if (!upload) throw new Error('O envio da imagem não foi confirmado. Confira a conexão antes de tentar novamente.');
    if (upload.error) throw upload.error;
    uploadedPath = imagePath;
  }
  const payload = {
    id, kind: parsed.kind, name: parsed.name, image_path: imagePath,
    file_name: parsed.file?.name ?? original!.file_name,
    mime_type: parsed.file?.type ?? original!.mime_type,
    size_bytes: parsed.file?.size ?? original!.size_bytes,
    width: parsed.width, height: parsed.height,
    updated_at: new Date().toISOString(),
  };
  const mutation = original
    ? supabase.from('site_element_models').update(payload).eq('id', id).eq('kind', original.kind).eq('updated_at', original.updated_at)
    : supabase.from('site_element_models').insert(payload);
  const result = await withTimeout(mutation.select(FIELDS).maybeSingle(), REQUEST_TIMEOUT, null, 'Salvar modelo do site');
  // An uncertain database reply may already reference the new image; keep the file intact.
  if (!result) throw new Error('O salvamento não foi confirmado. Feche o formulário e atualize a lista antes de repetir.');
  if (result.error || !result.data) {
    if (uploadedPath && (!result.error || /^(22|23|42|PGRST)/.test(result.error.code || ''))) await removeImage(uploadedPath);
    if (result.error) throw result.error;
    throw new Error('O modelo foi alterado ou removido por outro usuário. Atualize a lista.');
  }
  const cleanupFailed = !!uploadedPath && !!original && !(await removeImage(original.image_path));
  return { model: result.data as SiteElementModel, cleanupFailed };
}

export async function deleteSiteElementModel(model: SiteElementModel) {
  const parsed = siteElementDeleteFormSchema.parse(model);
  const result = await withTimeout(supabase.from('site_element_models').delete()
    .eq('id', parsed.id).eq('kind', parsed.kind).eq('updated_at', model.updated_at)
    .select('id,image_path').maybeSingle(), REQUEST_TIMEOUT, null, 'Excluir modelo do site');
  if (!result) throw new Error('A exclusão não foi confirmada. Atualize a lista antes de repetir.');
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O modelo foi alterado ou removido por outro usuário. Atualize a lista.');
  return { cleanupFailed: !(await removeImage(result.data.image_path)) };
}

export function siteElementErrorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : 'Não foi possível concluir a operação. Tente novamente.';
}
