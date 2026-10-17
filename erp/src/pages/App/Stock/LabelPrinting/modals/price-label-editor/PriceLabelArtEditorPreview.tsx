import React from 'react';
import { PriceLabelArtRenderer } from '../../components/PriceLabelArtRenderer';
import type { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

export interface PriceLabelArtEditorPreviewProps {
  isArtConfigLoading: boolean;
  previewRef: React.RefObject<HTMLDivElement | null>;
  artworkSizeMm: { widthMm: number; heightMm: number };

  selectedMagnitude: 'tens' | 'hundreds' | 'thousands';
  selectedElement: PriceLabelLayerKey;
  setSelectedElement: (layer: PriceLabelLayerKey) => void;
  selectedElements: Set<PriceLabelLayerKey>;
  setSelectedElements: React.Dispatch<React.SetStateAction<Set<PriceLabelLayerKey>>>;

  // Title
  title: string;
  showTitle: boolean;
  titleFontSizeTens: number;
  titleFontSizeHundreds: number;
  titleFontSizeThousands: number;
  titleColor: string;
  titleFontFamily: string;
  titlePos: { x: number; y: number };
  titleRotation: number;
  titleWidth: number;
  setTitleWidth: (w: number) => void;

  // De
  deText: string;
  showDe: boolean;
  deFontSizeTens: number;
  deFontSizeHundreds: number;
  deFontSizeThousands: number;
  deColor: string;
  deFontFamily: string;
  deRotation: number;

  // Normal Price
  normalPrice: string;
  showNormalPrice: boolean;
  normalPriceFontSizeTens: number;
  normalPriceFontSizeHundreds: number;
  normalPriceFontSizeThousands: number;
  normalPriceColor: string;
  normalPriceFontFamily: string;
  normalPriceRotation: number;

  // Por
  porText: string;
  showPor: boolean;
  porFontSizeTens: number;
  porFontSizeHundreds: number;
  porFontSizeThousands: number;
  porColor: string;
  porFontFamily: string;
  porRotation: number;

  // Group
  dePricePorGroupPos: { x: number; y: number };
  dePricePorGroupRotation: number;
  dePricePorGroupGap: number;

  // Currency
  currencySymbol: string;
  showCurrency: boolean;
  currencyFontSizeTens: number;
  currencyFontSizeHundreds: number;
  currencyFontSizeThousands: number;
  currencyColor: string;
  currencyFontFamily: string;
  currencyPos: { x: number; y: number };
  currencyRotation: number;

  // Promo Price
  promoPrice: string;
  showPromoPrice: boolean;
  priceColor: string;
  promoPriceFontFamily: string;
  promoPricePos: { x: number; y: number };
  promoPriceRotation: number;
  scaleTens: number;
  scaleHundreds: number;
  scaleThousands: number;
  showPromoPriceTens: boolean;
  showPromoPriceHundreds: boolean;
  showPromoPriceThousands: boolean;

  // Cents
  centsText: string;
  showCents: boolean;
  centsFontSizeTens: number;
  centsFontSizeHundreds: number;
  centsFontSizeThousands: number;
  centsColor: string;
  centsFontFamily: string;
  centsPos: { x: number; y: number };
  centsRotation: number;

  // Installments
  installments: string;
  showInstallments: boolean;
  installmentsFontSizeTens: number;
  installmentsFontSizeHundreds: number;
  installmentsFontSizeThousands: number;
  installmentsColor: string;
  installmentsFontFamily: string;
  installmentsPos: { x: number; y: number };
  installmentsRotation: number;

  // Background & Opp
  bgColor: string;
  oppColorsMap: Record<string, Record<string, string>>;
  selectedOppId: string;
  defaultBgColor: string;

  // Test values modal state
  isTestValuesModalOpen: boolean;
  testDezenaD1: number;
  testDezenaD2: number;
  testCentenaD1: number;
  testCentenaD2: number;
  testCentenaD3: number;
  testMilharD1: number;
  testMilharD2: number;
  testMilharD3: number;
  testMilharD4: number;
  testNormalD1: number;
  testNormalD2: number;
  testNormalD3: number;

  // Interactions
  handleElementClick: (layer: PriceLabelLayerKey, e: React.MouseEvent) => void;
  startDragging: (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => void;
  startResizing: (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => void;
  startRotating: (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => void;

  // Guides & Margins
  showSafetyMargin: boolean;
  activeGuideX: number | null;
  activeGuideY: number | null;
}

const formatDisplayPrice = (val: string) => {
  if (!val) return '0';
  const clean = val.replace(/[^\d,.]/g, '');
  return clean || '0';
};

export const PriceLabelArtEditorPreview: React.FC<PriceLabelArtEditorPreviewProps> = ({
  isArtConfigLoading,
  previewRef,
  artworkSizeMm,
  selectedMagnitude,
  selectedElement,
  setSelectedElement,
  selectedElements,
  setSelectedElements,
  title,
  showTitle,
  titleFontSizeTens,
  titleFontSizeHundreds,
  titleFontSizeThousands,
  titleColor,
  titleFontFamily,
  titlePos,
  titleRotation,
  titleWidth,
  setTitleWidth,
  deText,
  showDe,
  deFontSizeTens,
  deFontSizeHundreds,
  deFontSizeThousands,
  deColor,
  deFontFamily,
  deRotation,
  normalPrice,
  showNormalPrice,
  normalPriceFontSizeTens,
  normalPriceFontSizeHundreds,
  normalPriceFontSizeThousands,
  normalPriceColor,
  normalPriceFontFamily,
  normalPriceRotation,
  porText,
  showPor,
  porFontSizeTens,
  porFontSizeHundreds,
  porFontSizeThousands,
  porColor,
  porFontFamily,
  porRotation,
  dePricePorGroupPos,
  dePricePorGroupRotation,
  dePricePorGroupGap,
  currencySymbol,
  showCurrency,
  currencyFontSizeTens,
  currencyFontSizeHundreds,
  currencyFontSizeThousands,
  currencyColor,
  currencyFontFamily,
  currencyPos,
  currencyRotation,
  promoPrice,
  showPromoPrice,
  priceColor,
  promoPriceFontFamily,
  promoPricePos,
  promoPriceRotation,
  scaleTens,
  scaleHundreds,
  scaleThousands,
  showPromoPriceTens,
  showPromoPriceHundreds,
  showPromoPriceThousands,
  centsText,
  showCents,
  centsFontSizeTens,
  centsFontSizeHundreds,
  centsFontSizeThousands,
  centsColor,
  centsFontFamily,
  centsPos,
  centsRotation,
  installments,
  showInstallments,
  installmentsFontSizeTens,
  installmentsFontSizeHundreds,
  installmentsFontSizeThousands,
  installmentsColor,
  installmentsFontFamily,
  installmentsPos,
  installmentsRotation,
  bgColor,
  oppColorsMap,
  selectedOppId,
  defaultBgColor,
  isTestValuesModalOpen,
  testDezenaD1,
  testDezenaD2,
  testCentenaD1,
  testCentenaD2,
  testCentenaD3,
  testMilharD1,
  testMilharD2,
  testMilharD3,
  testMilharD4,
  testNormalD1,
  testNormalD2,
  testNormalD3,
  handleElementClick,
  startDragging,
  startResizing,
  startRotating,
  showSafetyMargin,
  activeGuideX,
  activeGuideY,
}) => {
  if (isArtConfigLoading) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-200/50 dark:bg-slate-950/80">
        <div className="flex items-center gap-3 rounded-2xl bg-white/90 dark:bg-slate-900 px-5 py-3 shadow-lg border border-slate-200 dark:border-slate-800">
          <span className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Carregando template
          </span>
        </div>
      </div>
    );
  }

  const activeTitleFontSize =
    selectedMagnitude === 'tens'
      ? titleFontSizeTens
      : selectedMagnitude === 'hundreds'
        ? titleFontSizeHundreds
        : titleFontSizeThousands;
  const activeDeFontSize =
    selectedMagnitude === 'tens'
      ? deFontSizeTens
      : selectedMagnitude === 'hundreds'
        ? deFontSizeHundreds
        : deFontSizeThousands;
  const activeNormalPriceFontSize =
    selectedMagnitude === 'tens'
      ? normalPriceFontSizeTens
      : selectedMagnitude === 'hundreds'
        ? normalPriceFontSizeHundreds
        : normalPriceFontSizeThousands;
  const activePorFontSize =
    selectedMagnitude === 'tens'
      ? porFontSizeTens
      : selectedMagnitude === 'hundreds'
        ? porFontSizeHundreds
        : porFontSizeThousands;
  const activeCurrencyFontSize =
    selectedMagnitude === 'tens'
      ? currencyFontSizeTens
      : selectedMagnitude === 'hundreds'
        ? currencyFontSizeHundreds
        : currencyFontSizeThousands;
  const activeCentsFontSize =
    selectedMagnitude === 'tens'
      ? centsFontSizeTens
      : selectedMagnitude === 'hundreds'
        ? centsFontSizeHundreds
        : centsFontSizeThousands;
  const activeInstallmentsFontSize =
    selectedMagnitude === 'tens'
      ? installmentsFontSizeTens
      : selectedMagnitude === 'hundreds'
        ? installmentsFontSizeHundreds
        : installmentsFontSizeThousands;
  const activePromoPriceScale =
    selectedMagnitude === 'tens'
      ? scaleTens
      : selectedMagnitude === 'hundreds'
        ? scaleHundreds
        : scaleThousands;

  return (
    <div
      onClick={() => {
        setSelectedElement(null);
        setSelectedElements(new Set());
      }}
      className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 lg:p-14 bg-slate-200/50 dark:bg-slate-950/80 overflow-y-auto custom-scrollbar relative z-20"
    >
      <div className="w-full max-w-full lg:max-w-4xl xl:max-w-5xl flex flex-col items-center justify-center my-auto p-4 sm:p-6 overflow-visible">
        {/* Etiqueta de Preço: Renderizador Unificado 1:1 */}
        <PriceLabelArtRenderer
          containerRefOut={previewRef}
          mode="edit"
          data={{
            artWidthMm: artworkSizeMm.widthMm,
            artHeightMm: artworkSizeMm.heightMm,
            title,
            showTitle,
            titleFontSize: activeTitleFontSize,
            titleColor,
            titleFontFamily,
            titlePos,
            titleRotation,
            titleWidth,

            deText,
            showDe,
            deFontSize: activeDeFontSize,
            deColor,
            deFontFamily,
            deRotation,

            normalPrice: isTestValuesModalOpen
              ? `${testNormalD1}${testNormalD2}${testNormalD3},00`
              : formatDisplayPrice(normalPrice),
            showNormalPrice,
            normalPriceFontSize: activeNormalPriceFontSize,
            normalPriceColor,
            normalPriceFontFamily,
            normalPriceRotation,

            porText,
            showPor,
            porFontSize: activePorFontSize,
            porColor,
            porFontFamily,
            porRotation,

            dePricePorGroupPos,
            dePricePorGroupRotation,
            dePricePorGroupGap,

            currencySymbol,
            showCurrency,
            currencyFontSize: activeCurrencyFontSize,
            currencyColor,
            currencyFontFamily,
            currencyPos,
            currencyRotation,

            promoPrice: promoPrice,
            showPromoPrice,
            priceScale: activePromoPriceScale,
            priceColor,
            promoPriceFontFamily,
            promoPricePos,
            promoPriceRotation,

            centsText,
            showCents,
            centsFontSize: activeCentsFontSize,
            centsColor,
            centsFontFamily,
            centsPos,
            centsRotation,

            installments,
            showInstallments,
            installmentsFontSize: activeInstallmentsFontSize,
            installmentsColor,
            installmentsFontFamily,
            installmentsPos,
            installmentsRotation,

            bgColor:
              bgColor && bgColor !== 'transparent'
                ? bgColor
                : oppColorsMap[selectedOppId]?.background || defaultBgColor,

            showPromoPriceThousands,
            showPromoPriceHundreds,
            showPromoPriceTens,
            scaleThousands,
            scaleHundreds,
            scaleTens,
            testMilharStr: isTestValuesModalOpen
              ? `${testMilharD1}.${testMilharD2}${testMilharD3}${testMilharD4}`
              : undefined,
            testCentenaStr: isTestValuesModalOpen
              ? `${testCentenaD1}${testCentenaD2}${testCentenaD3}`
              : undefined,
            testDezenaStr: isTestValuesModalOpen
              ? `${testDezenaD1}${testDezenaD2}`
              : undefined,
            selectedMagnitude,
          }}
          selectedElement={selectedElement}
          selectedElements={selectedElements}
          onSelectElement={handleElementClick}
          startDragging={startDragging}
          startResizing={startResizing}
          startRotating={startRotating}
          onTitleWidthChange={setTitleWidth}
          showSafetyMargin={showSafetyMargin}
          activeGuideX={activeGuideX}
          activeGuideY={activeGuideY}
        />
      </div>
    </div>
  );
};
