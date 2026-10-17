import { supabase } from '@/pages/utils/supabaseConfig';
import { MarketingTemplate } from '../types';
import { LEGACY_TEMPLATES } from './legacyTemplates';
import { compositionTemplate } from './compositionDefaults';
import { decodeTemplateLayers, encodeTemplateLayers } from './templateMetadata';
import { marketingTemplateFormSchema, marketingTemplateFormValues } from '../../../../../../../shared-utils/marketingFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

const LOCAL_STORAGE_TEMPLATES_KEY = 'morante_marketing_templates_v1';
const canonicalJson = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
function localTemplates(): MarketingTemplate[] {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function mergeTemplates(remote: MarketingTemplate[]) {
  const merged = new Map<string, MarketingTemplate>();
  for (const item of [...SYSTEM_DEFAULT_TEMPLATES, ...remote, ...localTemplates()]) {
    const previous = merged.get(item.id);
    if (!previous || String(item.updatedAt) >= String(previous.updatedAt))
      merged.set(item.id, item);
  }
  return [...merged.values()];
}

export const SYSTEM_DEFAULT_TEMPLATES = [compositionTemplate, ...LEGACY_TEMPLATES];

export const templateService = {
  cache(template: MarketingTemplate, options?: { confirm?: boolean }) {
    if (options?.confirm) {
      const raw = localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY);
      if (raw && !Array.isArray(JSON.parse(raw))) throw new Error('O histórico local de templates não foi confirmado.');
    }
    const current = localTemplates();
    const previous = current.find((t) => t.id === template.id);
    if (previous && previous.updatedAt > template.updatedAt) {
      if (options?.confirm) throw new Error('Há um template mais recente salvo neste navegador.');
      return;
    }
    const serialized = JSON.stringify([...current.filter((t) => t.id !== template.id), template]);
    localStorage.setItem(LOCAL_STORAGE_TEMPLATES_KEY, serialized);
    if (options?.confirm && localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY) !== serialized) throw new Error('O template não foi confirmado neste navegador.');
  },
  async getAll(): Promise<MarketingTemplate[]> {
    try {
      const result = await withTimeout(supabase
        .from('marketing_templates')
        .select('*')
        .order('created_at', { ascending: false }), 15_000, null, 'Consultar templates');
      const { data, error } = result || { data: null, error: null };

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
          updatedAt: t.updated_at,
          persistedRemotely: true,
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

  async save(
    template: Omit<MarketingTemplate, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      updatedAt?: string;
    }, options?: { confirm?: boolean; isCurrent?: () => boolean },
  ): Promise<MarketingTemplate> {
    if (options?.confirm) template = marketingTemplateFormSchema.parse(marketingTemplateFormValues(template));
    if (options?.isCurrent && !options.isCurrent()) throw Object.assign(new Error('O contexto do template mudou.'), { knownFailure: true });
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
      updatedAt: now,
    };

    if (options?.confirm) {
      newTpl.persistedRemotely = false;
      let localSaved = false;
      try { this.cache(newTpl, { confirm: true }); localSaved = true; } catch { /* O recibo remoto ainda pode confirmar a operação. */ }
      const payload = { id: newTpl.id, name: newTpl.name, aspect_ratio: newTpl.aspectRatio, target_width: newTpl.targetWidth, target_height: newTpl.targetHeight, campaign_id: newTpl.campaignId, layers_json: encodeTemplateLayers(newTpl.layers, newTpl.editorSettings, newTpl.layouts), background_color: newTpl.backgroundColor, is_default: newTpl.isDefault, updated_at: now };
      let result;
      try { result = await withTimeout(supabase.from('marketing_templates').upsert(payload).select().single(), 20_000, null, 'Salvar template'); }
      catch { throw Object.assign(new Error('O servidor não confirmou o template. Confira antes de repetir.'), { uncertain: true, locallySaved: localSaved }); }
      if (!result) throw Object.assign(new Error('O servidor não confirmou o template. Confira antes de repetir.'), { uncertain: true, locallySaved: localSaved });
      if (result.error) {
        const knownFailure = /^(22|23|42)/.test(result.error.code || '') || /^PGRST20[0-5]$/.test(result.error.code || '');
        if (!knownFailure) throw Object.assign(new Error('O servidor não confirmou o template. Confira antes de repetir.'), { uncertain: true, locallySaved: localSaved });
        if (!localSaved) throw Object.assign(new Error('O template não foi salvo no servidor nem neste navegador.'), { knownFailure: true });
        if (options.isCurrent && !options.isCurrent()) throw Object.assign(new Error('O contexto mudou durante o salvamento.'), { knownFailure: true });
        return newTpl;
      }
      const row = result.data;
      if (!row || !Object.entries(payload).every(([key, value]) => key === 'updated_at' ? Date.parse(row[key]) === Date.parse(String(value)) : canonicalJson(row[key]) === canonicalJson(value))) throw Object.assign(new Error('O recibo não corresponde ao template enviado.'), { uncertain: true, locallySaved: localSaved });
      if (options.isCurrent && !options.isCurrent()) throw Object.assign(new Error('O contexto mudou durante o salvamento.'), { uncertain: true });
      newTpl.persistedRemotely = true;
      try { this.cache(newTpl, { confirm: true }); } catch { /* O recibo remoto permanece válido. */ }
      return newTpl;
    }
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
        updated_at: now,
      });
      newTpl.persistedRemotely = !error;
    } catch (e) {
      newTpl.persistedRemotely = false;
      console.warn('[templateService] Erro ao salvar no Supabase:', e);
    }

    this.cache(newTpl);

    return newTpl;
  },
};
