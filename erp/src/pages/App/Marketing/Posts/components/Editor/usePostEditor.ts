import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { postProductQueryFormSchema, postPreviewProductFormSchema, postEditorCampaignFormSchema, postCompositionFormSchema } from '../../../../../../../../shared-utils/postEditorFormSchemas';
import { fetchProductsPage, getFullProduct } from '@/pages/utils/productService';
import { Product } from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { Layer, MarketingTemplate, MarketingCampaign, MarketingAsset } from '../../types';
import { compositionTemplate } from '../../services/compositionDefaults';
import { composeWithAi } from '../../services/compositionAi';
import { templateService } from '../../services/templateService';
import { postProduct } from '../../services/postProduct';
import { detectImageSubjectBounds } from '../../services/imageSubjectBounds';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { marketingTemplateFormSchema, marketingTemplateFormValues } from '../../../../../../../../shared-utils/marketingFormSchemas';

const defaultPreviewProductKey = 'morante_post_creator_default_preview_product_id';

export function usePostEditor() {
  const [products, setProducts] = useState<Product[]>([]),
    [product, setProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [template, setTemplate] = useState(compositionTemplate),
    [layers, setLayers] = useState<Layer[]>(compositionTemplate.layers);
  const [selected, setSelected] = useState<string | null>(null),
    [overrides, setOverrides] = useState<Record<string, string>>({});
  const [slogan, setSlogan] = useState(''),
    [busy, setBusy] = useState(''),
    [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<
    Array<{ id: string; name: string; slug?: string; image_url?: string }>
  >([]);
  const revision = useRef(0), active = useRef(true), inFlight = useRef(false), saveUncertain = useRef(false), attemptId = useRef<string | undefined>(undefined);
  const { user } = useAuth();
  const actor = useRef({ id: user?.id }); if (actor.current.id !== user?.id) actor.current = { id: user?.id };
  const actorScope = actor.current;
  const currentActor = () => active.current && actor.current === actorScope;
  const [listLoading, setListLoading] = useState(false);
  const templateForm = useZodForm(marketingTemplateFormSchema, marketingTemplateFormValues({ ...template, layers }));
  const { enqueueAndRun: queryProducts } = useZodForm(postProductQueryFormSchema, { search, page });
  const { enqueueAndRun: chooseProduct } = useZodForm(postPreviewProductFormSchema, { id: '' });
  const campaignForm = useZodForm(postEditorCampaignFormSchema, { id: '', name: '' });
  const compositionForm = useZodForm(postCompositionFormSchema, { product: { name: '', price: '' }, layers: layers.map((layer) => ({ ...layer })), aspectRatio: template.aspectRatio });
  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => { if (currentActor()) setMessage(Object.values(flattenFormErrors(errors))[0]); };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let alive = true;
    setListLoading(true);
    const timer = setTimeout(() => {
      void queryProducts({ page, search }, async (values) => {
        if (!alive || !active.current || actor.current !== actorScope || !actorScope.id) return false;
        const result = await withTimeout(fetchProductsPage(values.page, 30, { activeOnly: true, isDraft: false, search: values.search }), 15_000, null, 'Buscar produtos de prévia');
        if (!alive || !active.current || actor.current !== actorScope) return false;
        if (!result || !Array.isArray(result.data) || !Number.isFinite(result.total)) throw new Error('A busca de produtos não foi confirmada. Tente novamente.');
        setProducts((current) => values.page === 1 ? result.data : [...current, ...result.data.filter((item) => !current.some((existing) => existing.id === item.id))]);
        setTotal(result.total); return true;
      }, (errors) => { if (alive && active.current && actor.current === actorScope) setMessage(Object.values(flattenFormErrors(errors))[0]); }).catch((error) => {
        if (alive && active.current && actor.current === actorScope) setMessage(error instanceof Error ? error.message : 'A busca não foi confirmada.');
      }).finally(() => { if (alive && active.current && actor.current === actorScope) setListLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [page, search, queryProducts, actorScope]);
  const selectProductCurrent = useRef<(id: string) => Promise<boolean | undefined>>(async () => false);
  useEffect(() => {
    setProduct(null); setProducts([]); setTotal(0); setOverrides({}); setLayers(compositionTemplate.layers); setTemplate(compositionTemplate); setCampaign(null); setMessage(''); setSlogan(''); setLoading(false);
    revision.current++; saveUncertain.current = false; attemptId.current = undefined;
    if (!actorScope.id) return;
    let alive = true;
    void withTimeout(supabase.from('opportunities').select('*').eq('active', true), 15_000, null, 'Consultar oportunidades do editor').then((result) => {
      if (alive && active.current && actor.current === actorScope) {
        if (!result || result.error || !Array.isArray(result.data)) { setMessage('A consulta das oportunidades não foi confirmada.'); return; }
        setOpportunities(result.data);
      }
    }).catch(() => { if (alive && active.current && actor.current === actorScope) setMessage('A consulta das oportunidades não foi confirmada.'); });
    try { const savedProductId = localStorage.getItem(defaultPreviewProductKey); if (savedProductId) void selectProductCurrent.current(savedProductId); } catch { setMessage('A preferência de produto não está disponível neste navegador.'); }
    return () => { alive = false; };
  }, [actorScope]);
  const opportunity = opportunities.find((o) => o.id === product?.opportunityId);
  const data = product ? postProduct(product, overrides) : null;
  useEffect(() => {
    if (!opportunity) return;
    const queima = /queima|salvados/i.test(opportunity.name || opportunity.slug || '');
    setLayers((current) =>
      current.map((l) =>
        l.role === 'badge' && !l.opportunityId
          ? {
              ...l,
              opportunityId: opportunity.id,
              assetId: opportunity.id,
              visible: !!opportunity.image_url || queima,
              assetUrl: queima ? '/assets/queima-salvados-original.png' : opportunity.image_url,
            }
          : l
      )
    );
  }, [opportunity]);
  function resetContent() {
    revision.current++;
    setLoading(false);
    setSlogan('');
    setMessage('');
  }
  async function selectProduct(id: string): Promise<boolean | undefined> {
    if (inFlight.current) { setMessage('Aguarde a operação do editor.'); return false; }
    resetContent();
    const version = revision.current, current = () => currentActor() && revision.current === version;
    setLoading(true);
    try {
      return await chooseProduct({ id }, async (values) => {
        if (!current() || !actorScope.id) return false;
        if (!values.id) {
          localStorage.removeItem(defaultPreviewProductKey);
          if (localStorage.getItem(defaultPreviewProductKey) !== null) throw new Error('A preferência de produto não foi removida.');
          setProduct(null); setOverrides({}); return true;
        }
        const full = await withTimeout(getFullProduct(values.id), 20_000, null, 'Selecionar produto de prévia');
        if (!current()) return false;
        if (!full || full.id !== values.id) throw new Error('O produto selecionado não foi confirmado.');
        const subjectBounds = await withTimeout(detectImageSubjectBounds(postProduct(full).mainImageUrl), 10_000, undefined, 'Conferir foto do produto');
        if (!current()) return false;
        const opp = opportunities.find((item) => item.id === full.opportunityId);
        const queima = /queima|salvados/i.test(opp?.name || opp?.slug || '');
        let nextTemplate: MarketingTemplate | undefined;
        if (campaign) {
          const items = await withTimeout(templateService.getAll(), 20_000, null, 'Consultar template do produto');
          if (!current()) return false;
          if (!Array.isArray(items)) throw new Error('A consulta do template não foi confirmada.');
          nextTemplate = items.filter((item) => item.campaignId === campaign.id && !item.name.startsWith('@element/') && item.layers.some((layer) => layer.role === 'badge' && layer.opportunityId === full.opportunityId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        }
        if (nextTemplate && !marketingTemplateFormSchema.safeParse(marketingTemplateFormValues(nextTemplate)).success) throw new Error('O template salvo possui campos inválidos.');
        localStorage.setItem(defaultPreviewProductKey, values.id);
        if (localStorage.getItem(defaultPreviewProductKey) !== values.id) throw new Error('O produto de prévia não foi salvo neste navegador.');
        setProduct(full); setOverrides({});
        if (nextTemplate) { setTemplate(nextTemplate); setLayers(nextTemplate.layers); }
        else setLayers((currentLayers) => currentLayers.map((layer) => {
          if (layer.role === 'main' && subjectBounds) return { ...layer, subjectBounds };
          if (layer.role === 'badge' && !(layer.opportunityId && layer.opportunityId === full.opportunityId)) return { ...layer, visible: Boolean(opp && (opp.image_url || queima)), opportunityId: opp?.id, assetUrl: queima ? '/assets/queima-salvados-original.png' : opp?.image_url, assetId: opp?.id || '', modelId: undefined };
          return layer;
        }));
        return true;
      }, invalid);
    } catch (error) { if (current()) setMessage(error instanceof Error ? error.message : 'Não foi possível selecionar o produto.'); return false; }
    finally { if (current()) setLoading(false); }
  }
  selectProductCurrent.current = selectProduct;
  async function selectTemplate(next: MarketingTemplate) {
    if (inFlight.current) return false;
    return templateForm.validateAndRun(marketingTemplateFormValues(next), (values) => {
      if (!currentActor()) return false;
      resetContent(); setTemplate(values as MarketingTemplate); setLayers(values.layers as Layer[]); return true;
    }, invalid);
  }
  async function selectCampaign(next: MarketingCampaign) {
    if (inFlight.current) return false;
    resetContent(); const version = revision.current, current = () => currentActor() && version === revision.current;
    setLoading(true);
    try { return await campaignForm.validateAndRun({ id: next.id, name: next.name }, async (values) => {
      if (!current()) return false;
      const items = await withTimeout(templateService.getAll(), 20_000, null, 'Consultar templates da campanha');
      if (!current()) return false;
      if (!Array.isArray(items)) throw new Error('Os templates da campanha não foram confirmados.');
      const latest = items.filter((item) => item.campaignId === values.id && !item.name.startsWith('@element/')).sort((a, b) => Number(b.layers.some((layer) => layer.role === 'badge' && layer.opportunityId === product?.opportunityId)) - Number(a.layers.some((layer) => layer.role === 'badge' && layer.opportunityId === product?.opportunityId)) || b.updatedAt.localeCompare(a.updatedAt))[0];
      if (latest) { const parsed = marketingTemplateFormSchema.safeParse(marketingTemplateFormValues(latest)); if (!parsed.success) throw new Error('O template da campanha possui campos inválidos.'); setTemplate(latest); setLayers(latest.layers); }
      setCampaign({ ...next, ...values }); return true;
    }, invalid); } catch (error) { if (current()) setMessage(error instanceof Error ? error.message : 'Não foi possível selecionar a campanha.'); return false; }
    finally { if (current()) setLoading(false); }
  }
  async function run(kind: 'layout') {
    if (!data || inFlight.current || !actorScope.id) return null;
    inFlight.current = true; setBusy(kind); setMessage(''); const version = revision.current, current = () => currentActor() && version === revision.current;
    try { return await compositionForm.validateAndRun({ product: data, layers: layers.map((layer) => layer.role === 'badge' && (!opportunity || (layer.opportunityId && layer.opportunityId !== opportunity.id)) ? { ...layer, visible: false } : { ...layer }), aspectRatio: template.aspectRatio }, async (values) => {
      if (!current()) return null;
      const result = await withTimeout(composeWithAi(values.product, values.layers as Layer[], values.aspectRatio), 90_000, null, 'Compor layout');
      if (!current()) return null;
      if (!result) throw new Error('A composição não foi confirmada. Tente novamente.');
      const parsed = marketingTemplateFormSchema.safeParse(marketingTemplateFormValues({ ...template, layers: result.layers }));
      if (!parsed.success || !result.validation.valid || typeof result.slogan !== 'string') throw new Error('A composição recebida não é válida.');
      setLayers(result.layers); setSlogan(result.slogan); setMessage('Layout válido ✓ Score: ' + result.validation.score + '/100' + (result.repaired ? ' (reparado automaticamente)' : '')); return result;
    }, invalid); } catch (error) { if (current()) setMessage(error instanceof Error ? error.message : 'Não foi possível compor o layout.'); return null; }
    finally { inFlight.current = false; if (active.current) setBusy(''); }
  }
  async function save() {
    if (inFlight.current || !actorScope.id) return false;
    if (saveUncertain.current) { setMessage('Há um template sem confirmação no servidor. Confira antes de repetir.'); return false; }
    inFlight.current = true;
    const name = window.prompt('Nome deste template de campanha:', campaign?.name || 'Meu template');
    if (name === null) { inFlight.current = false; return false; }
    attemptId.current ||= crypto.randomUUID(); setBusy('save'); setMessage('');
    const version = revision.current, current = () => currentActor() && revision.current === version;
    let writing = false;
    try { return await templateForm.validateAndRun(marketingTemplateFormValues({ ...template, id: attemptId.current, name, campaignId: campaign?.id, layers, isDefault: false, updatedAt: new Date().toISOString() }), async (values) => {
      if (!current()) return false;
      writing = true;
      const saved = await withTimeout(templateService.save(values, { confirm: true, isCurrent: current }), 25_000, null, 'Confirmar template do editor');
      if (!current()) return false;
      if (!saved || saved.id !== values.id || saved.name !== values.name || saved.campaignId !== (values.campaignId || null) || typeof saved.persistedRemotely !== 'boolean') throw Object.assign(new Error('O template salvo não foi confirmado.'), { uncertain: true });
      setTemplate(saved); attemptId.current = undefined;
      setMessage(saved.persistedRemotely ? 'Template salvo.' : 'Template salvo somente neste navegador. O servidor recusou o salvamento.'); return true;
    }, invalid); } catch (error) {
      if (currentActor()) { if (writing && (!error || typeof error !== 'object' || !('knownFailure' in error) || !error.knownFailure)) saveUncertain.current = true; setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o template.'); } return false;
    } finally { inFlight.current = false; if (active.current) setBusy(''); }
  }
  function addAsset(asset: MarketingAsset) {
    const role =
      asset.category === 'CAMPAIGN_BADGE'
        ? 'badge'
        : asset.category === 'PAYMENT'
          ? 'installment'
          : asset.category === 'BRAND'
            ? 'brand'
            : undefined;
    const target = layers.find((l) => l.role === role && role);
    const layer: Layer = {
      ...(target || {
        x: 0.6,
        y: 0.05,
        width: 0.35,
        height: 0.25,
        rotation: 0,
        zIndex: 6,
        locked: false,
        opacity: 1,
      }),
      id: target?.id || crypto.randomUUID(),
      type: 'ASSET',
      role,
      name: asset.name,
      visible: true,
      assetId: asset.id,
      assetUrl: asset.fileUrl,
      opportunityId: role === 'badge' ? opportunity?.id : undefined,
    };
    setLayers((current) =>
      target ? current.map((l) => (l.id === target.id ? layer : l)) : [...current, layer]
    );
    setSelected(layer.id);
  }
  return {
    products,
    product,
    selectProduct,
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    page,
    setPage,
    total,
    campaign,
    selectCampaign,
    template,
    selectTemplate,
    layers,
    setLayers: (value: React.SetStateAction<Layer[]>) => {
      revision.current++;
      setLoading(false);
      setLayers(value);
    },
    selected,
    setSelected,
    slogan,
    loading: loading || listLoading,
    setSlogan: (value: string) => {
      revision.current++;
      setSlogan(value);
    },
    busy,
    message,
    setMessage,
    data,
    opportunity,
    run,
    save,
    addAsset,
    setPhoto: (id: string, url: string) => {
      resetContent();
      setOverrides((v) => ({ ...v, [id]: url }));
    },
  };
}
