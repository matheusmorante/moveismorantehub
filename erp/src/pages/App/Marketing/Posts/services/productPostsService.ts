/**
 * productPostsService — CRUD da Biblioteca de Posts (artes finais do produto).
 *
 * Regras de negócio:
 * - Artes são salvas explicitamente pelo usuário (sem FIFO, sem exclusão automática).
 * - Cada post pertence a um produto. Campanha e variação são opcionais.
 * - Upload vai para Storage bucket "product-posts" em caminho estruturado.
 * - Imagens precisam ser armazenadas como URL HTTPS acessível externamente.
 * - Validação de proporção: 4:5 (Feed) ou 9:16 (Story/Status), com tolerância de 3%.
 */

import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { postDeleteFormSchema, postUploadFormSchema } from '../../../../../../../shared-utils/marketingFormSchemas';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  ImageRatioValidation,
  ProductPost,
  ProductPostFormat,
  productPostFormatLabel,
} from '../types/postSpecification';

const BUCKET = 'product-posts';
const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function postFromRow(row: any): ProductPost {
  return {
    id: row.id,
    productId: row.product_id,
    campaignId: row.campaign_id ?? null,
    variationId: row.variation_id ?? null,
    format: row.format as ProductPostFormat,
    imageStoragePath: row.image_storage_path,
    imageUrl: row.image_url,
    title: row.title ?? null,
    notes: row.notes ?? null,
    campaignConfigHash: row.campaign_config_hash ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Validação de proporção
// ---------------------------------------------------------------------------

/** Proporções alvo com tolerância de 3% */
const RATIO_TARGETS: Array<{ format: ProductPostFormat; ratio: number }> = [
  { format: 'FEED_4_5', ratio: 4 / 5 },
  { format: 'STORY_STATUS_9_16', ratio: 9 / 16 },
];
const TOLERANCE = 0.03;

/**
 * Valida a proporção de uma imagem.
 * Retorna o formato detectado ou null se não corresponder aos formatos oficiais.
 */
export async function validateImageRatio(file: File): Promise<ImageRatioValidation> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file), img = new Image();
    let finished = false;
    const complete = (value: ImageRatioValidation) => {
      if (finished) return;
      finished = true; clearTimeout(timer); img.onload = null; img.onerror = null;
      URL.revokeObjectURL(url); resolve(value);
    };
    const timer = setTimeout(() => complete({ detectedRatio: '?', format: null, valid: false, message: 'A leitura da imagem demorou demais. Selecione novamente.' }), 10_000);
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight, detected = img.naturalWidth + '×' + img.naturalHeight;
      const target = RATIO_TARGETS.find((item) => Math.abs(ratio - item.ratio) / item.ratio <= TOLERANCE);
      complete(target ? { detectedRatio: detected, format: target.format, valid: true } : { detectedRatio: detected, format: null, valid: false, message: 'A imagem (' + detected + ') não corresponde aos formatos oficiais 4:5 (Feed) ou 9:16 (Story/Status).' });
    };
    img.onerror = () => complete({ detectedRatio: '?', format: null, valid: false, message: 'Não foi possível carregar a imagem para validar as proporções.' });
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export interface ListPostsFilters {
  productId?: string;
  campaignId?: string;
  format?: ProductPostFormat;
}

export interface UploadPostParams {
  productId: string;
  postId?: string;
  file: File;
  format: ProductPostFormat;
  campaignId?: string | null;
  variationId?: string | null;
  title?: string;
  notes?: string;
  campaignConfigHash?: string;
}

export const productPostsService = {
  /** Lista posts com filtros opcionais. */
  async listPosts(filters: ListPostsFilters = {}): Promise<ProductPost[]> {
    let query = supabase
      .from('product_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.productId) query = query.eq('product_id', filters.productId);
    if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);
    if (filters.format) query = query.eq('format', filters.format);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(postFromRow);
  },

  /**
   * Faz upload da arte final e cria o registro na biblioteca.
   * Caminho no Storage: product-posts/{productId}/{postId}/image.{ext}
   */
  async uploadPost(params: UploadPostParams, options?: { isCurrent?: () => boolean }): Promise<ProductPost> {
    params = { ...params, productId: postUploadFormSchema.shape.productId.parse(params.productId), file: postUploadFormSchema.shape.file.parse(params.file), format: postUploadFormSchema.shape.format.parse(params.format), campaignId: postUploadFormSchema.shape.campaignId.parse(params.campaignId || '') || null };
    const current = options?.isCurrent || (() => true);
    if (!current()) throw Object.assign(new Error('O produto ou a sessão mudou. Reabra o upload.'), { knownFailure: true });
    const ratio = await validateImageRatio(params.file);
    if (!ratio.valid || ratio.format !== params.format) throw Object.assign(new Error(ratio.message || 'A proporção da imagem não corresponde ao formato escolhido.'), { knownFailure: true });
    if (!current()) throw new Error('O produto ou a sessão mudou. Reabra o upload.');
    const postId = params.postId || crypto.randomUUID();
    const ext = params.file.name.split('.').pop()?.toLowerCase() ?? 'webp';
    const storagePath = `${params.productId}/${postId}/image.${ext}`;

    // Upload para o Storage
    let uploaded;
    try { uploaded = await withTimeout(supabase.storage
      .from(BUCKET)
      .upload(storagePath, params.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: params.file.type,
      }), 30_000, null, 'Arquivo do post'); } catch { throw Object.assign(new Error('O envio do arquivo não foi confirmado. Confira antes de repetir.'), { uncertain: true }); }
    if (!uploaded) throw Object.assign(new Error('O envio do arquivo não foi confirmado. Confira a biblioteca antes de repetir.'), { uncertain: true });
    if (uploaded.error) { const status = Number('status' in uploaded.error ? uploaded.error.status : 'statusCode' in uploaded.error ? uploaded.error.statusCode : 0); throw Object.assign(new Error('Erro ao enviar a imagem: ' + uploaded.error.message), { knownFailure: status >= 400 && status < 500, uncertain: !(status >= 400 && status < 500) }); }
    if (uploaded.data?.path !== storagePath) throw Object.assign(new Error('O arquivo enviado não foi confirmado.'), { uncertain: true });
    if (!current()) throw Object.assign(new Error('O contexto mudou após enviar o arquivo. Confira a biblioteca.'), { uncertain: true });

    // Obter URL pública
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const imageUrl = urlData.publicUrl;
    if (!/^https:\/\//i.test(imageUrl)) throw Object.assign(new Error('A imagem precisa de uma URL HTTPS pública.'), { uncertain: true });

    const ts = now();
    let inserted;
    try { inserted = await withTimeout(supabase
      .from('product_posts')
      .insert({
        id: postId,
        product_id: params.productId,
        campaign_id: params.campaignId ?? null,
        variation_id: params.variationId ?? null,
        format: params.format,
        image_storage_path: storagePath,
        image_url: imageUrl,
        title: params.title ?? null,
        notes: params.notes ?? null,
        campaign_config_hash: params.campaignConfigHash ?? null,
        created_at: ts,
        updated_at: ts,
      })
      .select()
      .single(), 20_000, null, 'Registro do post'); } catch { throw Object.assign(new Error('O registro da arte não foi confirmado. Confira antes de repetir.'), { uncertain: true }); }
    if (!inserted || inserted.error) throw Object.assign(new Error('O arquivo foi enviado, mas o registro da biblioteca não foi confirmado. Confira antes de repetir.'), { uncertain: true });
    const row = inserted.data;
    if (!row || row.id !== postId || row.product_id !== params.productId || row.format !== params.format || row.campaign_id !== (params.campaignId ?? null) || row.image_storage_path !== storagePath || row.image_url !== imageUrl) throw Object.assign(new Error('O recibo da biblioteca não corresponde à arte enviada.'), { uncertain: true });
    return postFromRow(row);
  },

  /**
   * Exclui um post e seu arquivo no Storage.
   * Exclusão sempre explícita — nunca automática.
   */
  async deletePost(post: ProductPost, options?: { recordAlreadyDeleted?: boolean; isCurrent?: () => boolean }): Promise<void> {
    const values = postDeleteFormSchema.parse(post), current = options?.isCurrent || (() => true);
    if (!current()) throw new Error('A biblioteca mudou. Atualize antes de excluir.');
    if (!options?.recordAlreadyDeleted) {
      let deleted;
      try { deleted = await withTimeout(supabase.from('product_posts').delete().eq('id', values.id).eq('product_id', values.productId).select('id'), 20_000, null, 'Excluir registro do post'); }
      catch { throw Object.assign(new Error('A exclusão do registro não foi confirmada. Confira a biblioteca.'), { uncertain: true }); }
      if (!deleted) throw Object.assign(new Error('A exclusão do registro não foi confirmada. Confira a biblioteca.'), { uncertain: true });
      if (deleted.error) throw Object.assign(new Error(deleted.error.message), { uncertain: !deleted.error.code || deleted.error.code.startsWith('08') || deleted.error.code === 'PGRST116' });
      if (deleted.data?.length !== 1 || deleted.data[0].id !== values.id) throw Object.assign(new Error('O registro excluído não foi confirmado.'), { uncertain: true });
    }
    try {
      if (!current()) throw new Error('O contexto mudou após excluir o registro.');
      const removed = await withTimeout(supabase.storage.from(BUCKET).remove([values.imageStoragePath]), 20_000, null, 'Excluir arquivo do post');
      if (!removed || removed.error || !removed.data?.some((item) => item.name === values.imageStoragePath)) throw new Error('A exclusão do arquivo não foi confirmada.');
    } catch (error) { throw Object.assign(new Error('Registro removido; a limpeza do arquivo permanece pendente.'), { recordDeleted: true, uncertain: !error || typeof error !== 'object' || !('knownFailure' in error) }); }
  },

  /** Exporta o label formatado do formato. */
  formatLabel(format: ProductPostFormat): string {
    return productPostFormatLabel[format];
  },

  /** Detecta automaticamente o formato a partir do arquivo antes do upload. */
  validateImageRatio,
};
