import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { PostCampaign, ElementModel } from '../../types/postCreator';
import { GeneratedPostCanvas } from './GeneratedPostCanvas';
import { resolveProductImages } from '../../services/postProductImageResolver';
import { resolveOfficialAssets } from '../../services/postOfficialAssetResolver';
import { getProductImageSelection } from '../../services/postProductImageSelections';
import { exportPostImage } from '../../services/exportPostImage';
import { AiQuotaManager, MonthlyUsageReport } from '@/services/aiGateway/core/AiQuotaManager';
import { AiGateway } from '@/services/aiGateway/AiGateway';
import {
  harmonizePostStylesWithGeminiFlash,
  HtmlPostThemeStyle,
  DEFAULT_THEME_STYLE,
} from '../../services/postHtmlStyleOptimizer';

interface GeneratedPostPreviewProps {
  campaign: PostCampaign | undefined;
  product: any | null;
  models: ElementModel[];
  format: string;
}

export function GeneratedPostPreview({
  campaign,
  product,
  models,
  format,
}: GeneratedPostPreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [harmonizingColors, setHarmonizingColors] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsageReport | null>(null);
  const [themeStyle, setThemeStyle] = useState<HtmlPostThemeStyle>(DEFAULT_THEME_STYLE);

  const [backgroundMode, setBackgroundMode] = useState<'white' | 'ai'>('white');

  const productId = product?.id || '';
  const storageBgKey = `morante_post_bg:${productId}:${format}`;

  // Carregar fundo personalizado salvo em cache
  useEffect(() => {
    if (!productId) {
      setCustomBgUrl(null);
      return;
    }
    const cachedBg = localStorage.getItem(storageBgKey);
    setCustomBgUrl(cachedBg || null);
  }, [productId, format, storageBgKey]);

  // Carregar status da cota mensal
  const refreshQuota = async () => {
    try {
      const usage = await AiQuotaManager.getMonthlyUsage('IMAGE');
      setMonthlyUsage(usage);
    } catch {
      // Fallback silencioso
    }
  };

  useEffect(() => {
    void refreshQuota();
  }, []);

  // Quando alterna o modo de fundo, ajusta automaticamente o tema padrão correspondente
  const handleToggleBackgroundMode = (mode: 'white' | 'ai') => {
    setBackgroundMode(mode);
    if (mode === 'white') {
      setThemeStyle(WHITE_STUDIO_THEME_STYLE);
    } else {
      setThemeStyle(DEFAULT_THEME_STYLE);
    }
  };

  // Resolução rigorosa das imagens do produto (Foto 1 principal, Foto 2 interna, outras variações)
  const productImages = useMemo(() => {
    if (!product) return null;
    const manualOverrides = productId ? getProductImageSelection(productId) : null;
    const resolved = resolveProductImages({
      product,
      manualOverrides,
    });
    return resolved.productImages || (resolved as any).spec || null;
  }, [product, productId]);

  // Resolução dos assets oficiais (Logo Móveis Morante e Selo da Oportunidade)
  const officialAssets = useMemo(() => {
    if (!product) return null;
    return resolveOfficialAssets({
      product,
      activeModels: models,
    });
  }, [product, models]);

  // Handler para download em alta resolução 1K via html2canvas (escala 1080px)
  const handleDownload1K = async () => {
    if (!canvasRef.current || !product) {
      toast.warn('Nenhum post ativo para download.');
      return;
    }

    setDownloading(true);
    try {
      toast.info('Renderizando arte em alta definição 1K (1080px)...');
      const canvas = await exportPostImage(canvasRef.current);
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      const safeName = (product?.name || 'post').toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.download = `morante_${safeName}_1k_${format.replace(':', 'x')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Post em 1K exportado com sucesso!');
    } catch (err: any) {
      console.error('[GeneratedPostPreview] Erro na exportação:', err);
      toast.error(err.message || 'Falha ao exportar arte em 1K.');
    } finally {
      setDownloading(false);
    }
  };

  // Handler para gerar ambientação de fundo com IA do Google (Google Imagen em 1K)
  const handleGenerateAiBackground = async () => {
    if (!product) {
      toast.warn('Selecione um produto para gerar a ambientação.');
      return;
    }

    if (monthlyUsage && monthlyUsage.costBRL >= monthlyUsage.budgetBRL) {
      toast.error(`Cota mensal de R$ ${monthlyUsage.budgetBRL.toFixed(2)} atingida. Novas gerações no dia 1º.`);
      return;
    }

    setGeneratingBg(true);
    try {
      toast.info('Gerando ambientação com IA...');

      const category = (product.category || 'móvel contemporâneo').toLowerCase();
      const prompt = `Fotografia publicitária de arquitetura de interiores em alta definição 1K. Ambiente de showroom contemporâneo sofisticado de alto padrão para móveis da categoria ${category}. Parede elegante com textura suave e iluminação natural indireta, piso refinado pronto para composição de produto, sem pessoas, sem textos, sem logomarcas, aspecto limpo e cinematográfico.`;

      const result = await AiGateway.requestImage({
        operation: 'marketing_ambient_background',
        payload: prompt,
      });

      if (!result.success || !result.data) {
        throw new Error(result.userFriendlyMessage || 'Falha ao gerar ambientação de fundo.');
      }

      setCustomBgUrl(result.data);
      localStorage.setItem(storageBgKey, result.data);
      setBackgroundMode('ai');
      toast.success('Ambientação com IA gerada!');
      await refreshQuota();
    } catch (err: any) {
      console.error('[GeneratedPostPreview] Erro ao gerar fundo:', err);
      toast.error(err.message || 'Erro ao gerar ambientação com IA.');
    } finally {
      setGeneratingBg(false);
    }
  };

  // Handler para harmonização de cores e contraste via Gemini Flash
  const handleHarmonizeColors = async () => {
    if (!product) {
      toast.warn('Selecione um produto para harmonizar cores.');
      return;
    }

    setHarmonizingColors(true);
    try {
      const isWhite = backgroundMode === 'white';
      const harmonized = await harmonizePostStylesWithGeminiFlash({
        productName: product.name,
        category: product.category,
        opportunityName: product.opportunity?.name || product.oppName,
        hasCustomBackground: !isWhite && !!customBgUrl,
        isWhiteBackground: isWhite,
      });

      setThemeStyle(harmonized);
      toast.success(`Cores harmonizadas: ${harmonized.contrastGrade}`);
    } catch {
      toast.warn('Mantendo contraste comercial padrão.');
    } finally {
      setHarmonizingColors(false);
    }
  };

  const handleResetBackground = () => {
    setCustomBgUrl(null);
    localStorage.removeItem(storageBgKey);
    setThemeStyle(backgroundMode === 'white' ? WHITE_STUDIO_THEME_STYLE : DEFAULT_THEME_STYLE);
    toast.info('Ambientação padrão restaurada.');
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Barra de Ações Limpa e Direta */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 sm:p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chaveador de Modo de Fundo: Fundo Branco vs Fundo IA */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => handleToggleBackgroundMode('white')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition ${
                backgroundMode === 'white'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Post limpo sobre fundo branco puro (sem custos de IA)"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400 inline-block" />
              <span>Fundo Branco</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleBackgroundMode('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition ${
                backgroundMode === 'ai'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Post ambientado com fundo de showroom gerado por IA"
            >
              <span>✨</span>
              <span>Fundo IA</span>
            </button>
          </div>

          {/* Botão Gerar / Nova Ambientação com IA (apenas quando Fundo IA ativo) */}
          {backgroundMode === 'ai' && (
            <button
              type="button"
              disabled={!product || generatingBg}
              onClick={handleGenerateAiBackground}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition ${
                product
                  ? 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border-indigo-500/40 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
            >
              <span>{generatingBg ? '🎨 Gerando...' : '✨ Gerar Cenário IA'}</span>
            </button>
          )}

          {/* Botão Harmonizar Cores (Gemini Flash) */}
          <button
            type="button"
            disabled={!product || harmonizingColors}
            onClick={handleHarmonizeColors}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition ${
              product
                ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border-amber-500/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
            }`}
            title="Ajusta o contraste dos textos e preços de acordo com o fundo selecionado"
          >
            <span>{harmonizingColors ? '⚡...' : '🎨 Harmonizar Cores'}</span>
          </button>

          {/* Botão Baixar Arte Pronta 1K */}
          <button
            type="button"
            disabled={!product || downloading}
            onClick={handleDownload1K}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow transition ${
              product
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>{downloading ? '⏳...' : '📥 Baixar Post 1K'}</span>
          </button>
        </div>

        {/* Indicador Compacto de Cota Mensal e Formato */}
        <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
          {monthlyUsage && backgroundMode === 'ai' && (
            <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-300">
              Cota IA: R$ {monthlyUsage.costBRL.toFixed(2)}/R$ {monthlyUsage.budgetBRL.toFixed(2)}
            </span>
          )}
          <span className="font-bold text-slate-200 bg-slate-800 px-2 py-1 rounded">
            {format === '9:16' ? '9:16' : '4:5'}
          </span>
        </div>
      </div>

      {/* Área Central: Visualização do Post Composto em HTML + CSS */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 min-h-[520px]">
        {product ? (
          <div className="flex flex-col items-center space-y-3 w-full">
            <GeneratedPostCanvas
              ref={canvasRef}
              format={format}
              product={product}
              productImages={productImages}
              officialAssets={officialAssets}
              models={models}
              backgroundUrl={customBgUrl}
              backgroundMode={backgroundMode}
              themeStyle={themeStyle}
            />

            {/* Selo Informativo de Contraste e Harmonia */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-400">
              <span className="font-bold text-amber-300">✓ {themeStyle.contrastGrade}</span>
              <span className="text-slate-600">•</span>
              <span className="truncate max-w-md">{themeStyle.rationale}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center max-w-md p-6 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-2xl text-indigo-400">
              🖼️
            </div>
            <h3 className="font-bold text-slate-200 text-sm">Selecione um produto para visualizar o post</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Escolha um produto e uma campanha no topo da tela para compor automaticamente a arte final em alta definição.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
