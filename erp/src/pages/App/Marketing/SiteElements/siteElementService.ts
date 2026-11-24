import type { PostgrestResponse } from '@supabase/supabase-js';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  siteElementActivationFormSchema,
  siteElementDeleteFormSchema,
  siteElementModelFormSchema,
  type SiteElementActivationFormValues,
  type SiteElementKind,
  type SiteElementModelFormValues,
} from '../../../../../../shared-utils/siteElementSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import type { CarouselBannerVariant } from '../../../../../../shared-utils/siteElementDimensions';

export const SITE_ELEMENT_PAGE_SIZE = 15;
const BUCKET = 'products';
const CAROUSEL_FIELDS = 'id,name,image_path,file_name,mime_type,size_bytes,width,height,updated_at,active,tablet_image_path,tablet_file_name,mobile_image_path,mobile_file_name,link_url';
const TOP_BAR_FIELDS = 'id,name,image_path,file_name,mime_type,size_bytes,width,height,mobile_image_path,mobile_file_name,mobile_mime_type,mobile_size_bytes,mobile_width,mobile_height,tablet_image_path,tablet_file_name,tablet_mime_type,tablet_size_bytes,tablet_width,tablet_height,updated_at';
const REQUEST_TIMEOUT = 20_000;
const EXTRA_CAROUSEL_VARIANTS = ['tablet', 'mobile'] as const;

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
  active?: boolean;
  link_url?: string | null;
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

type SiteElementModelRow = Omit<SiteElementModel, 'kind'>;

export function siteElementImageUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchSiteElementModels(kind: SiteElementKind, page: number, signal?: AbortSignal) {
  const selection = kind === 'top_bar'
    ? supabase.from('site_element_top_bar_models').select(TOP_BAR_FIELDS, { count: 'exact' })
    : supabase.from('site_element_models').select(CAROUSEL_FIELDS, { count: 'exact' }).eq('kind', 'carousel');
  let query = selection.order('created_at', { ascending: false }).order('id')
    .range((page - 1) * SITE_ELEMENT_PAGE_SIZE, page * SITE_ELEMENT_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const result = await withTimeout<PostgrestResponse<SiteElementModelRow> | null>(query, REQUEST_TIMEOUT, null, 'Consultar elementos do site');
  if (!result) throw new Error('A consulta demorou demais. Tente atualizar a lista.');
  if (result.error) throw result.error;
  const rows = (result.data || []).map((row): SiteElementModel => ({ ...row, kind }));
  return { rows, count: result.count || 0 };
}

export async function setSiteElementActivation(values: SiteElementActivationFormValues) {
  const { id, active, updated_at } = siteElementActivationFormSchema.parse(values);
  const update = supabase.from('site_element_models')
    .update({ active })
    .eq('id', id)
    .eq('kind', 'carousel')
    .eq('updated_at', updated_at)
    .select('id,active,updated_at')
    .maybeSingle();
  const result = await withTimeout(update, REQUEST_TIMEOUT, null, 'Alterar status do modelo');
  if (!result) throw new Error('A alteração de status demorou demais. Confira o status atualizado antes de tentar novamente.');
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O modelo foi alterado ou removido por outro usuário. Confira a lista atualizada.');
  return siteElementActivationFormSchema.parse(result.data);
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

async function uploadModelImage(file: File, kind: SiteElementKind, id: string) {
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
  const path = `site-elements/${kind}/${id}/${crypto.randomUUID()}.${extension}`;
  const upload = await withTimeout(supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type, cacheControl: '31536000', upsert: false,
  }), REQUEST_TIMEOUT, null, 'Enviar imagem do elemento');
  if (!upload) throw new Error('O envio da imagem não foi confirmado. Confira a conexão antes de tentar novamente.');
  if (upload.error) throw upload.error;
  return { image_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size };
}

type UploadedImage = Awaited<ReturnType<typeof uploadModelImage>>;

function carouselVariantColumns(variant: 'tablet' | 'mobile', image: UploadedImage | undefined, dimensions: { width: number; height: number }) {
  if (!image) return {};
  return {
    [`${variant}_image_path`]: image.image_path,
    [`${variant}_file_name`]: image.file_name,
    [`${variant}_mime_type`]: image.mime_type,
    [`${variant}_size_bytes`]: image.size_bytes,
    [`${variant}_width`]: dimensions.width,
    [`${variant}_height`]: dimensions.height,
  };
}

export async function saveSiteElementModel(values: SiteElementModelFormValues, original?: SiteElementModel) {
  const parsed = siteElementModelFormSchema.parse(values);
  if (original && (original.kind !== parsed.kind
    || original.image_path !== parsed.existingImagePath
    || (original.mobile_image_path ?? null) !== parsed.mobile.existingImagePath
    || (original.tablet_image_path ?? null) !== parsed.tablet.existingImagePath
    || (!parsed.file && (original.width !== parsed.width || original.height !== parsed.height)))) {
    throw new Error('O modelo mudou. Feche o formulário e abra novamente.');
  }
  if (!original && !parsed.file) {
    throw new Error('Selecione a imagem do modelo.');
  }
  if (!original && parsed.kind === 'carousel' && EXTRA_CAROUSEL_VARIANTS.some((variant) => !parsed[variant].file)) {
    throw new Error('Selecione as três imagens do carrossel.');
  }
  const id = original?.id || crypto.randomUUID();
  const uploaded: Partial<Record<CarouselBannerVariant, UploadedImage>> = {};
  try {
    if (parsed.file) uploaded.desktop = await uploadModelImage(parsed.file, parsed.kind, id);
    if (parsed.kind === 'carousel') {
      for (const variant of EXTRA_CAROUSEL_VARIANTS) {
        const file = parsed[variant].file;
        if (file) uploaded[variant] = await uploadModelImage(file, parsed.kind, id);
      }
    }
  } catch (error) {
    await removeImages(Object.values(uploaded).map((image) => image.image_path));
    throw error;
  }

  const desktopImage = uploaded.desktop ?? {
    image_path: original!.image_path,
    file_name: original!.file_name,
    mime_type: original!.mime_type,
    size_bytes: original!.size_bytes,
  };
  const basePayload = {
    id,
    name: parsed.name,
    ...desktopImage,
    width: parsed.width, height: parsed.height,
    updated_at: new Date().toISOString(),
  };
  const payload = parsed.kind === 'top_bar' ? basePayload : {
    ...basePayload,
    kind: parsed.kind,
    ...(parsed.linkUrl !== undefined ? { link_url: parsed.linkUrl || null } : {}),
    ...carouselVariantColumns('tablet', uploaded.tablet, parsed.tablet),
    ...carouselVariantColumns('mobile', uploaded.mobile, parsed.mobile),
  };
  const table = parsed.kind === 'top_bar' ? 'site_element_top_bar_models' : 'site_element_models';
  const fields = parsed.kind === 'top_bar' ? TOP_BAR_FIELDS : CAROUSEL_FIELDS;
  const mutation = original
    ? supabase.from(table).update(payload).eq('id', id).eq('updated_at', original.updated_at)
    : supabase.from(table).insert<typeof payload>(payload);
  const result = await withTimeout(
    mutation.select<string>(fields).maybeSingle<SiteElementModelRow>(), REQUEST_TIMEOUT, null, 'Salvar modelo do site',
  );
  // Uma resposta incerta pode já apontar para os novos arquivos; nesse caso, preserve-os.
  if (!result) throw new Error('O salvamento não foi confirmado. Feche o formulário e atualize a lista antes de repetir.');
  if (result.error || !result.data) {
    if (!result.error || /^(22|23|42|PGRST)/.test(result.error.code || '')) {
      await removeImages(Object.values(uploaded).map((image) => image.image_path));
    }
    if (result.error) throw result.error;
    throw new Error('O modelo foi alterado ou removido por outro usuário. Atualize a lista.');
  }
  const retainedPaths = new Set([
    desktopImage.image_path,
    uploaded.tablet?.image_path ?? original?.tablet_image_path,
    uploaded.mobile?.image_path ?? original?.mobile_image_path,
  ]);
  const cleanupFailed = !(await removeImages([
    uploaded.desktop ? original?.image_path : null,
    uploaded.tablet ? original?.tablet_image_path : null,
    uploaded.mobile ? original?.mobile_image_path : null,
  ].filter((path) => !retainedPaths.has(path ?? undefined))));
  return { model: { ...result.data, kind: parsed.kind }, cleanupFailed };
}

export async function deleteSiteElementModel(model: SiteElementModel) {
  const parsed = siteElementDeleteFormSchema.parse(model);
  const table = parsed.kind === 'top_bar' ? 'site_element_top_bar_models' : 'site_element_models';
  let deletion = supabase.from(table).delete().eq('id', parsed.id).eq('updated_at', model.updated_at);
  if (parsed.kind === 'carousel') deletion = deletion.eq('kind', 'carousel');
  const result = await withTimeout(
    deletion.select('image_path,mobile_image_path,tablet_image_path').maybeSingle(),
    REQUEST_TIMEOUT, null, 'Excluir modelo do site',
  );
  if (!result) throw new Error('A exclusão não foi confirmada. Atualize a lista antes de repetir.');
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O modelo foi alterado ou removido por outro usuário. Atualize a lista.');
  const deleted = result.data;
  return { cleanupFailed: !(await removeImages([deleted.image_path, deleted.mobile_image_path, deleted.tablet_image_path])) };
}

export function siteElementErrorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : 'Não foi possível concluir a operação. Tente novamente.';
}
