import type { LabelConfig } from '../utils/LabelConstants';

interface PriceLabelAutoSaveConfigInput {
  artConfig: LabelConfig['artConfig'];
  snapshot: Record<string, any>;
  oppColorsMap: Record<string, Record<string, string>>;
  selectedOppId: string;
  title: string;
  normalPrice: string;
  promoPrice: string;
  showPromoPrice: boolean;
  priceColor: string;
  showTitle: boolean;
  scaleTens: number;
  scaleHundreds: number;
  scaleThousands: number;
  scaleTenThousands: number;
  titlePos: { x: number; y: number };
  titleWidth: number;
  promoPricePos: { x: number; y: number };
  dePricePorGroupPos: { x: number; y: number };
  dePricePorGroupRotation: number;
  dePricePorGroupGap: number;
}

export function buildPriceLabelAutoSaveConfig({
  artConfig,
  snapshot,
  oppColorsMap,
  selectedOppId,
  title,
  normalPrice,
  promoPrice,
  showPromoPrice,
  priceColor,
  showTitle,
  scaleTens,
  scaleHundreds,
  scaleThousands,
  scaleTenThousands,
  titlePos,
  titleWidth,
  promoPricePos,
  dePricePorGroupPos,
  dePricePorGroupRotation,
  dePricePorGroupGap,
}: PriceLabelAutoSaveConfigInput): Partial<LabelConfig> {
  const {
    fabricTemplateJson: _legacyFabricTemplate,
    fabricDataUrl: _legacyFabricImage,
    ...currentArtConfig
  } = (artConfig || {}) as Record<string, any>;

  const fullArtConfig = {
    ...currentArtConfig,
    globalSnapshot: snapshot,
    oppColorsMap: {
      ...(currentArtConfig.oppColorsMap || {}),
      ...oppColorsMap,
    },
    opportunities: {
      ...Object.fromEntries(
        Object.keys(currentArtConfig.opportunities || {}).map((oppId) => [oppId, snapshot])
      ),
      default: snapshot,
      none: snapshot,
      [selectedOppId]: snapshot,
    },
  };

  return {
    artConfig: fullArtConfig,
    text: title,
    price: normalPrice,
    promoPrice,
    showPromoPrice,
    bg_color: oppColorsMap.none?.background || '#ffffff',
    priceColor,
    promoPriceColor: priceColor,
    priceFormat: 'split' as const,
    showName: showTitle,
    priceFontSizeTens: scaleTens,
    priceFontSizeHundreds: scaleHundreds,
    priceFontSizeThousands: scaleThousands,
    priceFontSizeTenThousands: scaleTenThousands,
    namePosX: titlePos.x,
    namePosY: titlePos.y,
    nameWidth: titleWidth,
    pricePosX: promoPricePos.x,
    pricePosY: promoPricePos.y,
    dePricePorGroupPos,
    dePricePorGroupRotation,
    dePricePorGroupGap,
  };
}
