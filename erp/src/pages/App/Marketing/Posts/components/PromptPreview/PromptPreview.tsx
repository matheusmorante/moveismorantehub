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
  ProductImageSelectionState,
} from '../../services/postProductImageSelections';
import { PromptCopyableImagesList } from './PromptCopyableImagesList';
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
  manualSelection?: ProductImageSelectionState | null;
  resolvedImages?: PostProductImagesSpec | null;
  imagesValidation?: PostProductImagesValidation | null;
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
  manualSelection: propManualSelection,
  resolvedImages: propResolvedImages,
  imagesValidation: propImagesValidation,
}: PromptPreviewProps) {
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

  // Sincronizar com seleção manual externa ou persistida
  useEffect(() => {
    if (propManualSelection !== undefined) {
      setManualSelection(propManualSelection);
    } else if (effectiveProductId) {
      const saved = getProductImageSelection(effectiveProductId);
      setManualSelection(saved);
    } else {
      setManualSelection(null);
    }
  }, [effectiveProductId, propManualSelection]);

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
    if (propResolvedImages !== undefined) {
      setResolvedImages(propResolvedImages);
      setImagesValidation(propImagesValidation || null);
    } else if (product) {
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
  }, [specKey, globalRules, propResolvedImages, propImagesValidation]);

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao gerar arquivo ZIP.');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleOpenChatGptInBackground = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = 'https://chatgpt.com/g/g-p-6a9d93e0c74c8191ade047ff2bc6c334-criador-de-post/project';
    
    // Abre a URL em nova aba e preserva o foco nesta aba do ERP
    const win = window.open(url, '_blank');
    if (win) {
      try {
        win.blur();
      } catch {
        // ignora se cross-origin
      }
    }
    window.focus();

    toast.info('Projeto ChatGPT aberto em segundo plano! Você continua aqui para copiar as imagens e o prompt.', {
      autoClose: 3500,
    });
  };

  return (
    <div className="flex h-full flex-col gap-3 min-w-0">
      {/* Cabeçalho do Preview: Preview de Prompt e Assets usados + Botão Baixar ZIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <span>🖼️</span>
            <span>Preview de Prompt e Assets usados</span>
          </h3>

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

        {/* Botões de Ação Principal: Projeto ChatGPT e Baixar Pacote ZIP */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenChatGptInBackground}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/60 bg-emerald-950/60 hover:bg-emerald-900/80 px-3.5 py-1.5 text-xs font-bold text-emerald-200 shadow transition active:scale-95"
            title="Abrir o Projeto Criador de Post no ChatGPT em segundo plano (sem sair desta página)"
          >
            <span>🤖</span>
            <span>Projeto ChatGPT</span>
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadZip()}
            disabled={!currentSpec || downloadingZip}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/70 bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow transition disabled:cursor-not-allowed disabled:opacity-40"
            title="Baixar arquivo ZIP com o pacote do prompt e assets para o ChatGPT/Gemini"
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
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
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

          {/* 2. Lista de Todos os Assets e Fotos com botão "Copiar Imagem" (Logo, Selo de Oportunidade, Imagens) */}
          <PromptCopyableImagesList
            productImages={resolvedImages}
            officialAssets={officialAssets}
            product={product}
          />

          {/* 4. Texto Estruturado do Prompt para IA */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <span>📄</span>
                <span>Texto Estruturado do Prompt</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!promptText) return;
                  navigator.clipboard.writeText(promptText).then(() => {
                    toast.success('Prompt copiado para a área de transferência!');
                  });
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                <span>📋</span>
                <span>Copiar Prompt</span>
              </button>
            </div>

            {!promptText ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              </div>
            ) : (
              <pre className="max-h-[500px] overflow-y-auto rounded-lg p-3 text-[11px] leading-relaxed text-emerald-300 font-mono scrollbar-thin scrollbar-thumb-slate-700 whitespace-pre-wrap break-words select-all bg-slate-900/80 border border-slate-800">
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
