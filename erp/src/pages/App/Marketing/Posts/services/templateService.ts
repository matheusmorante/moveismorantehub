import { supabase } from '@/pages/utils/supabaseConfig';
import { MarketingTemplate } from '../types';
import { LEGACY_TEMPLATES } from './legacyTemplates';
import { compositionTemplate } from './compositionDefaults';
import { decodeTemplateLayers, encodeTemplateLayers } from './templateMetadata';

const LOCAL_STORAGE_TEMPLATES_KEY = 'morante_marketing_templates_v1';
function localTemplates(): MarketingTemplate[] {
  try { const value = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function mergeTemplates(remote: MarketingTemplate[]) {
  const merged = new Map<string, MarketingTemplate>();
  for (const item of [...SYSTEM_DEFAULT_TEMPLATES, ...remote, ...localTemplates()]) {
    const previous = merged.get(item.id);
    if (!previous || String(item.updatedAt) >= String(previous.updatedAt)) merged.set(item.id, item);
  }
  return [...merged.values()];
}

export const SYSTEM_DEFAULT_TEMPLATES = [compositionTemplate, ...LEGACY_TEMPLATES];

export const templateService = {
  cache(template: MarketingTemplate) {
    const current = localTemplates();
    const previous = current.find(t => t.id === template.id);
    if (previous && previous.updatedAt > template.updatedAt) return;
    localStorage.setItem(LOCAL_STORAGE_TEMPLATES_KEY, JSON.stringify([...current.filter(t => t.id !== template.id), template]));
  },
  async getAll(): Promise<MarketingTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbTemplates: MarketingTemplate[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          aspectRatio: t.aspect_ratio || '4:5',
          targetWidth: t.target_width || 1080,
          targetHeight: t.target_height || 1350,
          campaignId: t.campaign_id,
          ...decodeTemplateLayers(t.layers_json),
          backgroundColor: t.background_color || '#ffffff',
          isDefault: t.is_default,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        
        return mergeTemplates(dbTemplates);
      }
    } catch (e) {
      console.warn('[templateService] Usando fallback local para templates.', e);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY);
      if (stored) {
        const parsed: MarketingTemplate[] = JSON.parse(stored);
        return mergeTemplates(parsed);
      }
    } catch (e) {
      console.error('[templateService] Erro LocalStorage:', e);
    }

    return mergeTemplates([]);
  },

  async save(template: Omit<MarketingTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; updatedAt?: string }): Promise<MarketingTemplate> {
    const now = template.updatedAt || new Date().toISOString();
    const newTpl: MarketingTemplate = {
      id: template.id || crypto.randomUUID(),
      name: template.name,
      aspectRatio: template.aspectRatio || '4:5',
      targetWidth: template.targetWidth || 1080,
      targetHeight: template.targetHeight || 1350,
      campaignId: template.campaignId || null,
      layers: template.layers || [],
      editorSettings: template.editorSettings,
      layouts: template.layouts,
      backgroundColor: template.backgroundColor || '#ffffff',
      isDefault: template.isDefault || false,
      createdAt: now,
      updatedAt: now
    };

    this.cache(newTpl);
    try {
      const { error } = await supabase.from('marketing_templates').upsert({
        id: newTpl.id,
        name: newTpl.name,
        aspect_ratio: newTpl.aspectRatio,
        target_width: newTpl.targetWidth,
        target_height: newTpl.targetHeight,
        campaign_id: newTpl.campaignId,
        layers_json: encodeTemplateLayers(newTpl.layers, newTpl.editorSettings, newTpl.layouts),
        background_color: newTpl.backgroundColor,
        is_default: newTpl.isDefault,
        updated_at: now
      });
      newTpl.persistedRemotely = !error;
    } catch (e) {
      newTpl.persistedRemotely = false;
      console.warn('[templateService] Erro ao salvar no Supabase:', e);
    }

    this.cache(newTpl);

    return newTpl;
  }
};
