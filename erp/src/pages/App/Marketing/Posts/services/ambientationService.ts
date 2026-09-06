import { supabase } from '@/pages/utils/supabaseConfig';
import { AmbientedImageRecord } from '../types';

const LOCAL_STORAGE_AMBIENTED_KEY = 'morante_ambiented_images_v1';

export const ambientationService = {
  async getByProduct(productId: string): Promise<AmbientedImageRecord[]> {
    try {
      const { data, error } = await supabase
        .from('marketing_ambiented_images')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          variationId: item.variation_id,
          originalImageUrl: item.original_image_url,
          ambientedImageUrl: item.ambiented_image_url,
          promptUsed: item.prompt_used,
          createdAt: item.created_at
        }));
      }
    } catch (e) {
      console.warn('[ambientationService] Erro ao buscar imagens ambientadas no Supabase:', e);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AMBIENTED_KEY);
      if (stored) {
        const parsed: AmbientedImageRecord[] = JSON.parse(stored);
        return parsed.filter(item => item.productId === productId);
      }
    } catch (e) {
      console.error('[ambientationService] Erro ao ler LocalStorage:', e);
    }

    return [];
  },

  async saveAmbientedImage(record: Omit<AmbientedImageRecord, 'id' | 'createdAt'>): Promise<AmbientedImageRecord> {
    const newRecord: AmbientedImageRecord = {
      id: `amb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: record.productId,
      variationId: record.variationId || null,
      originalImageUrl: record.originalImageUrl,
      ambientedImageUrl: record.ambientedImageUrl,
      promptUsed: record.promptUsed,
      createdAt: new Date().toISOString()
    };

    try {
      await supabase.from('marketing_ambiented_images').insert({
        id: newRecord.id,
        product_id: newRecord.productId,
        variation_id: newRecord.variationId,
        original_image_url: newRecord.originalImageUrl,
        ambiented_image_url: newRecord.ambientedImageUrl,
        prompt_used: newRecord.promptUsed,
        created_at: newRecord.createdAt
      });
    } catch (e) {
      console.warn('[ambientationService] Salvando imagem ambientada em fallback local:', e);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AMBIENTED_KEY);
      const parsed: AmbientedImageRecord[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem(LOCAL_STORAGE_AMBIENTED_KEY, JSON.stringify([newRecord, ...parsed]));
    } catch (e) {
      console.error('[ambientationService] Erro ao salvar LocalStorage:', e);
    }

    return newRecord;
  },

  async generateAmbientationPrompt(productName: string, categoryName?: string): Promise<string> {
    const category = categoryName || 'móvel residencial';
    return `Fotografia publicitária de estúdio para catálogo de interiores. O produto principal é um ${productName} (${category}). Crie um ambiente de fundo ultra-realista, acolhedor, moderno e bem iluminado (sala ou quarto de alto padrão), harmonizado com as cores do produto. PRESERVE 100% O PRODUTO ORIGINAL SEM ALTERAR FORMATO, ESTRUTURA, CORES OU DETALHES.`;
  }
};
