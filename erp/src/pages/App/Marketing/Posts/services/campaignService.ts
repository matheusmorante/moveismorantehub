import { supabase } from '@/pages/utils/supabaseConfig';
import { MarketingCampaign } from '../types';

const LOCAL_STORAGE_CAMPAIGNS_KEY = 'morante_marketing_campaigns_v1';

export const SYSTEM_DEFAULT_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp-queima-salvados',
    name: 'Queima dos Salvados',
    slug: 'queima-dos-salvados',
    description: 'Promoções especiais de ponta de estoque e saldão com alta qualidade',
    primaryColor: '#dc2626',
    accentColor: '#f59e0b',
    badgeAssetId: 'asset-queima-salvados-badge',
    active: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'camp-natal',
    name: 'Natal de Ofertas',
    slug: 'natal',
    description: 'Campanha de fim de ano com ofertas especiais',
    primaryColor: '#16a34a',
    accentColor: '#dc2626',
    active: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'camp-black-friday',
    name: 'Black Friday',
    slug: 'black-friday',
    description: 'Descontos imperdíveis de Black Friday',
    primaryColor: '#09090b',
    accentColor: '#eab308',
    active: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'camp-oferta-comum',
    name: 'Oferta Especial',
    slug: 'oferta-especial',
    description: 'Campanha padrão para promoções do dia a dia',
    primaryColor: '#173f7a',
    accentColor: '#f4c430',
    active: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const campaignService = {
  async getAll(): Promise<MarketingCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbCampaigns: MarketingCampaign[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          primaryColor: c.primary_color,
          accentColor: c.accent_color,
          badgeAssetId: c.badge_asset_id,
          active: c.active !== false,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
        
        let local: MarketingCampaign[] = [];
        try { const value = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CAMPAIGNS_KEY) || '[]'); if (Array.isArray(value)) local = value; } catch { /* cache ausente */ }
        const merged = new Map([...SYSTEM_DEFAULT_CAMPAIGNS, ...dbCampaigns].map(c => [c.id, c]));
        for (const item of local) if (!merged.has(item.id) || item.updatedAt >= (merged.get(item.id)?.updatedAt || '')) merged.set(item.id, item);
        return [...merged.values()];
      }
    } catch (e) {
      console.warn('[campaignService] Usando fallback local para campanhas.', e);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CAMPAIGNS_KEY);
      if (stored) {
        const parsed: MarketingCampaign[] = JSON.parse(stored);
        const storedIds = new Set(parsed.map(c => c.id));
        return [...SYSTEM_DEFAULT_CAMPAIGNS.filter(c => !storedIds.has(c.id)), ...parsed];
      }
    } catch (e) {
      console.error('[campaignService] Erro LocalStorage:', e);
    }

    return SYSTEM_DEFAULT_CAMPAIGNS;
  },

  async save(campaign: Omit<MarketingCampaign, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MarketingCampaign> {
    const now = new Date().toISOString();
    const newCamp: MarketingCampaign = {
      id: campaign.id || crypto.randomUUID(),
      name: campaign.name,
      slug: campaign.slug || campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: campaign.description,
      primaryColor: campaign.primaryColor || '#173f7a',
      accentColor: campaign.accentColor || '#f4c430',
      badgeAssetId: campaign.badgeAssetId || null,
      active: campaign.active !== false,
      createdAt: now,
      updatedAt: now
    };

    try {
      const { error } = await supabase.from('marketing_campaigns').upsert({
        id: newCamp.id,
        name: newCamp.name,
        slug: newCamp.slug,
        description: newCamp.description,
        primary_color: newCamp.primaryColor,
        accent_color: newCamp.accentColor,
        badge_asset_id: newCamp.badgeAssetId,
        active: newCamp.active,
        updated_at: now
      });
      newCamp.persistedRemotely = !error;
    } catch (e) {
      newCamp.persistedRemotely = false;
      console.warn('[campaignService] Erro ao salvar no Supabase:', e);
    }

    const current = await this.getAll();
    const filtered = current.filter(c => c.id !== newCamp.id && !c.isSystemDefault);
    localStorage.setItem(LOCAL_STORAGE_CAMPAIGNS_KEY, JSON.stringify([...filtered, newCamp]));

    return newCamp;
  }
};
