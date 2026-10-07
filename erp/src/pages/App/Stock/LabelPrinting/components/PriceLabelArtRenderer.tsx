import React, { useRef } from 'react';
import { usePriceLabelFonts } from '../hooks/usePriceLabelFonts';
import { usePriceLabelCanvasScale } from '../hooks/usePriceLabelCanvasScale';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';
import type { PriceLabelArtData } from '../types/PriceLabelArtData';
import { PriceLabelDealPriceGroup } from './PriceLabelDealPriceGroup';
import { PriceLabelTitleLayer } from './PriceLabelTitleLayer';

export type { PriceLabelArtData } from '../types/PriceLabelArtData';

type InteractivePriceLabelLayer = Exclude<PriceLabelLayerKey, null>;

export interface PriceLabelArtRendererProps {
  data: PriceLabelArtData;
  mode?: 'edit' | 'view';
  selectedElement?: PriceLabelLayerKey;
  selectedElements?: Set<PriceLabelLayerKey>;
  onSelectElement?: (element: InteractivePriceLabelLayer, e: React.MouseEvent) => void;
  startDragging?: (layer: InteractivePriceLabelLayer, e: React.MouseEvent | React.TouchEvent) => void;
  startResizing?: (layer: InteractivePriceLabelLayer, e: React.MouseEvent | React.TouchEvent) => void;
  startRotating?: (layer: InteractivePriceLabelLayer, e: React.MouseEvent | React.TouchEvent) => void;
  showSafetyMargin?: boolean;
  activeGuideX?: number | null;
  activeGuideY?: number | null;
  className?: string;
  style?: React.CSSProperties;
  containerRefOut?: React.RefObject<HTMLDivElement>;
  onTitleWidthChange?: (width: number) => void;
}

export const BASE_ART_WIDTH = 840;
export const BASE_ART_HEIGHT = 480;
export const RENDER_DPI = 300;
const CSS_DPI = 96;
const MM_PER_INCH = 25.4;

export const mmToPx = (millimeters: number, dpi = RENDER_DPI) => (millimeters * dpi) / MM_PER_INCH;

const getOpaqueBackgroundColor = (color?: string) => {
  const normalized = color?.trim().toLowerCase();
  const rgba = normalized?.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
  if (!normalized || normalized === 'transparent' || (rgba && Number(rgba[1]) === 0)) {
    return '#ffffff';
  }
  return color;
};

export const PriceLabelArtRenderer: React.FC<PriceLabelArtRendererProps> = ({
  data,
  mode = 'view',
  selectedElement = null,
  selectedElements = new Set(),
  onSelectElement,
  startDragging,
  startResizing,
  startRotating,
  showSafetyMargin = false,
  activeGuideX = null,
  activeGuideY = null,
  className = '',
  style = {},
  containerRefOut,
  onTitleWidthChange,
}) => {
  const isEdit = mode === 'edit';
  const fontsReady = usePriceLabelFonts();
  const localContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = containerRefOut || localContainerRef;

  const {
    artWidthMm,
    artHeightMm,
    currencySymbol,
    showCurrency = true,
    currencyFontSize,
    currencyColor,
    currencyFontFamily,
    currencyPos,
    currencyRotation,
    promoPrice,
    showPromoPrice = true,
    priceScale,
    priceColor,
    promoPriceFontFamily,
    promoPricePos,
    promoPriceRotation,
    centsText,
    showCents = true,
    centsFontSize,
    centsColor,
    centsFontFamily,
    centsPos,
    centsRotation,
    installments,
    showInstallments = false,
    installmentsFontSize = 14,
    installmentsColor = '#000000',
    installmentsFontFamily = 'Inter, system-ui, sans-serif',
    installmentsPos = { x: 0, y: 0 },
    installmentsRotation = 0,
    bgColor,
    showPromoPriceThousands,
    showPromoPriceHundreds,
    showPromoPriceTens,
    scaleThousands = 80,
    scaleHundreds = 100,
    scaleTens = 120,
    testMilharStr,
    testCentenaStr,
    testDezenaStr,
    selectedMagnitude = 'hundreds',
  } = data;

  // Dimensões do Canvas em 300 DPI baseado no tamanho real em mm
  const canvasWidth =
    artWidthMm && artHeightMm ? Math.round(mmToPx(artWidthMm, RENDER_DPI)) : BASE_ART_WIDTH;
  const canvasHeight =
    artWidthMm && artHeightMm ? Math.round(mmToPx(artHeightMm, RENDER_DPI)) : BASE_ART_HEIGHT;

  const { scale, isPrinting } = usePriceLabelCanvasScale(containerRef, canvasWidth, canvasHeight);
  const printScale =
    artWidthMm && artHeightMm
      ? Math.min(
          mmToPx(artWidthMm, CSS_DPI) / canvasWidth,
          mmToPx(artHeightMm, CSS_DPI) / canvasHeight
        )
      : scale;

  // Arte de preço nunca deve usar transparência: ela seria composta com o
  // fundo do modal no editor e com o da folha na impressão.
  const effectiveBgColor = getOpaqueBackgroundColor(bgColor);

  const content = (
    <div
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${isPrinting ? printScale : scale})`,
        transformOrigin: 'center center',
        overflow: 'visible',
        boxSizing: 'border-box',
        padding: 0,
        margin: 0,
        zIndex: 1,
        opacity: fontsReady ? 1 : 0,
        pointerEvents: isEdit ? 'auto' : 'none',
      }}
    >
      {/* GUIA DE MARGEM DE SEGURANÇA DA IMPRESSÃO (EDITOR) */}
      {isEdit && showSafetyMargin && (
        <div
          data-hide-export="true"
          className="absolute inset-3 sm:inset-4 border border-dashed border-red-500/60 pointer-events-none rounded-2xl z-20"
        />
      )}

      {/* LINHAS GUIA MAGNÉTICAS DE ALINHAMENTO (EDITOR) */}
      {isEdit && activeGuideX !== null && (
        <div
          data-hide-export="true"
          style={{ left: `calc(50% + ${activeGuideX}px)` }}
          className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-500 z-40 pointer-events-none shadow-md animate-fade-in"
        />
      )}
      {isEdit && activeGuideY !== null && (
        <div
          data-hide-export="true"
          style={{ top: `calc(50% + ${activeGuideY}px)` }}
          className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 z-40 pointer-events-none shadow-md animate-fade-in"
        />
      )}

      <PriceLabelTitleLayer
        data={data}
        canvasWidth={canvasWidth}
        scale={scale}
        isEdit={isEdit}
        selectedElement={selectedElement}
        selectedElements={selectedElements}
        onSelectElement={onSelectElement}
        startDragging={startDragging}
        startResizing={startResizing}
        startRotating={startRotating}
        onTitleWidthChange={onTitleWidthChange}
      />
      <PriceLabelDealPriceGroup
        data={data}
        isEdit={isEdit}
        selectedElement={selectedElement}
        selectedElements={selectedElements}
        onSelectElement={onSelectElement}
        startDragging={startDragging}
        startResizing={startResizing}
        startRotating={startRotating}
      />
      {/* 5. SÍMBOLO DA MOEDA "R$" */}
      {showCurrency && (
        <div
          onMouseDown={
            isEdit && startDragging ? (e) => startDragging('currencySymbol', e) : undefined
          }
          onTouchStart={
            isEdit && startDragging ? (e) => startDragging('currencySymbol', e) : undefined
          }
          onClick={
            isEdit && onSelectElement ? (e) => onSelectElement('currencySymbol', e) : undefined
          }
          style={{
            color: currencyColor,
            fontSize: `${currencyFontSize}px`,
            fontFamily: currencyFontFamily,
            top: `calc(50% + ${currencyPos.y}px)`,
            left: `calc(50% + ${currencyPos.x}px)`,
            transform: `translate(-50%, -50%) rotate(${currencyRotation}deg)`,
            cursor: isEdit ? 'move' : 'default',
            zIndex: selectedElements.has('currencySymbol') ? 50 : 25,
          }}
          className={`absolute w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
            isEdit && selectedElements.has('currencySymbol')
              ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none'
              : 'border border-transparent'
          }`}
        >
          {isEdit && selectedElement === 'currencySymbol' && (
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
              SÍMBOLO MOEDA
            </div>
          )}

          <span>{currencySymbol}</span>
          {isEdit && selectedElement === 'currencySymbol' && (
            <>
              {startResizing && (
                <div
                  onMouseDown={(e) => startResizing('currencySymbol', e)}
                  onTouchStart={(e) => startResizing('currencySymbol', e)}
                  title="Arraste para redimensionar"
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                />
              )}
              {startRotating && (
                <div
                  onMouseDown={(e) => startRotating('currencySymbol', e)}
                  onTouchStart={(e) => startRotating('currencySymbol', e)}
                  title="Arraste para rotacionar"
                  className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                >
                  <i className="bi bi-arrow-clockwise text-[11px]" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 6. PREÇO PRINCIPAL */}
      {showPromoPrice && (
        <div
          onMouseDown={isEdit && startDragging ? (e) => startDragging('promoPrice', e) : undefined}
          onTouchStart={isEdit && startDragging ? (e) => startDragging('promoPrice', e) : undefined}
          onClick={isEdit && onSelectElement ? (e) => onSelectElement('promoPrice', e) : undefined}
          style={{
            color: priceColor,
            fontFamily: promoPriceFontFamily,
            top: `calc(50% + ${promoPricePos.y}px)`,
            left: `calc(50% + ${promoPricePos.x}px)`,
            transform: `translate(-50%, -50%) rotate(${promoPriceRotation}deg)`,
            cursor: isEdit ? 'move' : 'default',
            zIndex: selectedElements.has('promoPrice') ? 30 : 10,
          }}
          className={`absolute top-1/2 left-1/2 w-max grid place-items-center px-1 py-1 select-none transition-transform duration-75 whitespace-nowrap ${
            isEdit && selectedElements.has('promoPrice')
              ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none'
              : 'border border-transparent'
          }`}
        >
          {isEdit && selectedElement === 'promoPrice' && (
            <div className="absolute -top-6 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
              PREÇO PRINCIPAL
            </div>
          )}

          {isEdit ? (
            <>
              {/* Visualização de Design Sobreposta (Editor) */}
              {showPromoPriceThousands && (
                <span
                  style={{ fontSize: `${scaleThousands}px`, gridArea: '1 / 1' }}
                  className="font-black tracking-tighter drop-shadow-md leading-none select-none z-10 opacity-90"
                >
                  {testMilharStr || '1.399'}
                </span>
              )}
              {showPromoPriceHundreds && (
                <span
                  style={{ fontSize: `${scaleHundreds}px`, gridArea: '1 / 1' }}
                  className="font-black tracking-tighter drop-shadow-md leading-none select-none z-20 opacity-95"
                >
                  {testCentenaStr || '399'}
                </span>
              )}
              {showPromoPriceTens && (
                <span
                  style={{ fontSize: `${scaleTens}px`, gridArea: '1 / 1' }}
                  className="font-black tracking-tighter drop-shadow-md leading-none select-none z-30"
                >
                  {testDezenaStr || '39'}
                </span>
              )}
            </>
          ) : (
            /* Visualização Real do Produto (Impressão) */
            <span
              style={{ fontSize: `${priceScale}px`, gridArea: '1 / 1' }}
              className="font-black tracking-tighter drop-shadow-md leading-none select-none z-30"
            >
              {promoPrice}
            </span>
          )}

          {isEdit && selectedElement === 'promoPrice' && (
            <>
              {startResizing && (
                <div
                  onMouseDown={(e) => startResizing('promoPrice', e)}
                  onTouchStart={(e) => startResizing('promoPrice', e)}
                  title="Arraste para redimensionar escala do preço"
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-none cursor-se-resize z-40 shadow-xs hover:scale-125"
                />
              )}
              {startRotating && (
                <div
                  onMouseDown={(e) => startRotating('promoPrice', e)}
                  onTouchStart={(e) => startRotating('promoPrice', e)}
                  title="Arraste para rotacionar"
                  className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                >
                  <i className="bi bi-arrow-clockwise text-[11px]" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 7. CENTAVOS ",00" */}
      {showCents && (
        <div
          onMouseDown={isEdit && startDragging ? (e) => startDragging('cents', e) : undefined}
          onTouchStart={isEdit && startDragging ? (e) => startDragging('cents', e) : undefined}
          onClick={isEdit && onSelectElement ? (e) => onSelectElement('cents', e) : undefined}
          style={{
            color: centsColor,
            fontSize: `${centsFontSize}px`,
            fontFamily: centsFontFamily,
            top: `calc(50% + ${centsPos.y}px)`,
            left: `calc(50% + ${centsPos.x}px)`,
            transform: `translate(-50%, -50%) rotate(${centsRotation}deg)`,
            cursor: isEdit ? 'move' : 'default',
            zIndex: selectedElements.has('cents') ? 50 : 25,
          }}
          className={`absolute w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
            isEdit && selectedElements.has('cents')
              ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none'
              : 'border border-transparent'
          }`}
        >
          {isEdit && selectedElement === 'cents' && (
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
              CENTAVOS ({selectedMagnitude.toUpperCase()})
            </div>
          )}

          <span>{centsText}</span>
          {isEdit && selectedElement === 'cents' && (
            <>
              {startResizing && (
                <div
                  onMouseDown={(e) => startResizing('cents', e)}
                  onTouchStart={(e) => startResizing('cents', e)}
                  title="Arraste para redimensionar"
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                />
              )}
              {startRotating && (
                <div
                  onMouseDown={(e) => startRotating('cents', e)}
                  onTouchStart={(e) => startRotating('cents', e)}
                  title="Arraste para rotacionar"
                  className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                >
                  <i className="bi bi-arrow-clockwise text-[11px]" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 8. PARCELAMENTO */}
      {showInstallments && installments && (
        <div
          onMouseDown={
            isEdit && startDragging ? (e) => startDragging('installments', e) : undefined
          }
          onTouchStart={
            isEdit && startDragging ? (e) => startDragging('installments', e) : undefined
          }
          onClick={
            isEdit && onSelectElement ? (e) => onSelectElement('installments', e) : undefined
          }
          style={{
            color: installmentsColor,
            fontSize: `${installmentsFontSize}px`,
            fontFamily: installmentsFontFamily,
            transform: `translate(calc(-50% + ${installmentsPos.x}px), ${installmentsPos.y}px) rotate(${installmentsRotation}deg)`,
            cursor: isEdit ? 'move' : 'default',
            zIndex: selectedElements.has('installments') ? 30 : 10,
          }}
          className={`absolute bottom-3 sm:bottom-5 left-1/2 w-max max-w-[90%] inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-tight px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
            isEdit && selectedElements.has('installments')
              ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none'
              : 'border border-transparent'
          }`}
        >
          {isEdit && selectedElement === 'installments' && (
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
              PARCELAMENTO
            </div>
          )}

          <span>{installments}</span>
          {isEdit && selectedElement === 'installments' && (
            <>
              {startResizing && (
                <div
                  onMouseDown={(e) => startResizing('installments', e)}
                  onTouchStart={(e) => startResizing('installments', e)}
                  title="Arraste para redimensionar"
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                />
              )}
              {startRotating && (
                <div
                  onMouseDown={(e) => startRotating('installments', e)}
                  onTouchStart={(e) => startRotating('installments', e)}
                  title="Arraste para rotacionar"
                  className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                >
                  <i className="bi bi-arrow-clockwise text-[11px]" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  if (isEdit) {
    return (
      <div
        ref={containerRef}
        style={{
          ...style,
          background: effectiveBgColor,
          backgroundColor: effectiveBgColor,
          borderRadius: '24px',
          width: '100%',
          maxWidth: '100%',
          aspectRatio:
            artWidthMm && artHeightMm && artWidthMm >= artHeightMm
              ? `${artWidthMm} / ${artHeightMm}`
              : '1.75 / 1',
          boxSizing: 'border-box',
          padding: 0,
          margin: '0 auto',
          opacity: 1,
          isolation: 'isolate',
          overflow: 'hidden',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectElement) onSelectElement('background', e);
        }}
        className={`w-full rounded-3xl shadow-2xl relative select-none transition-all duration-200 cursor-pointer overflow-hidden ${
          selectedElement === 'background' ? 'ring-2 ring-blue-500 shadow-blue-500/20' : ''
        } ${className}`}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            background: effectiveBgColor,
            backgroundColor: effectiveBgColor,
            borderRadius: 'inherit',
            zIndex: 0,
            opacity: 1,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        />
        {content}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        background: effectiveBgColor,
        backgroundColor: effectiveBgColor,
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: 0,
        margin: 0,
      }}
      className={className}
    >
      {content}
    </div>
  );
};
