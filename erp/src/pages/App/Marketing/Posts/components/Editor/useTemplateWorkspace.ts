import { useEffect, useRef, useState, SetStateAction } from 'react';
import { Layer, MarketingCampaign, MarketingTemplate, PostLayoutFormat, TemplateEditorSettings, TemplateLayout } from '../../types';
import { compositionTemplate } from '../../services/compositionDefaults';
import { templateService } from '../../services/templateService';
import { nextTemplateTimestamp, scheduleTemplateSave } from '../../services/templateAutosave';
import { composeLayout } from '../../services/compositionLayoutEngine';

export type TemplateFormat = PostLayoutFormat;
const size = (format: TemplateFormat) => format === '4:5' ? { targetWidth: 1080, targetHeight: 1350 } : { targetWidth: 1080, targetHeight: 1920 };
function copyLayer(layer: Layer, format: TemplateFormat): Layer {
  if (format !== '9:16') return { ...layer };
  const regions: Partial<Record<NonNullable<Layer['role']>, Layer['preferredRegion']>> = {
    main: 'CENTER', title: 'BOTTOM_CENTER', oldPrice: 'BOTTOM_CENTER', price: 'BOTTOM_CENTER',
    installment: 'BOTTOM_CENTER', gallery: 'BOTTOM_CENTER', productSlogan: 'BOTTOM_LEFT', storeSlogan: 'BOTTOM_RIGHT'
  };
  const role = layer.role;
  return { ...layer, preferredRegion: role ? regions[role] || layer.preferredRegion : layer.preferredRegion,
    ...(layer.role === 'badge' ? { preferredSize: 'medium' as const } : {}) };
}
function initialLayout(format: TemplateFormat, source = compositionTemplate.layers): TemplateLayout {
  return { aspectRatio: format, ...size(format), layers: composeLayout(source.map(layer => copyLayer(layer, format)), format) };
}
function normalize(template: MarketingTemplate): MarketingTemplate {
  const legacy = initialLayout(template.aspectRatio === '9:16' ? '9:16' : '4:5', template.layers);
  const layouts = {
    '4:5': template.layouts?.['4:5'] || (legacy.aspectRatio === '4:5' ? legacy : initialLayout('4:5')),
    '9:16': template.layouts?.['9:16'] || (legacy.aspectRatio === '9:16' ? legacy : initialLayout('9:16', legacy.layers)),
  };
  return { ...template, layouts };
}
function activeTemplate(template: MarketingTemplate, format: TemplateFormat): MarketingTemplate {
  const layout = template.layouts?.[format] || initialLayout(format);
  return { ...template, ...layout };
}
export function useTemplateWorkspace(campaign: MarketingCampaign | null, format: TemplateFormat) {
  const [state, setState] = useState<{ value: MarketingTemplate; dirty: boolean } | null>(null);
  const [status, setStatus] = useState('Carregando template…');
  const [loading, setLoading] = useState(true);
  const current = useRef('');
  useEffect(() => {
    let alive = true; setLoading(true); current.current = ''; setStatus('Carregando template…');
    templateService.getAll().then(items => {
      if (!alive) return;
      const found = items.filter(t => !t.isDefault && !t.name.startsWith('@element/') && (t.campaignId || null) === (campaign?.id || null))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const value = normalize(found || { ...compositionTemplate, id: crypto.randomUUID(), name: campaign?.name || 'Produto promocional',
        campaignId: campaign?.id, isDefault: false, editorSettings: {}, layouts: { '4:5': initialLayout('4:5'), '9:16': initialLayout('9:16') } });
      setState({ value, dirty: false }); setLoading(false);
      setStatus(found?.persistedRemotely === false ? 'Salvo neste navegador. Sincronização com o servidor indisponível.' : 'Salvamento automático ativo.');
    }).catch(() => { if (alive) setStatus('Não foi possível carregar o template.'); });
    return () => { alive = false; };
  }, [campaign?.id]);
  useEffect(() => {
    if (!state?.dirty || loading) return;
    const version = state.value.id + ':' + state.value.updatedAt; current.current = version;
    try { scheduleTemplateSave(state.value, message => { if (current.current === version) setStatus(message); }); }
    catch { setStatus('Não foi possível salvar neste navegador. Libere espaço antes de sair.'); }
  }, [state, loading]);
  function change(update: (value: MarketingTemplate) => MarketingTemplate) {
    if (loading) return;
    setState(previous => {
      if (!previous) return previous;
      const before = activeTemplate(previous.value, format);
      const after = update(before);
      const layout: TemplateLayout = { aspectRatio: format, targetWidth: after.targetWidth, targetHeight: after.targetHeight, layers: after.layers };
      const value = { ...previous.value, layouts: { ...previous.value.layouts, [format]: layout }, updatedAt: nextTemplateTimestamp() };
      return { value, dirty: true };
    });
  }
  const canonical = state?.value || normalize(compositionTemplate);
  return { template: activeTemplate(canonical, format), canonicalTemplate: canonical, loading, status,
    setLayers: (value: SetStateAction<Layer[]>) => change(t => ({ ...t, layers: typeof value === 'function' ? value(t.layers) : value })),
    setSettings: (patch: Partial<TemplateEditorSettings>) => change(t => ({ ...t, editorSettings: { ...t.editorSettings, ...patch } })),
    copyLayoutFrom: (source: TemplateFormat) => {
      if (source === format) return;
      const sourceLayers = canonical.layouts?.[source]?.layers || [];
      change(t => ({ ...t, layers: sourceLayers.map(layer => copyLayer(layer, format)) }));
    }
  };
}
