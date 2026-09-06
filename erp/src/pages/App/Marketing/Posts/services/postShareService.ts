/**
 * postShareService — Gerenciamento de tokens de compartilhamento de posts para IA.
 *
 * Regras de negócio:
 * - Um produto possui no máximo um share ativo padrão.
 * - Novo clique reutiliza o link existente (não cria token novo).
 * - Ação "Regenerar link" revoga o anterior e cria outro.
 * - Tokens são de alta entropia, não enumeráveis, revogáveis.
 * - O link é público (somente leitura); NUNCA expor dados privados no payload.
 */

import { supabase } from '@/pages/utils/supabaseConfig';
import { PostShareToken } from '../types/postSpecification';

const CATALOG_BASE_URL = 'https://www.moveismorante.com.br';

const now = () => new Date().toISOString();

function tokenFromRow(row: any): PostShareToken {
  return {
    id: row.id,
    productId: row.product_id,
    variationId: row.variation_id ?? null,
    token: row.token,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const postShareService = {
  /**
   * Retorna o token de compartilhamento ativo do produto,
   * ou cria um novo se ainda não existir.
   * Não gera token novo a cada clique.
   */
  async getOrCreateToken(productId: string, variationId?: string | null): Promise<PostShareToken> {
    // Tentar reutilizar token ativo existente
    const { data: existing } = await supabase
      .from('post_share_tokens')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .maybeSingle();

    if (existing) return tokenFromRow(existing);

    // Criar novo token
    const { data: created, error } = await supabase
      .from('post_share_tokens')
      .insert({
        product_id: productId,
        variation_id: variationId ?? null,
        active: true,
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();

    if (error || !created) throw new Error('Não foi possível criar o token de compartilhamento.');
    return tokenFromRow(created);
  },

  /**
   * Revoga o token ativo e cria um novo (ação administrativa "Regenerar link").
   */
  async regenerateToken(productId: string, variationId?: string | null): Promise<PostShareToken> {
    // Revogar todos os tokens ativos do produto
    await supabase
      .from('post_share_tokens')
      .update({ active: false, updated_at: now() })
      .eq('product_id', productId)
      .eq('active', true);

    // Criar novo token
    const { data: created, error } = await supabase
      .from('post_share_tokens')
      .insert({
        product_id: productId,
        variation_id: variationId ?? null,
        active: true,
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();

    if (error || !created) throw new Error('Não foi possível regenerar o token de compartilhamento.');
    return tokenFromRow(created);
  },

  /**
   * Resolve um token público — retorna os dados necessários para
   * montar a especificação sem informações privadas.
   * Retorna null se o token for inválido ou revogado.
   */
  async resolveToken(token: string): Promise<PostShareToken | null> {
    const { data } = await supabase
      .from('post_share_tokens')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();

    return data ? tokenFromRow(data) : null;
  },

  /**
   * Monta a URL pública de compartilhamento a partir do token.
   */
  buildShareUrl(token: string): string {
    return `${CATALOG_BASE_URL}/share/post-instructions/${token}`;
  },

  /**
   * Obtém o token e retorna a URL pública pronta para copiar.
   * Fluxo completo usado no botão "Copiar instruções para IA".
   */
  async getOrCreateShareUrl(productId: string, variationId?: string | null): Promise<string> {
    const shareToken = await this.getOrCreateToken(productId, variationId);
    return this.buildShareUrl(shareToken.token);
  },
};
