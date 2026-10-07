import React from 'react';
import { PriceLabelArtRenderer } from './PriceLabelArtRenderer';
import type { PriceLabelArtData } from '../types/PriceLabelArtData';
import type { LabelConfig } from '../utils/LabelConstants';
import {
  fmtBRL,
  getCentsStr,
  getIntegerPart,
  getPriceMagnitude,
  parseLabelPrice,
} from '../utils/priceLabelFormatting';

interface PriceLabelArtItemConfig extends LabelConfig {
  opportunity?: string | { id?: string; slug?: string } | null;
}

export const PriceLabelArtItem: React.FC<{ config: PriceLabelArtItemConfig }> = ({ config }) => {
  // GUARD: Sem artConfig do BD, não renderizar com fallbacks genéricos
  if (!config.artConfig) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Carregando template...
        </span>
      </div>
    );
  }

  // 1. OPORTUNIDADE DO PRODUTO ATUAL
  const opportunity = config.opportunity;
  const opportunityId =
    typeof opportunity === 'string' ? opportunity : opportunity?.id || opportunity?.slug;
  const oppId = config.opportunityId || config.opportunity_id || opportunityId || 'none';
  const effectiveOppId = oppId || 'none';

  // 2. BUSCA DO TEMPLATE NO SUPABASE (artConfig)
  const dbOppColors =
    config.artConfig?.oppColorsMap?.[effectiveOppId] ??
    config.artConfig?.oppColorsMap?.['none'] ??
    config.artConfig?.oppColorsMap?.['default'] ??
    {};

  // O template é escolhido somente entre snapshots persistidos no banco.
  const dbTemplate =
    config.artConfig?.opportunities?.[effectiveOppId] ??
    config.artConfig?.opportunities?.['none'] ??
    config.artConfig?.opportunities?.['default'] ??
    config.artConfig?.opportunities?.['salvado'] ??
    config.artConfig?.globalSnapshot;

  const template: any = dbTemplate || {};

  // 3. ORDEM DE GRANDEZA BASEADA NO PREÇO PRINCIPAL DO PRODUTO ESCOLHIDO (Dezena, Centena, Milhar)
  const normalPriceValue = parseLabelPrice(config.price);
  const promoPriceValue = parseLabelPrice(config.promoPrice);
  const hasPromotion = Boolean(
    config.showPromoPrice && promoPriceValue !== null && promoPriceValue !== normalPriceValue
  );
  const displayPrice = hasPromotion ? config.promoPrice : config.price || '0';
  const mag = getPriceMagnitude(displayPrice);

  // 4. DESIGN DA GRANDEZA ATUAL, salvo no banco.
  const allMags = template.magnitudeTemplates || {};
  const magDesign = allMags[mag] || {};

  // Combinar template raiz + design de magnitude (dando prioridade aos valores da magnitude ativa)
  const t = { ...template, ...magDesign };
  const oppColors = dbOppColors || {};

  // 5. CORES
  const bgColor = oppColors['background'] ?? t.bgColor;
  const titleColor = oppColors['title'] ?? t.titleColor;
  const deColor = oppColors['deText'] ?? t.deColor;
  const normalPriceColor = oppColors['normalPrice'] ?? t.normalPriceColor;
  const porColor = oppColors['porText'] ?? t.porColor;
  const currencyColor = oppColors['currencySymbol'] ?? t.currencyColor;
  const priceColor = oppColors['promoPrice'] ?? t.priceColor;
  const centsColor = oppColors['cents'] ?? t.centsColor;
  const installmentsColor = oppColors['installments'] ?? t.installmentsColor;

  // 6. Lê exclusivamente o tamanho salvo para a grandeza atual.
  const magnitudeSuffix = mag === 'tens' ? 'Tens' : mag === 'hundreds' ? 'Hundreds' : 'Thousands';
  const readFontSize = (field: string, fallback: number) => {
    const value = t[`${field}FontSize${magnitudeSuffix}`];
    return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  };
  const titleFontSize = readFontSize('title', 36);
  const deFontSize = readFontSize('de', 34);
  const normalPriceFontSize = readFontSize('normalPrice', 34);
  const porFontSize = readFontSize('por', 34);
  const currencyFontSize = readFontSize('currency', 70);
  const centsFontSize = readFontSize('cents', 70);
  const installmentsFontSize = readFontSize('installments', 14);
  const priceScale =
    mag === 'tens'
      ? (t.scaleTens ?? 240)
      : mag === 'hundreds'
        ? (t.scaleHundreds ?? 210)
        : (t.scaleThousands ?? 170);

  // 7. POSIÇÕES E ROTAÇÕES 100% FIÉIS AO TEMPLATE
  const titlePos = t.titlePos ?? { x: 0, y: 0 };
  const titleRot = t.titleRotation ?? 0;

  const groupPos = t.dePricePorGroupPos ?? template.dePricePorGroupPos ?? { x: 0, y: 0 };
  const groupRot = t.dePricePorGroupRotation ?? template.dePricePorGroupRotation ?? 0;
  const groupGap = t.dePricePorGroupGap ?? template.dePricePorGroupGap ?? 0;

  const currPos = t.currencyPos ?? { x: 0, y: 0 };
  const currRot = t.currencyRotation ?? 0;

  const pricePos = t.promoPricePos ?? { x: 0, y: 0 };
  const priceRot = t.promoPriceRotation ?? 0;

  const centsPos = t.centsPos ?? { x: 0, y: 0 };
  const centsRot = t.centsRotation ?? 0;

  const instPos = t.installmentsPos ?? { x: 0, y: 0 };
  const instRot = t.installmentsRotation ?? 0;

  // 8. VISIBILIDADE DOS COMPONENTES
  const showTitle = config.showName !== false && (t.showTitle ?? false);
  const showDe = hasPromotion && (t.showDe ?? false);
  const showNormalPrice = hasPromotion && (t.showNormalPrice ?? false);
  const showPor = hasPromotion && (t.showPor ?? false);
  const showCurrency = t.showCurrency ?? false;
  const showPromoPrice = t.showPromoPrice ?? false;
  const showCents = t.showCents ?? false;
  const showInstallments = t.showInstallments ?? false;

  // 9. VALORES DOS TEXTOS DO PRODUTO SELECIONADO
  const titleText = config.text || config.name || t.title || 'NOME DO PRODUTO';
  const rawNormal = config.price || t.normalPrice || '0';
  const rawPromo = hasPromotion ? config.promoPrice : config.price || t.promoPrice || '0';
  const intDigits = getIntegerPart(rawPromo);
  const centsDisplay = getCentsStr(rawPromo, t.centsText || ',00');

  const artData: PriceLabelArtData = {
    artWidthMm: Number(config.labelWidth) || undefined,
    artHeightMm: Number(config.labelHeight) || undefined,
    fabricTemplateJson:
      t.fabricTemplateJson || (config.artConfig as any)?.fabricTemplateJson || undefined,
    title: titleText,
    showTitle,
    titleFontSize,
    titleColor,
    titleFontFamily: t.titleFontFamily,
    titlePos,
    titleRotation: titleRot,
    titleWidth: t.titleWidth,

    deText: t.deText,
    showDe,
    deFontSize,
    deColor,
    deFontFamily: t.deFontFamily,
    deRotation: t.deRotation ?? 0,

    normalPrice: fmtBRL(rawNormal),
    showNormalPrice,
    normalPriceFontSize,
    normalPriceColor,
    normalPriceFontFamily: t.normalPriceFontFamily,
    normalPriceRotation: t.normalPriceRotation ?? 0,

    porText: t.porText,
    showPor,
    porFontSize,
    porColor,
    porFontFamily: t.porFontFamily,
    porRotation: t.porRotation ?? 0,

    dePricePorGroupPos: groupPos,
    dePricePorGroupRotation: groupRot,
    dePricePorGroupGap: groupGap,

    currencySymbol: t.currencySymbol,
    showCurrency,
    currencyFontSize,
    currencyColor,
    currencyFontFamily: t.currencyFontFamily,
    currencyPos: currPos,
    currencyRotation: currRot,

    promoPrice: intDigits,
    showPromoPrice,
    priceScale,
    priceColor,
    promoPriceFontFamily: t.promoPriceFontFamily,
    promoPricePos: pricePos,
    promoPriceRotation: priceRot,

    centsText: centsDisplay,
    showCents,
    centsFontSize,
    centsColor,
    centsFontFamily: t.centsFontFamily,
    centsPos,
    centsRotation: centsRot,

    installments: t.installments,
    showInstallments,
    installmentsFontSize,
    installmentsColor,
    installmentsFontFamily: t.installmentsFontFamily,
    installmentsPos: instPos,
    installmentsRotation: instRot,

    bgColor,
  };

  return <PriceLabelArtRenderer data={artData} mode="view" />;
};
