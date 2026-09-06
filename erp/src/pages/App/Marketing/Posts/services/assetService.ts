import { supabase } from '@/pages/utils/supabaseConfig';
import { MarketingAsset } from '../types';

const LOCAL_STORAGE_ASSETS_KEY = 'morante_marketing_assets_v1';

export const SYSTEM_DEFAULT_ASSETS: MarketingAsset[] = [
  {
    id: 'asset-queima-salvados-badge',
    name: 'Selo 3D - Queima dos Salvados',
    type: 'image/png',
    category: 'CAMPAIGN_BADGE',
    fileUrl: '/assets/queima-salvados-original.png',
    campaignId: null,
    width: 1536,
    height: 1024,
    aspectRatio: 1.5,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'asset-badge-10x-juros',
    name: 'Bandeira 10x Com Juros',
    type: 'image/png',
    category: 'PAYMENT',
    fileUrl: '/images/installment-badge-10x-juros.png',
    width: 400,
    height: 200,
    aspectRatio: 2,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'asset-badge-10x-transparent',
    name: 'Bandeira 10x Sem Juros',
    type: 'image/png',
    category: 'PAYMENT',
    fileUrl: '/images/installment-badge-10x-transparent.png',
    width: 400,
    height: 200,
    aspectRatio: 2,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const assetService = {
  async getAll(): Promise<MarketingAsset[]> {
    try {
      const { data, error } = await supabase
        .from('marketing_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbAssets: MarketingAsset[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          category: item.category,
          fileUrl: item.file_url,
          campaignId: item.campaign_id,
          width: item.width,
          height: item.height,
          aspectRatio: item.aspect_ratio,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        
        // Unir com defaults do sistema sem duplicar
        const customIds = new Set(dbAssets.map(a => a.id));
        const missingDefaults = SYSTEM_DEFAULT_ASSETS.filter(a => !customIds.has(a.id));
        return [...SYSTEM_DEFAULT_ASSETS.filter(a => !customIds.has(a.id)), ...dbAssets];
      }
    } catch (e) {
      console.warn('[assetService] Tabela de assets no Supabase indisponível, usando fallback local.', e);
    }

    // Fallback LocalStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY);
      if (stored) {
        const parsed: MarketingAsset[] = JSON.parse(stored);
        const customIds = new Set(parsed.map(a => a.id));
        return [...SYSTEM_DEFAULT_ASSETS.filter(a => !customIds.has(a.id)), ...parsed];
      }
    } catch (e) {
      console.error('[assetService] Erro ao ler LocalStorage:', e);
    }

    return SYSTEM_DEFAULT_ASSETS;
  },

  async save(asset: Omit<MarketingAsset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MarketingAsset> {
    const now = new Date().toISOString();
    const newAsset: MarketingAsset = {
      id: asset.id || `asset-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: asset.name,
      type: asset.type,
      category: asset.category,
      fileUrl: asset.fileUrl,
      campaignId: asset.campaignId || null,
      width: asset.width || 400,
      height: asset.height || 400,
      aspectRatio: asset.aspectRatio || 1,
      createdAt: now,
      updatedAt: now
    };

    try {
      await supabase.from('marketing_assets').upsert({
        id: newAsset.id,
        name: newAsset.name,
        type: newAsset.type,
        category: newAsset.category,
        file_url: newAsset.fileUrl,
        campaign_id: newAsset.campaignId,
        width: newAsset.width,
        height: newAsset.height,
        aspect_ratio: newAsset.aspectRatio,
        updated_at: now
      });
    } catch (e) {
      console.warn('[assetService] Salvando asset no fallback LocalStorage.', e);
    }

    // Salvar também no LocalStorage
    const current = await this.getAll();
    const filtered = current.filter(a => a.id !== newAsset.id && !a.isSystemDefault);
    localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify([...filtered, newAsset]));

    return newAsset;
  },

  async delete(id: string): Promise<boolean> {
    try {
      await supabase.from('marketing_assets').delete().eq('id', id);
    } catch (e) {
      console.warn('[assetService] Erro ao deletar no Supabase:', e);
    }

    const current = await this.getAll();
    const updated = current.filter(a => a.id !== id && !a.isSystemDefault);
    localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify(updated));
    return true;
  }
};
