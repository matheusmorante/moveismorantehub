import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { marketingImageSelectionFormSchema, marketingImageSelectionResetFormSchema } from '../../../../../../shared-utils/marketingFormSchemas';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { campaignRulesFormSchema } from '../../../../../../shared-utils/campaignFormSchemas';
import { postCampaignCommandFormSchema, postCampaignDeleteFormSchema, postCampaignLookupFormSchema, postElementCommandFormSchema } from '../../../../../../shared-utils/postManagerFormSchemas';
import { usePostEditor } from './components/Editor/usePostEditor';
import { CampaignElementsPanel } from './components/CampaignElementsPanel';
import { CampaignManagerModal } from './components/CampaignManagerModal';
import { GeneralCampaignRules } from './components/GeneralCampaignRules';
import { ElementModelDetailsModal } from './components/ElementModelDetailsModal';
import { PostCreatorModelModal } from './components/PostCreatorModelModal';
import { PreviewProductPicker } from './components/PreviewProductPicker';
import { PromptPreview } from './components/PromptPreview/PromptPreview';
import { PostsLibraryPage } from './components/PostsLibrary/PostsLibraryPage';
import { postCreatorService } from './services/postCreatorService';
import { CampaignElementModel, ElementModel, ElementType, PostCampaign } from './types/postCreator';
import {
  getProductImageSelection,
  saveProductImageSelection,
  clearProductImageSelection,
  ProductImageSelectionState,
} from './services/postProductImageSelections';
import { resolveProductImages } from './services/postProductImageResolver';
import {
  OFFICIAL_QUEIMA_BADGE_URL,
  OFFICIAL_LIQUIDACAO_BADGE_URL,
} from './services/postOfficialAssetConstants';

export default function MarketingPostsManager() {
  const editor = usePostEditor();
  const [activeTab, setActiveTab] = useState<'generator' | 'library'>('generator');
  const [editorTab, setEditorTab] = useState<'elements' | 'prompt_assets'>('elements');
  const [isFocused, setIsFocused] = useState(false);
  const [campaigns, setCampaigns] = useState<PostCampaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [models, setModels] = useState<ElementModel[]>([]);
  const [links, setLinks] = useState<CampaignElementModel[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [creating, setCreating] = useState<{ type: ElementType; opportunityId?: string }>();
  const [editing, setEditing] = useState<ElementModel>();
  const [viewing, setViewing] = useState<ElementModel>();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [manualSelection, setManualSelection] = useState<ProductImageSelectionState | null>(null);
  const [operationBusy, setOperationBusy] = useState(false), [operationError, setOperationError] = useState(''), [loadingConfiguration, setLoadingConfiguration] = useState(false);
  const active = useRef(true), inFlight = useRef(false), uncertain = useRef(new Set<string>()), confirmed = useRef(new Map<string, string>());
  const newCampaignId = useRef<string | undefined>(undefined), querySequence = useRef(0);
  const { user } = useAuth();
  const actor = useRef({ id: user?.id }); if (actor.current.id !== user?.id) actor.current = { id: user?.id };
  const actorScope = actor.current;
  const modelKey = creating ? creating.type + ':' + (creating.opportunityId || '') : editing?.id || '';
  const modelScope = useRef({ actor: actorScope, campaignId, modelKey });
  if (modelScope.current.actor !== actorScope || modelScope.current.campaignId !== campaignId || modelScope.current.modelKey !== modelKey) modelScope.current = { actor: actorScope, campaignId, modelKey };
  const selectedScope = modelScope.current;
  const productScope = useRef('');
  const managerScope = useRef({ actor: actorScope, open: managerOpen });
  if (managerScope.current.actor !== actorScope || managerScope.current.open !== managerOpen) managerScope.current = { actor: actorScope, open: managerOpen };
  const selectedManagerScope = managerScope.current;
  const selectionForm = useZodForm(marketingImageSelectionFormSchema, { productId: '', selection: {} });
  const resetSelectionForm = useZodForm(marketingImageSelectionResetFormSchema, { productId: '' });
  const campaignForm = useZodForm(postCampaignCommandFormSchema, { id: '', name: '' });
  const deleteCampaignForm = useZodForm(postCampaignDeleteFormSchema, { id: '' });
  const rulesForm = useZodForm(campaignRulesFormSchema, { content: '' });
  const { enqueueAndRun: queryConfiguration } = useZodForm(postCampaignLookupFormSchema, { id: campaignId });
  const modelForm = useZodForm(postElementCommandFormSchema, { id: '', name: '', elementType: 'LOGO', contentKind: 'STATIC_VISUAL', prompt: '', referenceFiles: [], generationVersion: 1, status: 'NO_PREVIEW', createdAt: '', updatedAt: '' });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (!managerOpen) newCampaignId.current = undefined; }, [managerOpen]);
  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => { throw Object.assign(new Error(Object.values(flattenFormErrors(errors))[0]), { knownFailure: true }); };
  const currentActor = () => active.current && actor.current === actorScope;
  async function operate(key: string, work: () => Promise<unknown>) {
    if (!currentActor() || !actorScope.id) throw new Error('Aguarde a confirmação da sessão.');
    if (inFlight.current) throw new Error('Aguarde a operação em andamento.');
    if (uncertain.current.has(key)) throw new Error('Há uma operação sem confirmação. Confira antes de repetir.');
    inFlight.current = true; setOperationBusy(true); setOperationError('');
    try { const result = await work(); if (result === false) throw new Error('O contexto mudou. Reabra a operação.'); if (currentActor()) setLastUpdated(new Date()); return result; }
    catch (error) { if (currentActor()) { if (error && typeof error === 'object' && 'uncertain' in error && error.uncertain) uncertain.current.add(key); setOperationError(error instanceof Error ? error.message : 'Não foi possível confirmar a operação.'); } throw error; }
    finally { inFlight.current = false; if (active.current) setOperationBusy(false); }
  }
  const persistSelection = async (productId: string, selection: ProductImageSelectionState, message: string) => {
    try { await operate('images:' + productId, () => selectionForm.validateAndRun({ productId, selection: { ...selection } }, (values) => {
      if (!currentActor() || productScope.current !== values.productId) return false;
      saveProductImageSelection(values.productId, values.selection); setManualSelection(values.selection); toast.success(message); return true;
    }, invalid)); } catch { /* O proprietário apresenta o erro e conserva o rascunho anterior. */ }
  };
  const loadGlobalRules = useCallback(async () => {
    if (!actor.current.id) throw new Error('Aguarde a confirmação da sessão.');
    const result = await withTimeout(postCreatorService.globalGuidelines({ confirm: true }), 15_000, null, 'Consultar regras globais');
    if (result === null) throw new Error('A consulta das regras não foi confirmada.'); return result;
  }, []);
  const saveGlobalRules = async (value: string) => {
    await operate('rules', () => rulesForm.validateAndRun({ content: value }, async (values) => {
      await postCreatorService.saveGlobalGuidelines(values.content, { confirm: true, isCurrent: currentActor });
      return currentActor();
    }, invalid));
  };
  const handleSavingChange = (isSaving: boolean) => { setSavingChanges(isSaving); };

  const campaign = campaigns.find((item) => item.id === campaignId);

  const previewSource = editor.product as (typeof editor.product & { opportunity_id?: string });
  // Mapeamento resiliente da oportunidade do produto para garantir selo oficial no preview
  const matchedOpportunity = useMemo(() => {
    const p = previewSource;
    if (!p) return null;
    const oppId =
      p.opportunity_id ||
      p.opportunityId ||
      (typeof p.opportunity === 'object' ? p.opportunity?.id : null);
    if (oppId) return opportunities.find((o) => o.id === oppId) || null;
    const oppName =
      p.opportunityName ||
      (typeof p.opportunity === 'object' ? p.opportunity?.name : null) ||
      (typeof p.opportunity === 'string' ? p.opportunity : '');
    if (oppName)
      return (
        opportunities.find(
          (o) => o.name?.toLowerCase() === oppName.toLowerCase() || (o as any).slug === oppName
        ) || null
      );
    return null;
  }, [previewSource, opportunities]);

  const productOpportunityId =
    matchedOpportunity?.id ||
    editor.product?.opportunityId ||
    (editor.product && 'opportunity_id' in editor.product && typeof editor.product.opportunity_id === 'string' ? editor.product.opportunity_id : null) ||
    null;

  const effectiveProductForPreview = useMemo(() => {
    if (!editor.product) return null;
    if (!matchedOpportunity) return editor.product;
    return {
      ...editor.product,
      opportunity_id: matchedOpportunity.id,
      opportunityId: matchedOpportunity.id,
      opportunityName: matchedOpportunity.name,
      opportunityImageUrl: matchedOpportunity.image_url,
      opportunity: matchedOpportunity,
    };
  }, [editor.product, matchedOpportunity]);

  productScope.current = effectiveProductForPreview?.id || '';

  const allCampaignModels = models.filter((model) =>
    links.some((link) => link.elementModelId === model.id)
  );
  const activeIds = useMemo(
    () =>
      Object.fromEntries(
        links
          .filter((link) => link.active)
          .map((link) => [`${link.elementType}:${link.opportunityId || ''}`, link.elementModelId])
      ),
    [links]
  );
  // Se o produto NÃO possui oportunidade, nenhum BADGE deve ser considerado ativo.
  // Se possui oportunidade, apenas o BADGE daquela oportunidade específica pode ser ativo.
  const activeModels = allCampaignModels
    .filter((model) => activeIds[`${model.elementType}:${model.opportunityId || ''}`] === model.id)
    .filter((model) => {
      if (model.elementType === 'BADGE') {
        if (!productOpportunityId) return false;
        return model.opportunityId === productOpportunityId;
      }
      return true;
    });

  useEffect(() => {
    if (effectiveProductForPreview?.id) {
      const saved = getProductImageSelection(effectiveProductForPreview.id);
      setManualSelection(saved);
    } else {
      setManualSelection(null);
    }
  }, [effectiveProductForPreview?.id]);

  const { productImages: resolvedImages, validation: imagesValidation } = useMemo(() => {
    if (!effectiveProductForPreview) return { productImages: null, validation: null };
    return resolveProductImages({
      product: { ...effectiveProductForPreview, variations: effectiveProductForPreview.variations?.map((variation) => ({ ...variation, attributes: Object.fromEntries(variation.attributes.map((attribute) => [attribute.name, attribute.value])) })) },
      selectedVariationId: undefined,
      manualOverrides: manualSelection,
    });
  }, [effectiveProductForPreview, manualSelection]);

  const handleChangePrimary = (url: string) => {
    if (!effectiveProductForPreview?.id) return;
    const next: ProductImageSelectionState = {
      ...manualSelection,
      primaryUrl: url,
    };
    void persistSelection(effectiveProductForPreview.id, next, 'Imagem principal selecionada e salva!');
  };

  const handleChangeOpenView = (url: string | null) => {
    if (!effectiveProductForPreview?.id) return;
    const next: ProductImageSelectionState = {
      ...manualSelection,
      openViewUrl: url,
    };
    void persistSelection(effectiveProductForPreview.id, next, url ? 'Imagem secundária selecionada e salva!' : 'Imagem secundária removida.');
  };

  const handleChangeVariation = (varId: string, url: string) => {
    if (!effectiveProductForPreview?.id) return;
    const next: ProductImageSelectionState = {
      ...manualSelection,
      variationUrls: {
        ...(manualSelection?.variationUrls || {}),
        [varId]: url,
      },
    };
    void persistSelection(effectiveProductForPreview.id, next, 'Foto da variação selecionada e salva!');
  };

  const handleResetOverrides = async () => {
    const productId = effectiveProductForPreview?.id; if (!productId) return;
    try { await operate('images:' + productId, () => resetSelectionForm.validateAndRun({ productId }, (values) => {
      if (!currentActor() || productScope.current !== values.productId) return false;
      clearProductImageSelection(values.productId); setManualSelection(null); toast.info('Seleção de imagens restaurada para o padrão.'); return true;
    }, invalid)); } catch { /* Erro apresentado pelo proprietário. */ }
  };

  const oppBadgeModel = activeModels.find((m) => m.elementType === 'BADGE');
  const oppBadgeUrl =
    (oppBadgeModel
      ? oppBadgeModel.generatedAssetUrl || oppBadgeModel.referenceFiles?.[0]?.fileUrl
      : null) ||
    matchedOpportunity?.image_url ||
    (/queima|salvado/i.test(matchedOpportunity?.name || '') ? OFFICIAL_QUEIMA_BADGE_URL : null) ||
    (/liquida/i.test(matchedOpportunity?.name || '') ? OFFICIAL_LIQUIDACAO_BADGE_URL : null);

  const reload = async (id = campaignId) => {
    const sequence = ++querySequence.current; setLoadingConfiguration(true);
    try {
      return await queryConfiguration({ id }, async (values) => {
        if (!currentActor() || !actorScope.id) return false;
        const result = await withTimeout(Promise.all([postCreatorService.campaigns({ confirm: true }), postCreatorService.models({ confirm: true })]), 15_000, null, 'Consultar configuração de campanhas');
        if (!result || !result.every(Array.isArray)) throw new Error('A configuração das campanhas não foi confirmada. Tente atualizar.');
        const [nextCampaigns, nextModels] = result, nextId = values.id || nextCampaigns[0]?.id || '';
        const nextLinks = nextId ? await withTimeout(postCreatorService.links(nextId, { confirm: true }), 15_000, null, 'Consultar vínculos da campanha') : [];
        if (!currentActor() || sequence !== querySequence.current) return false;
        if (!Array.isArray(nextLinks)) throw new Error('Os vínculos da campanha não foram confirmados.');
        setCampaigns(nextCampaigns); setModels(nextModels); setCampaignId(nextId); setLinks(nextLinks); return true;
      }, invalid);
    } catch (error) { if (currentActor() && sequence === querySequence.current) setOperationError(error instanceof Error ? error.message : 'Não foi possível carregar as campanhas.'); return false; }
    finally { if (currentActor() && sequence === querySequence.current) setLoadingConfiguration(false); }
  };

  const initialReload = useRef(reload); initialReload.current = reload;
  const selectProduct = useRef(editor.selectProduct); selectProduct.current = editor.selectProduct;
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setCampaigns([]); setModels([]); setLinks([]); setCampaignId(''); setManagerOpen(false); setCreating(undefined); setEditing(undefined); setManualSelection(getProductImageSelection(productScope.current)); setLastUpdated(null); setOperationError('');
    confirmed.current.clear(); uncertain.current.clear(); newCampaignId.current = undefined;
    if (!user?.id) return;
    const scope = actor.current;
    void initialReload.current('');
    void withTimeout(supabase.from('opportunities').select('id, name, slug, badge_color, border_color, image_url').eq('active', true).order('name'), 15_000, null, 'Consultar oportunidades').then((result) => {
      if (active.current && actor.current === scope) {
        if (!result || result.error || !Array.isArray(result.data)) throw new Error('A consulta das oportunidades não foi confirmada.');
        setOpportunities(result.data);
      }
    }).catch(() => { if (active.current && actor.current === scope) setOperationError('Não foi possível consultar as oportunidades.'); });
  }, [user?.id]);

  // Abre direto na aba "Preview de Prompt + Assets" com o produto pré-selecionado
  // quando a página é acessada com ?product=<id> (ex: via menu do produto)
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId) {
      setActiveTab('generator');
      setEditorTab('prompt_assets');
      void selectProduct.current(productId);
    }
  }, [searchParams]);

  const selectCampaign = async (id: string) => { if (inFlight.current) return; setCampaignId(id); setLinks([]); await reload(id); };
  const refresh = async (id: string) => { if (!await reload(id)) throw new Error('A operação foi confirmada, mas a lista não foi atualizada. Tente novamente para atualizar.'); };
  const saveCampaign = async (value: Partial<PostCampaign>) => {
    const id = value.id || (newCampaignId.current ||= crypto.randomUUID());
    const current = () => currentActor() && managerScope.current === selectedManagerScope;
    await operate('campaign:' + id, () => campaignForm.validateAndRun({ ...value, id, name: value.name || '' }, async (values) => {
      const fingerprint = JSON.stringify([values.id, values.name, values.description, values.active, values.generalGuidelines]);
      if (confirmed.current.get('campaign:' + id) !== fingerprint) { const receipt = await postCreatorService.saveCampaign(values, { confirm: true, isCurrent: current }); if (receipt.id !== values.id || receipt.name !== values.name) throw Object.assign(new Error('A campanha salva não foi confirmada.'), { uncertain: true }); confirmed.current.set('campaign:' + id, fingerprint); }
      if (!current()) return false; await refresh(id); confirmed.current.delete('campaign:' + id); return true;
    }, invalid));
    if (!value.id) newCampaignId.current = undefined;
  };
  const removeCampaign = async (id: string) => {
    const current = () => currentActor() && managerScope.current === selectedManagerScope;
    await operate('delete:' + id, () => deleteCampaignForm.validateAndRun({ id }, async (values) => {
      if (!confirmed.current.has('delete:' + values.id)) { if (!campaigns.some((item) => item.id === values.id)) throw new Error('A campanha selecionada mudou. Atualize a lista.'); await postCreatorService.removeCampaign(values.id, { confirm: true, isCurrent: current }); confirmed.current.set('delete:' + values.id, 'confirmed'); }
      if (!current()) return false; await refresh(values.id === campaignId ? '' : campaignId); confirmed.current.delete('delete:' + values.id); return true;
    }, invalid));
  };
  const saveModel = async (model: ElementModel, creatingModel: boolean) => {
    const existing = creatingModel ? allCampaignModels.find((item) => item.elementType === model.elementType && item.opportunityId === model.opportunityId) : undefined;
    const id = existing?.id || model.id, key = campaignId + ':' + id;
    await operate('model:' + key, () => modelForm.validateAndRun({ ...model, id }, async (values) => {
      const current = () => currentActor() && modelScope.current === selectedScope;
      if (!campaign || !current()) throw new Error('A campanha selecionada mudou. Reabra o modelo.');
      if (values.elementType === 'BADGE' && !opportunities.some((item) => item.id === values.opportunityId)) throw new Error('A oportunidade selecionada mudou. Atualize as campanhas.');
      if (!creatingModel && !models.some((item) => item.id === values.id)) throw new Error('O modelo selecionado mudou. Atualize as campanhas.');
      const fingerprint = JSON.stringify([values.id, values.name, values.elementType, values.contentKind, values.opportunityId, values.prompt, values.referenceFiles, values.generatedAssetUrl, values.generationInputHash, values.generationVersion, values.status]);
      if (confirmed.current.get('model:' + key) !== fingerprint) { const receipt = await postCreatorService.saveModel(values, { confirm: true, isCurrent: current }); if (receipt.id !== values.id) throw Object.assign(new Error('O modelo salvo não foi confirmado.'), { uncertain: true }); confirmed.current.set('model:' + key, fingerprint); }
      if (creatingModel && (!existing || links.some((item) => item.elementModelId === existing.id && item.persistedRemotely === false)) && !confirmed.current.has('link:' + key)) {
        if (!current()) return false;
        try { await postCreatorService.linkModel({ campaignId: campaign.id, elementModelId: values.id, elementType: values.elementType, opportunityId: values.opportunityId, active: true, createdAt: values.createdAt }, { confirm: true, isCurrent: current }); }
        catch (error) { throw Object.assign(new Error('Modelo salvo. O vínculo com a campanha permanece pendente: ' + (error instanceof Error ? error.message : 'resultado não confirmado.')), error && typeof error === 'object' ? error : {}); }
        confirmed.current.set('link:' + key, 'confirmed');
      }
      if (!current()) return false; await refresh(campaign.id); confirmed.current.delete('model:' + key); confirmed.current.delete('link:' + key); return true;
    }, invalid));
  };
  const createModel = (model: ElementModel) => saveModel(model, true);
  const updateModel = (model: ElementModel) => saveModel(model, false);

  return (
    <section className="min-h-screen bg-slate-950 p-3 sm:p-5 lg:p-6 pb-24 sm:pb-20 text-white">
      {operationError && <p role="alert" className="mb-3 text-sm text-red-300">{operationError}</p>}
      {editor.message && <p role="alert" className="mb-3 text-sm text-amber-300">{editor.message}</p>}
      {operationError && !operationBusy && <button type="button" onClick={() => void reload()}>Tentar atualizar campanhas</button>}
      {(operationBusy || loadingConfiguration || savingChanges) && <p role="status" className="mb-3"><i className="bi bi-arrow-repeat animate-spin inline-block mr-2" aria-hidden="true" />{operationBusy || savingChanges ? 'Confirmando alterações da campanha...' : 'Consultando campanhas e modelos...'}</p>}
      {lastUpdated && !operationBusy && <p className="mb-3 text-xs text-slate-400">Alterações confirmadas às {lastUpdated.toLocaleTimeString()}.</p>}
      {/* Header Superior */}
      <header className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
            <span>✨ Gerador de Prompt para Posts</span>
            <span className="text-[10px] sm:text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
              IA Externa
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Geração de especificações estruturadas para ChatGPT/Gemini e Biblioteca de Artes.
          </p>
        </div>
      </header>

      {activeTab === 'library' ? (
        <PostsLibraryPage campaigns={campaigns} />
      ) : (
        <>
          {/* Barra de Configuração Responsiva */}
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 sm:p-4 md:grid-cols-2 items-end">
            {/* Campanha */}
            <div className="text-xs font-semibold text-slate-300">
              <label htmlFor="post-campaign-select" className="block mb-1">
                Campanha
              </label>
              <div className="flex gap-2">
                <select
                  id="post-campaign-select"
                  value={campaignId}
                  aria-label="Campanha selecionada"
                  disabled={operationBusy}
                  onChange={(event) => void selectCampaign(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-100 border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {campaigns
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}{item.persistedRemotely === false ? ' (rascunho local)' : ''}
                      </option>
                    ))}
                </select>
                <button
                  disabled={operationBusy}
                  onClick={() => setManagerOpen(true)}
                  className="shrink-0 rounded-lg border border-indigo-400/40 bg-indigo-950/30 px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-900/50 transition-colors"
                  title="Gerenciar Campanhas"
                >
                  Gerenciar
                </button>
              </div>
            </div>

            {/* Produto para Preview */}
            <div className="text-xs font-semibold text-slate-300">
              <PreviewProductPicker
                search={editor.search}
                products={editor.products}
                selected={editor.product}
                loading={editor.loading}
                onSearch={editor.setSearch}
                onSelect={(id) => void editor.selectProduct(id)}
              />
            </div>
          </div>

          {/* Abas do Editor de Posts (Universal para Desktop, Tablet e Mobile) */}
          <div className="mb-4 flex flex-wrap sm:flex-nowrap rounded-xl bg-slate-900 border border-slate-800 p-1 gap-1">
            <button
              type="button"
              onClick={() => setEditorTab('elements')}
              className={`flex-1 py-2 px-3.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                editorTab === 'elements'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>📦 Elementos da Campanha</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('prompt_assets')}
              className={`flex-1 py-2 px-3.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                editorTab === 'prompt_assets'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>📋 Preview de Prompt + Assets</span>
            </button>
          </div>

          {/* Conteúdo Principal — Renderização Ampla e Focada por Aba */}
          <div className="w-full min-w-0">
            {editorTab === 'elements' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <CampaignElementsPanel
                  campaignName={campaign?.name}
                  models={allCampaignModels.filter(
                    (model) =>
                      model.elementType === 'BADGE' ||
                      activeModels.some((active) => active.id === model.id)
                  )}
                  opportunities={opportunities}
                  onCreate={(type, opportunityId) => { if (!inFlight.current) setCreating({ type, opportunityId }); }}
                  onEdit={(model) => { if (!inFlight.current) setEditing(model); }}
                  onView={setViewing}
                  product={effectiveProductForPreview}
                  productImages={resolvedImages}
                  imagesValidation={imagesValidation}
                  opportunityName={matchedOpportunity?.name}
                  opportunityBadgeUrl={oppBadgeUrl}
                  onChangePrimary={handleChangePrimary}
                  onChangeOpenView={handleChangeOpenView}
                  onChangeVariation={handleChangeVariation}
                  onResetOverrides={() => void handleResetOverrides()}
                  hasManualOverrides={Boolean(
                    manualSelection && Object.keys(manualSelection).length > 0
                  )}
                />
                <GeneralCampaignRules
                  key={user?.id}
                  load={loadGlobalRules}
                  save={saveGlobalRules}
                  onSavingChange={handleSavingChange}
                />
              </div>
            )}

            {editorTab === 'prompt_assets' && (
              <main className="flex flex-col rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 sm:p-5 min-w-0 w-full">
                <PromptPreview
                  campaign={campaign}
                  product={effectiveProductForPreview}
                  models={activeModels}
                  elementModels={models}
                  isFocused={isFocused}
                  onToggleFocus={() => setIsFocused((prev) => !prev)}
                  manualSelection={manualSelection}
                  resolvedImages={resolvedImages}
                  imagesValidation={imagesValidation}
                />
              </main>
            )}
          </div>

          {managerOpen && (
            <CampaignManagerModal
              campaigns={campaigns}
              onClose={() => { if (!inFlight.current) setManagerOpen(false); }}
              onSave={saveCampaign}
              onRemove={removeCampaign}
              onSavingChange={handleSavingChange}
            />
          )}
          {creating && (
            <PostCreatorModelModal
              elementType={creating.type}
              initialOpportunityId={creating.opportunityId}
              opportunities={opportunities}
              onClose={() => { if (!inFlight.current) setCreating(undefined); }}
              onSave={createModel}
              onSavingChange={handleSavingChange}
            />
          )}
          {editing && (
            <PostCreatorModelModal
              elementType={editing.elementType}
              value={editing}
              opportunities={opportunities}
              onClose={() => { if (!inFlight.current) setEditing(undefined); }}
              onSave={updateModel}
              onSavingChange={handleSavingChange}
            />
          )}
          {viewing && (
            <ElementModelDetailsModal model={viewing} onClose={() => setViewing(undefined)} />
          )}
        </>
      )}
    </section>
  );
}
