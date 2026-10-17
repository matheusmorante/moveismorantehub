import React from 'react';
import { LabelGridModelCanvasElement } from './LabelGridModelCanvasElement';
import type { LabelGridModelCanvasElementData } from './LabelGridModelCanvasElement';
import { LabelGridModelElementSelector } from './LabelGridModelElementSelector';

export interface LabelGridModelDesignCanvasProps {
  customWidth: number;
  customHeight: number;
  columns: number;
  rows: number;
  gapH: number;
  gapV: number;
  marginL: number;
  marginR: number;
  marginT: number;
  marginB: number;
  bgColor: string;
  effectivePreviewImage: string | null;
  imageScale: number;
  setPreviewRef: (el: HTMLDivElement | null) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  showGuides: { h: boolean; v: boolean };

  isPromoPreview: boolean;
  promoNamePos: { x: number; y: number };
  namePos: { x: number; y: number };
  promoNameWidth: number;
  nameWidth: number;
  promoNameHeight: number;
  nameHeight: number;
  promoNameFontSize: number;
  nameFontSize: number;
  promoNameColor: string;
  nameColor: string;
  promoNameBold: boolean;
  nameBold: boolean;
  promoNameAlign: 'left' | 'center' | 'right';
  nameAlign: 'left' | 'center' | 'right';
  promoNameVAlign: 'top' | 'middle' | 'bottom';
  nameVAlign: 'top' | 'middle' | 'bottom';
  promoNameBgColor: string;
  nameBgColor: string;

  promoPos: { x: number; y: number };
  pricePos: { x: number; y: number };
  promoWidth: number;
  priceWidth: number;
  promoHeight: number;
  priceHeight: number;
  promoPriceFontSize?: number;
  priceFontSize?: number;
  priceFontSizeThousands?: number;
  promoPriceColor: string;
  priceColor: string;
  promoPriceBold: boolean;
  priceBold: boolean;
  promoPriceAlign: 'left' | 'center' | 'right';
  priceAlign: 'left' | 'center' | 'right';
  promoPriceVAlign: 'top' | 'middle' | 'bottom';
  priceVAlign: 'top' | 'middle' | 'bottom';
  promoBgColor: string;
  priceBgColor: string;

  oldPricePos: { x: number; y: number };
  oldPriceWidth: number;
  oldPriceHeight: number;
  oldPriceFontSize: number;
  oldPriceColor: string;
  oldPriceBold: boolean;
  oldPriceAlign: 'left' | 'center' | 'right';
  oldPriceVAlign: 'top' | 'middle' | 'bottom';

  priceFormat: 'standard' | 'split';
  promoPriceSymbolPos: { x: number; y: number };
  priceSymbolPos: { x: number; y: number };
  promoPriceSymbolFontSize?: number;
  priceSymbolFontSize?: number;
  promoPriceSymbolColor: string;
  priceSymbolColor: string;
  promoPriceSymbolBold: boolean;
  priceSymbolBold: boolean;

  promoPriceDecimalsPos: { x: number; y: number };
  priceDecimalsPos: { x: number; y: number };
  promoPriceDecimalsFontSize?: number;
  priceDecimalsFontSize?: number;
  promoPriceDecimalsColor: string;
  priceDecimalsColor: string;
  promoPriceDecimalsBold: boolean;
  priceDecimalsBold: boolean;

  currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
  promoBarcodePos: { x: number; y: number };
  barcodePos: { x: number; y: number };

  extraFields: any[];
  extraFieldsPromo: any[];

  draggingElement: string | null;
  resizingElement: string | null;
  selectedElement: string | null;
  editingTextElement: string | null;
  fontFamily: string;
  setDraggingElement: (id: string | null) => void;
  setSelectedElement: (id: string | null) => void;
  setEditingTextElement: (id: string | null) => void;
  updateStyle: (key: string, val: any) => void;
  duplicateExtraField: (field: any) => void;
  removeExtraField: (id: string) => void;
  handleMouseDownResize: (
    e: React.MouseEvent,
    element: string,
    side: 'left' | 'right' | 'font',
    val: number,
    currentX: number,
    currentW: number
  ) => void;
}

export const LabelGridModelDesignCanvas: React.FC<LabelGridModelDesignCanvasProps> = ({
  customWidth,
  customHeight,
  columns,
  rows,
  gapH,
  gapV,
  marginL,
  marginR,
  marginT,
  marginB,
  bgColor,
  effectivePreviewImage,
  imageScale,
  setPreviewRef,
  handleMouseMove,
  handleMouseUp,
  showGuides,
  isPromoPreview,
  promoNamePos,
  namePos,
  promoNameWidth,
  nameWidth,
  promoNameHeight,
  nameHeight,
  promoNameFontSize,
  nameFontSize,
  promoNameColor,
  nameColor,
  promoNameBold,
  nameBold,
  promoNameAlign,
  nameAlign,
  promoNameVAlign,
  nameVAlign,
  promoNameBgColor,
  nameBgColor,
  promoPos,
  pricePos,
  promoWidth,
  priceWidth,
  promoHeight,
  priceHeight,
  promoPriceFontSize,
  priceFontSize,
  priceFontSizeThousands,
  promoPriceColor,
  priceColor,
  promoPriceBold,
  priceBold,
  promoPriceAlign,
  priceAlign,
  promoPriceVAlign,
  priceVAlign,
  promoBgColor,
  priceBgColor,
  oldPricePos,
  oldPriceWidth,
  oldPriceHeight,
  oldPriceFontSize,
  oldPriceColor,
  oldPriceBold,
  oldPriceAlign,
  oldPriceVAlign,
  priceFormat,
  promoPriceSymbolPos,
  priceSymbolPos,
  promoPriceSymbolFontSize,
  priceSymbolFontSize,
  promoPriceSymbolColor,
  priceSymbolColor,
  promoPriceSymbolBold,
  priceSymbolBold,
  promoPriceDecimalsPos,
  priceDecimalsPos,
  promoPriceDecimalsFontSize,
  priceDecimalsFontSize,
  promoPriceDecimalsColor,
  priceDecimalsColor,
  promoPriceDecimalsBold,
  priceDecimalsBold,
  currentCategory,
  promoBarcodePos,
  barcodePos,
  extraFields,
  extraFieldsPromo,
  draggingElement,
  resizingElement,
  selectedElement,
  editingTextElement,
  fontFamily,
  setDraggingElement,
  setSelectedElement,
  setEditingTextElement,
  updateStyle,
  duplicateExtraField,
  removeExtraField,
  handleMouseDownResize,
}) => {
  const paperW = customWidth || 210;
  const paperH = customHeight || 297;
  const cols = columns || 1;
  const rowCount = rows || 1;
  const totalGapW = (gapH || 0) * (cols - 1);
  const totalGapH = (gapV || 0) * (rowCount - 1);
  const totalMarginsW = (marginL || 0) + (marginR || 0);
  const totalMarginsH = (marginT || 0) + (marginB || 0);
  const labelW = (paperW - totalMarginsW - totalGapW) / cols;
  const labelH = (paperH - totalMarginsH - totalGapH) / rowCount;
  const aspectRatio = labelW / labelH;

  return (
    <div className="flex-1 overflow-y-auto p-12 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start gap-12 select-none">
      {/* Visualização da Etiqueta Interativa */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          {/* Área de Sangria Interativa (Azul) - Prioridade Visual para a Imagem */}
          <div
            style={{
              position: 'absolute',
              width: '500px',
              height: `${500 / (aspectRatio || 1)}px`,
              backgroundColor: bgColor || 'white',
              zIndex: 0,
              borderRadius: '8px',
              overflow: 'visible',
            }}
          >
            {effectivePreviewImage && (
              <img
                src={effectivePreviewImage}
                alt=""
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `translate(-50%, -50%) scale(${imageScale})`,
                  transition: 'transform 0.1s ease-out',
                }}
              />
            )}
          </div>

          <div
            ref={setPreviewRef}
            style={{
              width: '500px',
              height: `${500 / (aspectRatio || 1)}px`,
              backgroundColor: 'transparent',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)',
              position: 'relative',
              overflow: 'hidden',
              containerType: 'size',
              border: '1px solid #94a3b8',
              borderRadius: '4px',
              zIndex: 1,
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            {showGuides.h && (
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/50 z-50 pointer-events-none" />
            )}
            {showGuides.v && (
              <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/50 z-50 pointer-events-none" />
            )}

            {[
              {
                id: 'name',
                pos: isPromoPreview ? promoNamePos : namePos,
                width: isPromoPreview ? promoNameWidth : nameWidth,
                height: isPromoPreview ? promoNameHeight : nameHeight,
                font: isPromoPreview ? promoNameFontSize : nameFontSize,
                color: isPromoPreview ? promoNameColor : nameColor,
                bold: isPromoPreview ? promoNameBold : nameBold,
                align: isPromoPreview ? promoNameAlign : nameAlign,
                valign: isPromoPreview ? promoNameVAlign : nameVAlign,
                text: 'Sofá de Canto Luxo Reclinável',
                bgColor: isPromoPreview ? promoNameBgColor : nameBgColor,
              },
              {
                id: 'mainPrice',
                pos: isPromoPreview ? promoPos : pricePos,
                width: isPromoPreview ? promoWidth : priceWidth,
                height: isPromoPreview ? promoHeight : priceHeight,
                font:
                  (isPromoPreview ? promoPriceFontSize || 0 : priceFontSize || 0) +
                  (priceFontSizeThousands || 0),
                color: isPromoPreview ? promoPriceColor : priceColor,
                bold: isPromoPreview ? promoPriceBold : priceBold,
                align: isPromoPreview ? promoPriceAlign : priceAlign,
                valign: isPromoPreview ? promoPriceVAlign : priceVAlign,
                text: isPromoPreview ? '2.990' : '3.490',
                bgColor: isPromoPreview ? promoBgColor : priceBgColor,
              },
              {
                id: 'oldPrice',
                pos: oldPricePos,
                width: oldPriceWidth,
                height: oldPriceHeight,
                font: oldPriceFontSize,
                color: oldPriceColor,
                bold: oldPriceBold,
                align: oldPriceAlign,
                valign: oldPriceVAlign,
                text: (
                  <span className="relative">
                    R$ 3.490,00
                    <div className="absolute top-[50%] left-[-5%] right-[-5%] h-[4px] bg-red-500 rounded-full" />
                  </span>
                ),
                hidden: !isPromoPreview,
                bgColor: 'transparent',
              },
              {
                id: 'priceSymbol',
                pos: isPromoPreview ? promoPriceSymbolPos : priceSymbolPos,
                font: isPromoPreview
                  ? promoPriceSymbolFontSize || 0
                  : priceSymbolFontSize || 0,
                color: isPromoPreview ? promoPriceSymbolColor : priceSymbolColor,
                bold: isPromoPreview ? promoPriceSymbolBold : priceSymbolBold,
                text: 'R$',
                hidden: priceFormat !== 'split',
              },
              {
                id: 'priceDecimals',
                pos: isPromoPreview ? promoPriceDecimalsPos : priceDecimalsPos,
                font: isPromoPreview
                  ? promoPriceDecimalsFontSize || 0
                  : priceDecimalsFontSize || 0,
                color: isPromoPreview ? promoPriceDecimalsColor : priceDecimalsColor,
                bold: isPromoPreview ? promoPriceDecimalsBold : priceDecimalsBold,
                text: ',00',
                hidden: priceFormat !== 'split',
              },
              ...(currentCategory !== 'precos'
                ? [
                    {
                      id: 'barcode',
                      pos: isPromoPreview ? promoBarcodePos : barcodePos,
                      width: 80,
                      isBarcode: true,
                    },
                  ]
                : []),
              ...(isPromoPreview ? extraFieldsPromo || [] : extraFields || []).map(
                (f) => ({
                  id: f.id,
                  pos: { x: f.x, y: f.y },
                  width: f.width || 40,
                  height: f.height || 10,
                  font: f.size,
                  color: f.color,
                  bold: f.bold,
                  align: f.align || 'center',
                  valign: 'middle',
                  text: f.text,
                  hidden: false,
                  bgColor: f.bgColor,
                })
              ),
            ]
              .filter((el) => !el.hidden)
              .map((element) => {
                const el = element as LabelGridModelCanvasElementData;
                return (
                  <LabelGridModelCanvasElement
                    key={el.id}
                    el={el}
                    draggingElement={draggingElement}
                    resizingElement={resizingElement}
                    selectedElement={selectedElement}
                    editingTextElement={editingTextElement}
                    fontFamily={fontFamily}
                    setDraggingElement={setDraggingElement}
                    setSelectedElement={setSelectedElement}
                    setEditingTextElement={setEditingTextElement}
                    updateStyle={updateStyle}
                    duplicateExtraField={duplicateExtraField}
                    removeExtraField={removeExtraField}
                    handleMouseDownResize={handleMouseDownResize}
                  />
                );
              })}
          </div>
        </div>
      </div>

      <LabelGridModelElementSelector
        currentCategory={currentCategory}
        isPromoPreview={isPromoPreview}
        extraFields={extraFields}
        extraFieldsPromo={extraFieldsPromo}
        selectedElement={selectedElement}
        onSelectElement={(elementId) => setSelectedElement(elementId)}
      />
    </div>
  );
};
