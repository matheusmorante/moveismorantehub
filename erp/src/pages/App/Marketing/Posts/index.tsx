import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
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
  const [configurationRevision, setConfigurationRevision] = useState(0);
  const [creating, setCreating] = useState<{ type: ElementType; opportunityId?: string }>();
  const [editing, setEditing] = useState<ElementModel>();
  const [viewing, setViewing] = useState<ElementModel>();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [manualSelection, setManualSelection] = useState<ProductImageSelectionState | null>(null);

  const loadGlobalRules = useCallback(() => postCreatorService.globalGuidelines(), []);
  const saveGlobalRules = useCallback(async (value: string) => {
    await postCreatorService.saveGlobalGuidelines(value);
    setConfigurationRevision(revision => revision + 1);
  }, []);
  const handleSavingChange = (isSaving: boolean) => {
    setSavingChanges(isSaving);
    if (!isSaving) setLastUpdated(new Date());
  };

  const campaign = campaigns.find(item => item.id === campaignId);

  // Mapeamento resiliente da oportunidade do produto para garantir selo oficial no preview
  const matchedOpportunity = useMemo(() => {
    const p = editor.product;
    if (!p) return null;
    const oppId = p.opportunity_id || p.opportunityId || (typeof p.opportunity === 'object' ? p.opportunity?.id : null);
    if (oppId) return opportunities.find(o => o.id === oppId) || null;
    const oppName = p.opportunityName || (typeof p.opportunity === 'object' ? p.opportunity?.name : null) || (typeof p.opportunity === 'string' ? p.opportunity : '');
    if (oppName) return opportunities.find(o => o.name?.toLowerCase() === oppName.toLowerCase() || (o as any).slug === oppName) || null;
    return null;
  }, [editor.product, opportunities]);

  const productOpportunityId = matchedOpportunity?.id || editor.product?.opportunityId || editor.product?.opportunity_id || null;

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

  const allCampaignModels = models.filter(model => links.some(link => link.elementModelId === model.id));
  const activeIds = useMemo(
    () => Object.fromEntries(links.filter(link => link.active).map(link => [`${link.elementType}:${link.opportunityId || ''}`, link.elementModelId])),
    [links],
  );
  // Se o produto NÃO possui oportunidade, nenhum BADGE deve ser considerado ativo.
  // Se possui oportunidade, apenas o BADGE daquela oportunidade específica pode ser ativo.
  const activeModels = allCampaignModels
    .filter(model => activeIds[`${model.elementType}:${model.opportunityId || ''}`] === model.id)
    .filter(model => {
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
      product: effectiveProductForPreview,
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
    setManualSelection(next);
    saveProductImageSelection(effectiveProductForPreview.id, next);
    toast.success('Imagem principal selecionada e salva!');
  };

  const handleChangeOpenView = (url: string | null) => {
    if (!effectiveProductForPreview?.id) return;
    const next: ProductImageSelectionState = {
      ...manualSelection,
      openViewUrl: url,
    };
    setManualSelection(next);
    saveProductImageSelection(effectiveProductForPreview.id, next);
    toast.success(url ? 'Imagem secundária selecionada e salva!' : 'Imagem secundária removida.');
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
    setManualSelection(next);
    saveProductImageSelection(effectiveProductForPreview.id, next);
    toast.success('Foto da variação selecionada e salva!');
  };

  const handleResetOverrides = () => {
    if (!effectiveProductForPreview?.id) return;
    clearProductImageSelection(effectiveProductForPreview.id);
    setManualSelection(null);
    toast.info('Seleção de imagens restaurada para o padrão.');
  };

  const oppBadgeModel = activeModels.find(m => m.elementType === 'BADGE');
  const oppBadgeUrl =
    (oppBadgeModel ? oppBadgeModel.generatedAssetUrl || oppBadgeModel.referenceFiles?.[0]?.fileUrl : null) ||
    matchedOpportunity?.image_url ||
    (/queima|salvado/i.test(matchedOpportunity?.name || '') ? OFFICIAL_QUEIMA_BADGE_URL : null) ||
    (/liquida/i.test(matchedOpportunity?.name || '') ? OFFICIAL_LIQUIDACAO_BADGE_URL : null);

  const reload = async (id = campaignId) => {
    const [nextCampaigns, nextModels] = await Promise.all([postCreatorService.campaigns(), postCreatorService.models()]);
    const nextId = id || nextCampaigns[0]?.id || '';
    setCampaigns(nextCampaigns);
    setModels(nextModels);
    setCampaignId(nextId);
    setLinks(nextId ? await postCreatorService.links(nextId) : []);
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    void reload();
    void supabase
      .from('opportunities')
      .select('id, name, slug, badge_color, border_color, image_url')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setOpportunities(data || []));
  }, []);

  // Abre direto na aba "Preview de Prompt + Assets" com o produto pré-selecionado
  // quando a página é acessada com ?product=<id> (ex: via menu do produto)
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId) {
      setActiveTab('generator');
      setEditorTab('prompt_assets');
      void editor.selectProduct(productId);
    }
  }, [searchParams]);

  const selectCampaign = async (id: string) => {
    setCampaignId(id);
    setLinks(await postCreatorService.links(id));
  };

  const saveCampaign = async (value: Partial<PostCampaign>) => {
    const saved = await postCreatorService.saveCampaign(value);
    await reload(saved.id);
    setConfigurationRevision(revision => revision + 1);
  };

  const removeCampaign = async (id: string) => {
    await postCreatorService.removeCampaign(id);
    await reload(id === campaignId ? '' : campaignId);
  };

  const createModel = async (model: ElementModel) => {
    if (!campaign) return;
    const existingModel = allCampaignModels.find(
      item => item.elementType === model.elementType && item.opportunityId === model.opportunityId
    );
    if (existingModel) {
      await updateModel({ ...existingModel, ...model, id: existingModel.id });
      return;
    }
    const saved = await postCreatorService.saveModel(model);
    await postCreatorService.linkModel({
      campaignId: campaign.id,
      elementModelId: saved.id,
      elementType: saved.elementType,
      opportunityId: saved.opportunityId,
      active: true,
      createdAt: new Date().toISOString()
    });
    await reload(campaign.id);
    setConfigurationRevision(revision => revision + 1);
  };

  const updateModel = async (model: ElementModel) => {
    await postCreatorService.saveModel(model);
    await reload(campaignId);
    setConfigurationRevision(revision => revision + 1);
  };

  return (
    <section className="min-h-screen bg-slate-950 p-3 sm:p-5 lg:p-6 pb-24 sm:pb-20 text-white">
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
                  onChange={event => void selectCampaign(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-100 border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {campaigns.filter(item => item.active).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <button
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
                onSelect={id => void editor.selectProduct(id)}
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
                  models={allCampaignModels.filter(model => model.elementType === 'BADGE' || activeModels.some(active => active.id === model.id))}
                  opportunities={opportunities}
                  onCreate={(type, opportunityId) => setCreating({ type, opportunityId })}
                  onEdit={setEditing}
                  onView={setViewing}
                  product={effectiveProductForPreview}
                  productImages={resolvedImages}
                  imagesValidation={imagesValidation}
                  opportunityName={matchedOpportunity?.name}
                  opportunityBadgeUrl={oppBadgeUrl}
                  onChangePrimary={handleChangePrimary}
                  onChangeOpenView={handleChangeOpenView}
                  onChangeVariation={handleChangeVariation}
                  onResetOverrides={handleResetOverrides}
                  hasManualOverrides={Boolean(manualSelection && Object.keys(manualSelection).length > 0)}
                />
                <GeneralCampaignRules load={loadGlobalRules} save={saveGlobalRules} onSavingChange={handleSavingChange} />
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
                  onToggleFocus={() => setIsFocused(prev => !prev)}
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
              onClose={() => setManagerOpen(false)}
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
              onClose={() => setCreating(undefined)}
              onSave={createModel}
              onSavingChange={handleSavingChange}
            />
          )}
          {editing && (
            <PostCreatorModelModal
              elementType={editing.elementType}
              value={editing}
              opportunities={opportunities}
              onClose={() => setEditing(undefined)}
              onSave={updateModel}
              onSavingChange={handleSavingChange}
            />
          )}
          {viewing && <ElementModelDetailsModal model={viewing} onClose={() => setViewing(undefined)} />}
        </>
      )}
    </section>
  );
}
