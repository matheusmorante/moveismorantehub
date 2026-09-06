import React, { forwardRef } from 'react';
import { ElementModel } from '../../types/postCreator';
import { PostProductImagesSpec, PostOfficialAssetsSpec } from '../../types/postSpecification';
import { PaymentBrands } from '../Editor/PaymentBrands';
import { HtmlPostThemeStyle, DEFAULT_THEME_STYLE } from '../../services/postHtmlStyleOptimizer';

interface GeneratedPostCanvasProps {
  format: string; // '4:5' | '9:16'
  product: any | null;
  productImages: PostProductImagesSpec | null;
  officialAssets: PostOfficialAssetsSpec | null;
  models: ElementModel[];
  backgroundUrl?: string | null;
  backgroundMode?: 'ai' | 'white' | 'studio';
  themeStyle?: HtmlPostThemeStyle;
}

export const GeneratedPostCanvas = forwardRef<HTMLDivElement, GeneratedPostCanvasProps>(
  function GeneratedPostCanvas(
    {
      format,
      product,
      productImages,
      officialAssets,
      models,
      backgroundUrl,
      backgroundMode = 'studio',
      themeStyle = DEFAULT_THEME_STYLE,
    },
    ref
  ) {
    if (!product) return null;

    const isStory = format === '9:16';
    const aspectRatioStyle = isStory ? '9 / 16' : '4 / 5';
    const isWhiteBg = backgroundMode === 'white';

    // Modelos ativos da campanha
    const titleModel = models.find(m => m.elementType === 'TITLE');
    const sloganTitleModel = models.find(m => m.elementType === 'PRODUCT_SLOGAN_TITLE');
    const sloganSideModel = models.find(m => m.elementType === 'PRODUCT_SLOGAN_SIDE');
    const legacySloganModel = models.find(m => m.elementType === 'PRODUCT_SLOGAN');
    const priceModel = models.find(m => m.elementType === 'PRICE');

    // Textos e valores comerciais
    const displayTitle = titleModel?.prompt && !titleModel.prompt.includes('{{')
      ? titleModel.prompt
      : 'OFERTA ESPECIAL';
    const productName = product.name || 'Produto Móveis Morante';
    const regularPrice = product.oldPrice || product.regular_price || null;
    const promotionalPrice = product.price || product.promotional_price || '0,00';
    const installmentText = product.installmentValue || 'EM ATÉ 10X SEM JUROS';

    // 1. Slogan do Produto (Abaixo do Título)
    const productTitleSlogan = sloganTitleModel?.prompt && !sloganTitleModel.prompt.includes('{{')
      ? sloganTitleModel.prompt
      : product.category
      ? `Mais conforto e qualidade para seu ${product.category.toLowerCase()}`
      : 'Qualidade superior para sua casa';

    // 2. Slogan do Produto (Ao lado do móvel — caligráfico com sublinhado amarelo)
    const productSideSlogan = sloganSideModel?.prompt && !sloganSideModel.prompt.includes('{{')
      ? sloganSideModel.prompt
      : legacySloganModel?.prompt && !legacySloganModel.prompt.includes('{{')
      ? legacySloganModel.prompt
      : 'Design elegante para o seu ambiente';

    const primaryImg = productImages?.primary?.url || product.mainImageUrl || '';
    const openViewImg = productImages?.openView?.url || null;
    const variationImages = (productImages?.variations || []).filter(v => v.url && v.url !== primaryImg);

    const logoUrl = officialAssets?.logo?.url || '/images/logo-morante.png';
    const badgeUrl = officialAssets?.badge?.url || null;

    return (
      <div
        ref={ref}
        id="marketing-post-canvas"
        className="relative w-full max-w-[500px] overflow-hidden rounded-xl shadow-2xl select-none"
        style={{
          aspectRatio: aspectRatioStyle,
          backgroundColor: isWhiteBg ? '#ffffff' : '#002B49',
        }}
      >
        {/* =========================================================================
         * CAMADA 1: FUNDO (BRANCO PADRÃO OU IMAGEM IA OU ESTÚDIO AZUL INSTITUCIONAL)
         * ========================================================================= */}
        {isWhiteBg ? (
          <div className="absolute inset-0 bg-white pointer-events-none" />
        ) : backgroundUrl ? (
          <img
            crossOrigin="anonymous"
            src={backgroundUrl}
            alt="Ambiente do móvel"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 pointer-events-none">
            {/* Parede/fundo azul marinho institucional sofisticado */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#001f35] via-[#002B49] to-[#001826]" />
            {/* Iluminação de estúdio publicitário no móvel com tom dourado suave */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[75%] rounded-full opacity-40 blur-3xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(247,183,49,0.3) 0%, rgba(0,43,73,0.3) 60%, transparent 85%)',
              }}
            />
            {/* Linha de piso / chão com textura */}
            <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-gradient-to-t from-[#001420] via-[#002138] to-transparent border-t border-amber-500/15" />
          </div>
        )}

        {/* =========================================================================
         * CAMADA 2: ASSETS OFICIAIS (LOGO OFICIAL E SELO DE OPORTUNIDADE)
         * ========================================================================= */}
        {/* Topo Esquerdo: Logo Oficial da Móveis Morante (Arquivo Original Intacto) */}
        <div className="absolute top-[4%] left-[4.5%] z-20 w-[30%] max-w-[140px] drop-shadow-md">
          <img
            crossOrigin="anonymous"
            src={logoUrl}
            alt="Móveis Morante"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Topo Direito: Selo Oficial da Oportunidade (Arquivo Original Intacto) */}
        {badgeUrl && (
          <div className="absolute top-[3%] right-[4.5%] z-20 w-[24%] max-w-[110px] drop-shadow-lg">
            <img
              crossOrigin="anonymous"
              src={badgeUrl}
              alt="Selo Oportunidade"
              className="w-full h-auto object-contain"
            />
          </div>
        )}

        {/* =========================================================================
         * CAMADA 3: FOTO PRINCIPAL DO PRODUTO AMBIENTADA COM SOMBRA NO CHÃO
         * ========================================================================= */}
        <div
          className={`absolute z-10 flex items-center justify-center pointer-events-none ${
            isStory
              ? 'top-[16%] left-[6%] w-[88%] h-[40%]'
              : 'top-[14%] left-[4%] w-[56%] h-[58%]'
          }`}
        >
          {/* Sombra de Contato Elíptica no Piso */}
          <div
            className={`absolute bottom-[4%] w-[80%] h-[12%] rounded-full blur-md ${
              isWhiteBg ? 'bg-slate-900/25' : 'bg-black/75'
            }`}
            style={{ transform: 'scaleY(0.4)' }}
          />

          {primaryImg && (
            <img
              crossOrigin="anonymous"
              src={primaryImg}
              alt={productName}
              className="relative max-w-full max-h-full object-contain"
              style={{
                filter: isWhiteBg
                  ? 'drop-shadow(0 14px 18px rgba(0,0,0,0.18))'
                  : 'drop-shadow(0 18px 24px rgba(0,0,0,0.65))',
              }}
            />
          )}
        </div>

        {/* =========================================================================
         * CAMADA 4: SLOGAN 2 DO PRODUTO (AO LADO DO MÓVEL — CALIGRÁFICO COM LINHA AMARELA)
         * ========================================================================= */}
        <div
          className={`absolute z-20 ${
            isStory
              ? 'top-[57%] left-[6%] right-[6%] text-center'
              : 'bottom-[22%] left-[4.5%] max-w-[48%]'
          }`}
        >
          <div className="inline-block relative">
            <p
              className="font-serif italic text-sm sm:text-base leading-snug drop-shadow"
              style={{
                color: themeStyle.sloganColor,
                fontFamily: '"Caveat", "Dancing Script", Georgia, serif',
              }}
            >
              "{productSideSlogan}"
            </p>
            {/* Traçado amarelo destacado embaixo (linha caligráfica amarela) */}
            <div
              className="h-[2px] w-full mt-0.5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #F7B731 0%, #FFC107 80%, transparent 100%)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            />
          </div>
        </div>

        {/* =========================================================================
         * CAMADA 5: BLOCO DE CONTEÚDO COMERCIAL (TÍTULO, NOME, SLOGAN ABAIXO DO TÍTULO E PREÇOS)
         * ========================================================================= */}
        <div
          className={`absolute z-20 flex flex-col justify-center ${
            isStory
              ? 'top-[63%] left-[6%] right-[6%] items-center text-center'
              : 'top-[20%] right-[4.5%] w-[42%] items-start text-left'
          }`}
        >
          {/* Título de Oferta com cor e glow */}
          <span
            className="text-[11px] font-black uppercase tracking-wider drop-shadow-sm"
            style={{
              color: themeStyle.titleColor,
              textShadow: themeStyle.titleGlow,
            }}
          >
            {displayTitle}
          </span>

          {/* Nome do Produto */}
          <h2
            className={`text-sm sm:text-base font-black leading-tight line-clamp-2 mt-0.5 ${
              isWhiteBg ? 'text-slate-900 drop-shadow-none' : 'text-white drop-shadow'
            }`}
          >
            {productName}
          </h2>

          {/* Slogan 1 do Produto (Abaixo do Título) */}
          <p
            className={`text-[10px] sm:text-[11px] font-medium leading-tight mt-1 line-clamp-2 ${
              isWhiteBg ? 'text-slate-600' : 'text-slate-200'
            }`}
          >
            {productTitleSlogan}
          </p>

          {/* Bloco de Preço Publicitário de Varejo com Gradiente/Cores Harmonizadas */}
          <div
            className="mt-2 w-full max-w-[210px] p-2.5 rounded-xl shadow-xl border"
            style={{
              background: themeStyle.priceCardBg,
              borderColor: themeStyle.priceCardBorder,
            }}
          >
            {regularPrice && (
              <div
                className="text-[10px] line-through font-semibold leading-none mb-0.5"
                style={{ color: themeStyle.priceOldTextColor }}
              >
                De {regularPrice}
              </div>
            )}

            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-white/90">Por</span>
              <span
                className="text-lg sm:text-xl font-black tracking-tight"
                style={{ color: themeStyle.priceTextColor }}
              >
                {promotionalPrice}
              </span>
            </div>

            {/* Condição de Parcelamento e Bandeiras */}
            <div className="mt-1 pt-1 border-t border-white/20">
              <div
                className="text-[9px] font-black uppercase tracking-wide leading-tight"
                style={{ color: themeStyle.installmentTextColor }}
              >
                {installmentText}
              </div>
              <div className="mt-1 w-full max-w-[130px]">
                <PaymentBrands />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
         * CAMADA 6: IMAGENS SECUNDÁRIAS COM BORDA BRANCA (VISÃO INTERNA E CORES)
         * Conforme solicitado: Foto 2 (aberto) e fotos de variação têm borda branca.
         * ========================================================================= */}
        <div
          className={`absolute z-20 flex items-center gap-2 ${
            isStory
              ? 'bottom-[6%] left-[6%] right-[6%] justify-center'
              : 'bottom-[4%] left-[4.5%] right-[4.5%] justify-between'
          }`}
        >
          {/* Imagens com Borda Branca */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Visão Interna (Móvel Aberto) */}
            {openViewImg && (
              <div
                className={`relative overflow-hidden bg-white rounded-lg border-2 border-white ${
                  isWhiteBg ? 'shadow-[0_4px_12px_rgba(0,0,0,0.18)]' : 'shadow-xl'
                }`}
                style={{ width: isStory ? '56px' : '68px', height: isStory ? '56px' : '68px' }}
                title="Visão Interna (Móvel Aberto)"
              >
                <img
                  crossOrigin="anonymous"
                  src={openViewImg}
                  alt="Espaço Interno"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[7px] text-white font-bold text-center py-0.5">
                  Por Dentro
                </span>
              </div>
            )}

            {/* 2. Miniaturas das Outras Variações (Cores Reais) */}
            {variationImages.slice(0, 3).map((v, i) => (
              <div
                key={v.url || i}
                className={`relative overflow-hidden bg-white rounded-md border-2 border-white ${
                  isWhiteBg ? 'shadow-[0_4px_10px_rgba(0,0,0,0.16)]' : 'shadow-lg'
                }`}
                style={{ width: isStory ? '46px' : '54px', height: isStory ? '46px' : '54px' }}
                title={v.name || `Opção de Cor ${i + 1}`}
              >
                <img
                  crossOrigin="anonymous"
                  src={v.url}
                  alt={v.name || 'Variação'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Benefícios Comerciais Autorizados com cor de contraste */}
          <div
            className="hidden sm:flex flex-col items-end text-[8px] font-bold drop-shadow leading-tight"
            style={{ color: themeStyle.benefitsTextColor }}
          >
            <span>✓ Entrega Rápida</span>
            <span>✓ Montagem Inclusa</span>
            <span>✓ Frete Grátis até 100km</span>
          </div>
        </div>
      </div>
    );
  }
);
