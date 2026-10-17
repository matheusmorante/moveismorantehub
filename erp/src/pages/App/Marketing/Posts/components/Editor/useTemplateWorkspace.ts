import { useEffect, useRef, useState, SetStateAction } from 'react';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import {
  Layer,
  MarketingCampaign,
  MarketingTemplate,
  PostLayoutFormat,
  TemplateEditorSettings,
  TemplateLayout,
} from '../../types';
import { compositionTemplate } from '../../services/compositionDefaults';
import { templateService } from '../../services/templateService';
import { nextTemplateTimestamp, scheduleTemplateSave } from '../../services/templateAutosave';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { marketingTemplateFormSchema, marketingTemplateFormValues } from '../../../../../../../../shared-utils/marketingFormSchemas';
import { composeLayout } from '../../services/compositionLayoutEngine';

export type TemplateFormat = PostLayoutFormat;
const size = (format: TemplateFormat) =>
  format === '4:5'
    ? { targetWidth: 1080, targetHeight: 1350 }
    : { targetWidth: 1080, targetHeight: 1920 };
function copyLayer(layer: Layer, format: TemplateFormat): Layer {
  if (format !== '9:16') return { ...layer };
  const regions: Partial<Record<NonNullable<Layer['role']>, Layer['preferredRegion']>> = {
    main: 'CENTER',
    title: 'BOTTOM_CENTER',
    oldPrice: 'BOTTOM_CENTER',
    price: 'BOTTOM_CENTER',
    installment: 'BOTTOM_CENTER',
    gallery: 'BOTTOM_CENTER',
    productSlogan: 'BOTTOM_LEFT',
    storeSlogan: 'BOTTOM_RIGHT',
  };
  const role = layer.role;
  return {
    ...layer,
    preferredRegion: role ? regions[role] || layer.preferredRegion : layer.preferredRegion,
    ...(layer.role === 'badge' ? { preferredSize: 'medium' as const } : {}),
  };
}
function initialLayout(
  format: TemplateFormat,
  source = compositionTemplate.layers
): TemplateLayout {
  return {
    aspectRatio: format,
    ...size(format),
    layers: composeLayout(
      source.map((layer) => copyLayer(layer, format)),
      format
    ),
  };
}
function normalize(template: MarketingTemplate): MarketingTemplate {
  const legacy = initialLayout(template.aspectRatio === '9:16' ? '9:16' : '4:5', template.layers);
  const layouts = {
    '4:5':
      template.layouts?.['4:5'] || (legacy.aspectRatio === '4:5' ? legacy : initialLayout('4:5')),
    '9:16':
      template.layouts?.['9:16'] ||
      (legacy.aspectRatio === '9:16' ? legacy : initialLayout('9:16', legacy.layers)),
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
  const current = useRef(''), active = useRef(true), uncertain = useRef(new Set<string>());
  const [reloadVersion, setReloadVersion] = useState(0);
  const { user } = useAuth();
  const source = useRef({ userId: user?.id, campaignId: campaign?.id });
  if (source.current.userId !== user?.id || source.current.campaignId !== campaign?.id) source.current = { userId: user?.id, campaignId: campaign?.id };
  const scope = source.current;
  const campaignSource = useRef(campaign); campaignSource.current = campaign;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const { enqueueAndRun: validateTemplate } = useZodForm(marketingTemplateFormSchema, marketingTemplateFormValues(compositionTemplate));
  useEffect(() => {
    let alive = true;
    setLoading(true); setState(null);
    current.current = '';
    const currentScope = () => alive && active.current && source.current === scope;
    if (!scope.userId) { setLoading(false); setStatus('Aguarde a confirmação da sessão.'); return; }
    const selectedCampaign = campaignSource.current;
    setStatus('Carregando template…');
    void withTimeout(templateService.getAll(), 20_000, null, 'Carregar espaço de templates')
      .then((items) => {
        if (!currentScope()) return;
        if (!Array.isArray(items)) throw new Error('A consulta do template não foi confirmada.');
        const found = items
          .filter(
            (t) =>
              !t.isDefault &&
              !t.name.startsWith('@element/') &&
              (t.campaignId || null) === (scope.campaignId || null)
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        const value = normalize(
          found || {
            ...compositionTemplate,
            id: crypto.randomUUID(),
            name: selectedCampaign?.name || 'Produto promocional',
            campaignId: scope.campaignId,
            isDefault: false,
            editorSettings: {},
            layouts: { '4:5': initialLayout('4:5'), '9:16': initialLayout('9:16') },
          }
        );
        if (!marketingTemplateFormSchema.safeParse(marketingTemplateFormValues(value)).success) throw new Error('O template carregado possui campos inválidos.');
        setState({ value, dirty: false });
        setLoading(false);
        setStatus(
          found?.persistedRemotely === false
            ? 'Salvo neste navegador. Sincronização com o servidor indisponível.'
            : 'Salvamento automático ativo.'
        );
      })
      .catch((error) => { if (currentScope()) setStatus(error instanceof Error ? error.message : 'Não foi possível carregar o template.'); })
      .finally(() => { if (currentScope()) setLoading(false); });
    return () => {
      alive = false;
    };
  }, [scope, reloadVersion]);
  useEffect(() => {
    if (!state?.dirty || loading) return;
    const version = state.value.id + ':' + state.value.updatedAt;
    current.current = version;
    const currentScope = () => active.current && source.current === scope;
    return scheduleTemplateSave(state.value, async (snapshot) => {
      if (!currentScope()) return false;
      if (uncertain.current.has(snapshot.id)) throw new Error('Há um salvamento de template sem confirmação. Confira antes de repetir.');
      try { return await validateTemplate(marketingTemplateFormValues(snapshot), async (values) => {
        if (!currentScope()) return false;
        const saved = await withTimeout(templateService.save(values, { confirm: true, isCurrent: currentScope }), 25_000, null, 'Confirmar autosave do template');
        if (!currentScope()) return false;
        if (!saved || saved.id !== values.id || saved.updatedAt !== values.updatedAt || typeof saved.persistedRemotely !== 'boolean') throw Object.assign(new Error('O autosave do template não foi confirmado. Confira antes de repetir.'), { uncertain: true });
        return saved;
      }, (errors) => { if (currentScope() && current.current === version) setStatus(Object.values(flattenFormErrors(errors))[0]); }); }
      catch (error) { if (currentScope() && error && typeof error === 'object' && 'uncertain' in error && error.uncertain) uncertain.current.add(snapshot.id); throw error; }
    }, (message) => { if (currentScope() && current.current === version) setStatus(message); }, currentScope);
  }, [state, loading, validateTemplate, scope]);

  function change(update: (value: MarketingTemplate) => MarketingTemplate) {
    if (loading || !active.current || source.current !== scope || !scope.userId) return;
    setState((previous) => {
      if (!previous) return previous;
      const before = activeTemplate(previous.value, format);
      const after = update(before);
      const layout: TemplateLayout = {
        aspectRatio: format,
        targetWidth: after.targetWidth,
        targetHeight: after.targetHeight,
        layers: after.layers,
      };
      const value = {
        ...previous.value,
        editorSettings: after.editorSettings,
        layouts: { ...previous.value.layouts, [format]: layout },
        updatedAt: nextTemplateTimestamp(),
      };
      return { value, dirty: true };
    });
  }
  const canonical = state?.value || normalize(compositionTemplate);
  return {
    template: activeTemplate(canonical, format),
    canonicalTemplate: canonical,
    loading,
    status,
    reload: () => setReloadVersion((version) => version + 1),
    retrySave: () => setState((previous) => previous ? { ...previous, dirty: true, value: { ...previous.value, updatedAt: nextTemplateTimestamp() } } : previous),
    setLayers: (value: SetStateAction<Layer[]>) =>
      change((t) => ({ ...t, layers: typeof value === 'function' ? value(t.layers) : value })),
    setSettings: (patch: Partial<TemplateEditorSettings>) =>
      change((t) => ({ ...t, editorSettings: { ...t.editorSettings, ...patch } })),
    copyLayoutFrom: (source: TemplateFormat) => {
      if (source === format) return;
      const sourceLayers = canonical.layouts?.[source]?.layers || [];
      change((t) => ({ ...t, layers: sourceLayers.map((layer) => copyLayer(layer, format)) }));
    },
  };
}
