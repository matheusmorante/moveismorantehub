import { supabase } from '@/pages/utils/supabaseConfig';
import { AmbientedImageRecord } from '../types';
import { ambientationRecordFormSchema } from '../../../../../../../shared-utils/marketingFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

const LOCAL_STORAGE_AMBIENTED_KEY = 'morante_ambiented_images_v1';

export const ambientationService = {
  async getByProduct(productId: string): Promise<AmbientedImageRecord[]> {
    try {
      const result = await withTimeout(supabase
        .from('marketing_ambiented_images')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false }), 15_000, null, 'Consultar imagens ambientadas');
      const { data, error } = result || { data: null, error: null };

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          variationId: item.variation_id,
          originalImageUrl: item.original_image_url,
          ambientedImageUrl: item.ambiented_image_url,
          promptUsed: item.prompt_used,
          createdAt: item.created_at,
        }));
      }
    } catch (e) {
      console.warn('[ambientationService] Erro ao buscar imagens ambientadas no Supabase:', e);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AMBIENTED_KEY);
      if (stored) {
        const parsed: AmbientedImageRecord[] = JSON.parse(stored);
        return parsed.filter((item) => item.productId === productId);
      }
    } catch (e) {
      console.error('[ambientationService] Erro ao ler LocalStorage:', e);
    }

    return [];
  },

  async saveAmbientedImage(
    record: Omit<AmbientedImageRecord, 'id' | 'createdAt'> & { id?: string },
    options?: { isCurrent?: () => boolean },
  ): Promise<AmbientedImageRecord & { persistence: 'remote' | 'local' }> {
    const values = ambientationRecordFormSchema.parse({ ...record, id: record.id || crypto.randomUUID() });
    if (options?.isCurrent && !options.isCurrent()) throw Object.assign(new Error('O produto ou a sessão mudou.'), { knownFailure: true });
    const newRecord: AmbientedImageRecord = {
      ...values,
      variationId: values.variationId || null,
      createdAt: new Date().toISOString(),
    };
    let result;
    try {
      result = await withTimeout(supabase.from('marketing_ambiented_images').insert({
        id: newRecord.id,
        product_id: newRecord.productId,
        variation_id: newRecord.variationId,
        original_image_url: newRecord.originalImageUrl,
        ambiented_image_url: newRecord.ambientedImageUrl,
        prompt_used: newRecord.promptUsed ?? null,
        created_at: newRecord.createdAt,
      }).select().single(), 20_000, null, 'Salvar imagem ambientada');
    } catch {
      throw Object.assign(new Error('O salvamento não foi confirmado. Confira antes de repetir.'), { uncertain: true });
    }
    if (!result) throw Object.assign(new Error('O salvamento não foi confirmado. Confira antes de repetir.'), { uncertain: true });
    const localOnly = Boolean(result.error && ['42P01', '42501', 'PGRST205'].includes(result.error.code));
    if (result.error && !localOnly) throw Object.assign(new Error('O salvamento não foi confirmado. Confira antes de repetir.'), { uncertain: true });
    if (!localOnly) {
      const row = result.data;
      if (!row || row.id !== newRecord.id || row.product_id !== newRecord.productId || row.variation_id !== newRecord.variationId || row.original_image_url !== newRecord.originalImageUrl || row.ambiented_image_url !== newRecord.ambientedImageUrl || row.prompt_used !== (newRecord.promptUsed ?? null)) throw Object.assign(new Error('O recibo não corresponde à imagem ambientada.'), { uncertain: true });
    }
    if (options?.isCurrent && !options.isCurrent()) throw Object.assign(new Error('O contexto mudou durante o salvamento.'), localOnly ? { knownFailure: true } : { uncertain: true });
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AMBIENTED_KEY);
      const parsed: AmbientedImageRecord[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) throw new Error('Histórico local inválido.');
      const serialized = JSON.stringify([newRecord, ...parsed.filter((item) => item.id !== newRecord.id)]);
      localStorage.setItem(LOCAL_STORAGE_AMBIENTED_KEY, serialized);
      if (localStorage.getItem(LOCAL_STORAGE_AMBIENTED_KEY) !== serialized) throw new Error('O armazenamento local não confirmou a imagem.');
    } catch {
      if (localOnly) throw Object.assign(new Error('A imagem não foi salva neste navegador. Preserve a prévia e tente novamente.'), { knownFailure: true });
    }
    return { ...newRecord, persistence: localOnly ? 'local' : 'remote' };
  },

  async generateAmbientationPrompt(productName: string, categoryName?: string): Promise<string> {
    const category = categoryName || 'móvel residencial';
    return `Fotografia publicitária de estúdio para catálogo de interiores. O produto principal é um ${productName} (${category}). Crie um ambiente de fundo ultra-realista, acolhedor, moderno e bem iluminado (sala ou quarto de alto padrão), harmonizado com as cores do produto. PRESERVE 100% O PRODUTO ORIGINAL SEM ALTERAR FORMATO, ESTRUTURA, CORES OU DETALHES.`;
  },
};
