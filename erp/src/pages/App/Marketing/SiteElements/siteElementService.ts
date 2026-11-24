import type { PostgrestResponse } from '@supabase/supabase-js';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  siteElementActivationFormSchema,
  siteElementAnnouncementFormSchema,
  siteElementCarouselFormSchema,
  siteElementDeleteFormSchema,
  siteElementModelFormSchema,
  type SiteElementAnnouncementFormValues,
  type SiteElementActivationFormValues,
  type SiteElementKind,
  type SiteElementModelFormValues,
} from '../../../../../../shared-utils/siteElementSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import type { CarouselBannerVariant } from '../../../../../../shared-utils/siteElementDimensions';

export const SITE_ELEMENT_PAGE_SIZE = 15;
const BUCKET = 'products';
const CAROUSEL_FIELDS = 'id,name,image_path,file_name,mime_type,size_bytes,width,height,updated_at,active,tablet_image_path,tablet_file_name,mobile_image_path,mobile_file_name,link_url';
const ANNOUNCEMENT_FIELDS = 'id,message,background_color,text_color,font_weight,font_size_px,starts_at,ends_at,active,updated_at';
const REQUEST_TIMEOUT = 20_000;
const EXTRA_CAROUSEL_VARIANTS = ['tablet', 'mobile'] as const;

export interface CarouselSiteElementModel {
  id: string;
  kind: 'carousel';
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

export interface AnnouncementBarModel {
  id: string;
  kind: 'top_bar';
  message: string;
  background_color: string;
  text_color: string;
  font_weight: number;
  font_size_px: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  updated_at: string;
}

export type SiteElementModel = CarouselSiteElementModel | AnnouncementBarModel;
type SiteElementModelRow = Omit<CarouselSiteElementModel, 'kind'> | Omit<AnnouncementBarModel, 'kind'>;

export function siteElementModelLabel(model: SiteElementModel) {
  return model.kind === 'top_bar' ? model.message : model.name;
}

export function siteElementImageUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchSiteElementModels(kind: SiteElementKind, page: number, signal?: AbortSignal) {
  const selection = kind === 'top_bar'
    ? supabase.from('site_element_announcement_bars').select(ANNOUNCEMENT_FIELDS, { count: 'exact' })
    : supabase.from('site_element_models').select(CAROUSEL_FIELDS, { count: 'exact' }).eq('kind', 'carousel');
  let query = selection.order('created_at', { ascending: false }).order('id')
    .range((page - 1) * SITE_ELEMENT_PAGE_SIZE, page * SITE_ELEMENT_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const result = await withTimeout<PostgrestResponse<SiteElementModelRow> | null>(query, REQUEST_TIMEOUT, null, 'Consultar elementos do site');
  if (!result) throw new Error('A consulta demorou demais. Tente atualizar a lista.');
  if (result.error) throw result.error;
  const rows = (result.data || []).map((row): SiteElementModel => ({ ...row, kind } as SiteElementModel));
  return { rows, count: result.count || 0 };
}

export async function setSiteElementActivation(values: SiteElementActivationFormValues) {
  const { id, kind, active, updated_at } = siteElementActivationFormSchema.parse(values);
  const resultQuery = kind === 'top_bar'
    ? supabase.rpc('set_site_element_announcement_activation', {
      p_id: id,
      p_active: active,
      p_expected_updated_at: updated_at,
    }).maybeSingle()
    : supabase.from('site_element_models').update({ active }).eq('id', id).eq('kind', 'carousel').eq('updated_at', updated_at).select('id,active,updated_at').maybeSingle();
  const result = await withTimeout(resultQuery, REQUEST_TIMEOUT, null, kind === 'top_bar' ? 'Alterar status do aviso' : 'Alterar status do modelo');
  if (!result) throw new Error('A alteração de status demorou demais. Confira o status atualizado antes de tentar novamente.');
  if (result.error) throw result.error;
  if (!result.data) throw new Error(kind === 'top_bar'
    ? 'O aviso foi alterado ou removido por outro usuário. Confira a lista atualizada.'
    : 'O modelo foi alterado ou removido por outro usuário. Confira a lista atualizada.');
  return siteElementActivationFormSchema.parse({ ...result.data, kind });
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

function localDateTimeToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

async function saveAnnouncementBar(values: SiteElementAnnouncementFormValues, original?: AnnouncementBarModel) {
  const parsed = siteElementAnnouncementFormSchema.parse(values);
  const id = original?.id || crypto.randomUUID();
  const payload = {
    message: parsed.message,
    background_color: parsed.backgroundColor.toUpperCase(),
    text_color: parsed.textColor.toUpperCase(),
    font_weight: Number(parsed.fontWeight),
    font_size_px: Number(parsed.fontSizePx),
    starts_at: localDateTimeToIso(parsed.startsAt),
    ends_at: localDateTimeToIso(parsed.endsAt),
    updated_at: new Date().toISOString(),
  };
  const mutation = original
    ? supabase.from('site_element_announcement_bars').update(payload).eq('id', id).eq('updated_at', original.updated_at)
    : supabase.from('site_element_announcement_bars').insert({ id, ...payload, active: false });
  const result = await withTimeout(
    mutation.select(ANNOUNCEMENT_FIELDS).maybeSingle(), REQUEST_TIMEOUT, null, 'Salvar aviso do site',
  );
  if (!result) throw new Error('O salvamento não foi confirmado. Atualize a lista antes de repetir.');
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O aviso foi alterado ou removido por outro usuário. Atualize a lista.');
  return { model: { ...result.data, kind: 'top_bar' as const } as AnnouncementBarModel, cleanupFailed: false };
}

async function saveCarouselModel(values: SiteElementModelFormValues, original?: CarouselSiteElementModel) {
  const parsed = siteElementCarouselFormSchema.parse(values);
  if (original && (original.image_path !== parsed.existingImagePath
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
    if (parsed.file) uploaded.desktop = await uploadModelImage(parsed.file, 'carousel', id);
    for (const variant of EXTRA_CAROUSEL_VARIANTS) {
      const file = parsed[variant].file;
      if (file) uploaded[variant] = await uploadModelImage(file, 'carousel', id);
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
  const payload = {
    ...basePayload,
    ...(parsed.linkUrl !== undefined ? { link_url: parsed.linkUrl || null } : {}),
    ...carouselVariantColumns('tablet', uploaded.tablet, parsed.tablet),
    ...carouselVariantColumns('mobile', uploaded.mobile, parsed.mobile),
  };
  const mutation = original
    ? supabase.from('site_element_models').update(payload).eq('id', id).eq('kind', 'carousel').eq('updated_at', original.updated_at)
    : supabase.from('site_element_models').insert({ ...payload, kind: 'carousel' });
  const result = await withTimeout(
    mutation.select<string>(CAROUSEL_FIELDS).maybeSingle<SiteElementModelRow>(), REQUEST_TIMEOUT, null, 'Salvar modelo do site',
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
  return { model: { ...result.data, kind: 'carousel' as const }, cleanupFailed };
}

export async function saveSiteElementModel(values: SiteElementModelFormValues, original?: SiteElementModel) {
  const parsed = siteElementModelFormSchema.parse(values);
  if (parsed.kind === 'top_bar') {
    if (original && original.kind !== 'top_bar') throw new Error('O modelo mudou. Feche o formulário e abra novamente.');
    return saveAnnouncementBar(parsed, original?.kind === 'top_bar' ? original : undefined);
  }
  if (original && original.kind !== 'carousel') throw new Error('O modelo mudou. Feche o formulário e abra novamente.');
  return saveCarouselModel(parsed, original?.kind === 'carousel' ? original : undefined);
}

export async function deleteSiteElementModel(model: Pick<SiteElementModel, 'id' | 'kind' | 'updated_at'>) {
  const parsed = siteElementDeleteFormSchema.parse(model);
  if (parsed.kind === 'top_bar') {
    const deletion = supabase.from('site_element_announcement_bars').delete().eq('id', parsed.id).eq('updated_at', model.updated_at)
      .select('id').maybeSingle();
    const result = await withTimeout(deletion, REQUEST_TIMEOUT, null, 'Excluir aviso do site');
    if (!result) throw new Error('A exclusão não foi confirmada. Atualize a lista antes de repetir.');
    if (result.error) throw result.error;
    if (!result.data) throw new Error('O aviso foi alterado ou removido por outro usuário. Atualize a lista.');
    return { cleanupFailed: false };
  }
  const deletion = supabase.from('site_element_models').delete().eq('id', parsed.id).eq('kind', 'carousel').eq('updated_at', model.updated_at)
    .select('image_path,mobile_image_path,tablet_image_path').maybeSingle();
  const result = await withTimeout(
    deletion,
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
