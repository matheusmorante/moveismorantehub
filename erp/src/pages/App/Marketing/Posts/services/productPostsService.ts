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
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = img.naturalWidth / img.naturalHeight;
      const detected = `${img.naturalWidth}×${img.naturalHeight}`;

      for (const { format, ratio: target } of RATIO_TARGETS) {
        if (Math.abs(ratio - target) / target <= TOLERANCE) {
          resolve({
            detectedRatio: detected,
            format,
            valid: true,
          });
          return;
        }
      }

      resolve({
        detectedRatio: detected,
        format: null,
        valid: false,
        message: `A imagem (${detected}) não corresponde aos formatos oficiais 4:5 (Feed) ou 9:16 (Story/Status). Por favor, verifique as dimensões.`,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        detectedRatio: '?',
        format: null,
        valid: false,
        message: 'Não foi possível carregar a imagem para validar as proporções.',
      });
    };

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
  async uploadPost(params: UploadPostParams): Promise<ProductPost> {
    const postId = crypto.randomUUID();
    const ext = params.file.name.split('.').pop()?.toLowerCase() ?? 'webp';
    const storagePath = `${params.productId}/${postId}/image.${ext}`;

    // Upload para o Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, params.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: params.file.type,
      });

    if (uploadError) throw new Error(`Erro ao enviar a imagem: ${uploadError.message}`);

    // Obter URL pública
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const imageUrl = urlData.publicUrl;

    const ts = now();
    const { data: row, error: insertError } = await supabase
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
      .single();

    if (insertError || !row) throw new Error('Erro ao salvar o post na biblioteca.');
    return postFromRow(row);
  },

  /**
   * Exclui um post e seu arquivo no Storage.
   * Exclusão sempre explícita — nunca automática.
   */
  async deletePost(post: ProductPost): Promise<void> {
    // Remover do Storage
    await supabase.storage.from(BUCKET).remove([post.imageStoragePath]);

    // Remover registro
    const { error } = await supabase.from('product_posts').delete().eq('id', post.id);
    if (error) throw error;
  },

  /** Exporta o label formatado do formato. */
  formatLabel(format: ProductPostFormat): string {
    return productPostFormatLabel[format];
  },

  /** Detecta automaticamente o formato a partir do arquivo antes do upload. */
  validateImageRatio,
};
