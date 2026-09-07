import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ElementModel, PostCampaign } from '../../types/postCreator';
import {
  PostProductImagesSpec,
  PostProductImagesValidation,
  PostOfficialAssetsSpec,
} from '../../types/postSpecification';
import {
  buildSingleSpecification,
  buildProductCatalogUrl,
  renderSpecificationAsPrompt,
} from '../../services/postSpecificationBuilder';
import { resolveProductImages } from '../../services/postProductImageResolver';
import {
  getProductImageSelection,
  saveProductImageSelection,
  clearProductImageSelection,
  ProductImageSelectionState,
} from '../../services/postProductImageSelections';
import { PromptImagesStrip } from './PromptImagesStrip';
import { PostCreationSpecification } from '../../types/postSpecification';
import { downloadPostContextZip } from '../../services/postZipPackageService';

interface PromptPreviewProps {
  campaign: PostCampaign | undefined;
  activeModels?: ElementModel[];
  models?: ElementModel[];
  elementModels?: any[];
  globalRules?: string;
  product?: any | null;
  productSlug?: string | undefined;
  productName?: string | undefined;
  variationId?: string | null;
  productId?: string | undefined;
  isFocused?: boolean;
  onToggleFocus?: () => void;
}

export function PromptPreview({
  campaign,
  activeModels,
  models,
  globalRules = 'Regras de Marca Móveis Morante',
  product,
  productSlug: propProductSlug,
  productName: propProductName,
  variationId,
  productId: propProductId,
  isFocused,
  onToggleFocus,
}: PromptPreviewProps) {
  const [previewSubTab, setPreviewSubTab] = useState<'overview' | 'raw'>('overview');
  const [currentSpec, setCurrentSpec] = useState<PostCreationSpecification | null>(null);
  const [promptText, setPromptText] = useState<string>('');
  const [catalogUrl, setCatalogUrl] = useState<string>('');
  const [resolvedImages, setResolvedImages] = useState<PostProductImagesSpec | null>(null);
  const [officialAssets, setOfficialAssets] = useState<PostOfficialAssetsSpec | null>(null);
  const [imagesValidation, setImagesValidation] = useState<PostProductImagesValidation | null>(null);
  const [manualSelection, setManualSelection] = useState<ProductImageSelectionState | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const effectiveModels = useMemo(() => activeModels || models || [], [activeModels, models]);
  const effectiveProductId = product?.id || propProductId;
  const effectiveProductSlug = product?.slug || product?.id || propProductSlug;
  const isEmpty = !campaign || !effectiveProductSlug;
  const oppName = product?.opportunity_name || product?.opportunityName || null;

  // Carregar seleção manual persistida quando mudar de produto
  useEffect(() => {
    if (effectiveProductId) {
      const saved = getProductImageSelection(effectiveProductId);
      setManualSelection(saved);
    } else {
      setManualSelection(null);
    }
  }, [effectiveProductId]);

  // Handlers para troca manual de fotos
  const handleChangePrimary = (url: string) => {
    if (!effectiveProductId) return;
    const next: ProductImageSelectionState = {
      ...manualSelection,
      primaryUrl: url,
    };
    setManualSelection(next);
    saveProductImageSelection(effectiveProductId, next);
    toast.success('Imagem principal selecionada e salva!');
  };

  const handleChangeOpenView = (url: string | null) => {
    if (!effectiveProductId) return;
    const next: ProductImageSelectionState = {
      ...manualSelection,
      openViewUrl: url,
    };
    setManualSelection(next);
    saveProductImageSelection(effectiveProductId, next);
    toast.success(url ? 'Foto aberta selecionada e salva!' : 'Foto aberta removida.');
  };

  const handleChangeVariation = (varId: string, url: string) => {
    if (!effectiveProductId) return;
    const next: ProductImageSelectionState = {
      ...manualSelection,
      variationUrls: {
        ...(manualSelection?.variationUrls || {}),
        [varId]: url,
      },
    };
    setManualSelection(next);
    saveProductImageSelection(effectiveProductId, next);
    toast.success('Foto da variação selecionada e salva!');
  };

  const handleResetOverrides = () => {
    if (!effectiveProductId) return;
    clearProductImageSelection(effectiveProductId);
    setManualSelection(null);
    toast.info('Seleção de imagens restaurada para o padrão.');
  };

  // Reconstruir o prompt localmente sempre que os dados mudarem
  const specKey = useMemo(
    () => `${campaign?.id}|${effectiveProductSlug}|${variationId}|${product?.opportunity_id || product?.opportunityId || 'none'}|${JSON.stringify(manualSelection)}|${product?.images?.length || 0}|${product?.variations?.length || 0}|${effectiveModels.map(m => `${m.id}:${m.updatedAt}`).join(',')}`,
    [campaign?.id, effectiveProductSlug, variationId, product, manualSelection, effectiveModels],
  );

  useEffect(() => {
    if (!campaign || !effectiveProductSlug) {
      setCurrentSpec(null);
      setPromptText('');
      setCatalogUrl('');
      setResolvedImages(null);
      setOfficialAssets(null);
      setImagesValidation(null);
      return;
    }

    const url = buildProductCatalogUrl(effectiveProductSlug, variationId);
    setCatalogUrl(url);

    // Resolver imagens estruturadas
    if (product) {
      const { productImages, validation } = resolveProductImages({
        product,
        selectedVariationId: variationId || undefined,
        manualOverrides: manualSelection,
      });
      setResolvedImages(productImages);
      setImagesValidation(validation);
    } else {
      setResolvedImages(null);
      setImagesValidation(null);
    }

    void buildSingleSpecification({
      productCatalogUrl: url,
      campaign,
      activeModels: effectiveModels,
      globalRules,
      product,
      selectedVariationId: variationId || undefined,
      manualOverrides: manualSelection,
    }).then(spec => {
      setCurrentSpec(spec);
      setOfficialAssets(spec.officialAssets || null);
      setPromptText(renderSpecificationAsPrompt(spec));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey, globalRules]);

  const handleDownloadZip = async () => {
    if (!currentSpec || !campaign) {
      toast.warn('Nenhuma especificação disponível para download.');
      return;
    }
    if (imagesValidation && !imagesValidation.valid) {
      toast.warn('Atenção: O produto não possui foto principal cadastrada.');
    }

    setDownloadingZip(true);
    try {
      await downloadPostContextZip({
        specification: currentSpec,
        campaign,
        activeModels: effectiveModels,
        product,
      });
    } catch (err: any) {
      toast.error(err.message || 'Falha ao gerar arquivo ZIP.');
    } finally {
      setDownloadingZip(false);
    }
  };

  const oppBadgeUrl = currentSpec?.officialAssets?.badge?.url || null;

  return (
    <div className="flex h-full flex-col gap-3 min-w-0">
      {/* Cabeçalho do Preview com Navegação Visão Geral | Prompt Completo e Ação Baixar ZIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Segmented control: Visão Geral vs Prompt Completo */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewSubTab('overview')}
              className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                previewSubTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👁️ Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setPreviewSubTab('raw')}
              className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                previewSubTab === 'raw'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 Prompt Completo
            </button>
          </div>

          {/* Botão Modo Foco (Expandir/Restaurar) */}
          {onToggleFocus && (
            <button
              type="button"
              onClick={onToggleFocus}
              className="hidden lg:inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              title={isFocused ? 'Restaurar layout padrão em duas colunas' : 'Expandir Preview (Modo Foco)'}
            >
              <span>{isFocused ? '⤡ Restaurar' : '⤢ Expandir'}</span>
            </button>
          )}
        </div>

        {/* Botão de Ação Principal: Baixar Pacote ZIP (prompt.txt + fotos + assets) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadZip()}
            disabled={!currentSpec || downloadingZip}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/70 bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow transition disabled:cursor-not-allowed disabled:opacity-40"
            title="Baixar arquivo ZIP com prompt.txt, INSTRUCOES.txt e todas as fotos do produto e assets para anexar no ChatGPT/Gemini"
          >
            {downloadingZip ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span>📦</span>
            )}
            <span>{downloadingZip ? 'Montando ZIP...' : 'Baixar ZIP'}</span>
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex h-full min-h-[300px] items-center justify-center text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl p-8">
          <div>
            <div className="mb-3 text-4xl">📋</div>
            <p className="font-semibold text-slate-300">Selecione uma campanha e um produto</p>
            <p className="mt-1 text-xs text-slate-500">
              para visualizar a composição dos assets, fotos reais e o Prompt Estruturado
            </p>
          </div>
        </div>
      ) : previewSubTab === 'overview' ? (
        /* =========================================================================
         * MODO 1: VISÃO GERAL (Amigável, visual, rápido para conferência diária)
         * ========================================================================= */
        <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
          {/* 1. Resumo do Contexto Comercial */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl text-xs">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Produto Selecionado
              </span>
              <p className="font-bold text-slate-100 truncate text-sm mt-0.5" title={product?.name || propProductName}>
                {product?.name || propProductName || 'Produto'}
              </p>
              {catalogUrl && (
                <a
                  href={catalogUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline font-mono truncate block mt-0.5 max-w-md"
                  title={catalogUrl}
                >
                  {catalogUrl}
                </a>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Campanha
                </span>
                <span className="text-xs font-bold text-indigo-300">
                  {campaign?.name || 'Campanha'}
                </span>
              </div>
            </div>
          </div>

          {/* Imagens do Produto para IA (Seleção visual de Foto Principal, Foto Secundária e Demais Variações) */}
          {resolvedImages && (
            <PromptImagesStrip
              product={product}
              productImages={resolvedImages}
              validation={imagesValidation}
              opportunityName={oppName}
              opportunityBadgeUrl={oppBadgeUrl}
              onChangePrimary={handleChangePrimary}
              onChangeOpenView={handleChangeOpenView}
              onChangeVariation={handleChangeVariation}
              onResetOverrides={handleResetOverrides}
              hasManualOverrides={Boolean(manualSelection && Object.keys(manualSelection).length > 0)}
            />
          )}

          {/* Botão de Atalho para ver o prompt bruto */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setPreviewSubTab('raw')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 font-medium underline transition"
            >
              <span>Ver texto completo do Prompt Estruturado</span> ➔
            </button>
          </div>
        </div>
      ) : (
        /* =========================================================================
         * MODO 2: PROMPT COMPLETO (Texto bruto formatado para inspeção/cópia)
         * ========================================================================= */
        <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span>Texto exato contido no prompt.txt do pacote ZIP:</span>
            <button
              type="button"
              onClick={() => {
                if (!promptText) return;
                navigator.clipboard.writeText(promptText).then(() => {
                  toast.success('Prompt copiado para a área de transferência!');
                });
              }}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              Copiar texto acima
            </button>
          </div>

          <div className="relative rounded-xl border border-slate-800 bg-slate-950 min-h-[250px] shrink-0">
            {!promptText ? (
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              </div>
            ) : (
              <pre className="max-h-[500px] overflow-y-auto rounded-xl p-4 text-[11px] leading-relaxed text-emerald-300 font-mono scrollbar-thin scrollbar-thumb-slate-700 whitespace-pre-wrap break-words select-all">
                {promptText}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Rodapé Informativo */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
        <p>
          O prompt é gerado 100% localmente e deterministicamente — zero custo de IA na montagem.
        </p>
        {campaign && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Campanha: {campaign.name}
          </span>
        )}
      </div>
    </div>
  );
}
