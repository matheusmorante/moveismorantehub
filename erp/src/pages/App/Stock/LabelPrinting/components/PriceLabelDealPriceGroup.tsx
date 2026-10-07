import type { MouseEvent, TouchEvent } from 'react';
import type { PriceLabelArtData } from '../types/PriceLabelArtData';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

type InteractivePriceLabelLayer = Exclude<PriceLabelLayerKey, null>;
type InteractionEvent = MouseEvent | TouchEvent;

interface PriceLabelDealPriceGroupProps {
  data: PriceLabelArtData;
  isEdit: boolean;
  selectedElement: PriceLabelLayerKey;
  selectedElements: Set<PriceLabelLayerKey>;
  onSelectElement?: (layer: InteractivePriceLabelLayer, event: MouseEvent) => void;
  startDragging?: (layer: InteractivePriceLabelLayer, event: InteractionEvent) => void;
  startResizing?: (layer: InteractivePriceLabelLayer, event: InteractionEvent) => void;
  startRotating?: (layer: InteractivePriceLabelLayer, event: InteractionEvent) => void;
}

export function PriceLabelDealPriceGroup({
  data,
  isEdit,
  selectedElement,
  selectedElements,
  onSelectElement,
  startDragging,
  startResizing,
  startRotating,
}: PriceLabelDealPriceGroupProps) {
  const {
    deText,
    showDe = true,
    deFontSize,
    deColor,
    deFontFamily,
    deRotation = 0,
    normalPrice,
    showNormalPrice = true,
    normalPriceFontSize,
    normalPriceColor,
    normalPriceFontFamily,
    normalPriceRotation = 0,
    porText,
    showPor = true,
    porFontSize,
    porColor,
    porFontFamily,
    porRotation = 0,
    dePricePorGroupPos,
    dePricePorGroupRotation,
    dePricePorGroupGap,
  } = data;

  return (
    <>
      {/* 2, 3 e 4. CONTAINER AGRUPADO FLEX: DE + PREÇO ORIGINAL + POR */}
      {(showDe || showNormalPrice || showPor) && (
        <div
          onMouseDown={
            isEdit && startDragging
              ? (e) => {
                  if (e.target === e.currentTarget) startDragging('dePricePorGroup', e);
                }
              : undefined
          }
          onTouchStart={
            isEdit && startDragging
              ? (e) => {
                  if (e.target === e.currentTarget) startDragging('dePricePorGroup', e);
                }
              : undefined
          }
          onClick={
            isEdit && onSelectElement
              ? (e) => {
                  if (e.target === e.currentTarget) onSelectElement('dePricePorGroup', e);
                }
              : undefined
          }
          style={{
            gap: `${dePricePorGroupGap}px`,
            // O grupo usa uma largura-base fixa: assim, a troca de
            // "499" por "1.999" não desloca o início de "De" para
            // a esquerda ao centralizar um conteúdo mais largo.
            transform: `translate(calc(-224px + ${dePricePorGroupPos.x}px), calc(-50% + ${dePricePorGroupPos.y}px)) rotate(${dePricePorGroupRotation}deg)`,
            cursor: isEdit ? 'move' : 'default',
            zIndex:
              selectedElements.has('dePricePorGroup') ||
              selectedElements.has('deText') ||
              selectedElements.has('normalPrice') ||
              selectedElements.has('porText')
                ? 30
                : 10,
          }}
          className={`absolute top-1/2 left-1/2 flex w-[448px] flex-row items-baseline justify-start p-0 rounded-xl border select-none transition-all ${
            isEdit && selectedElements.has('dePricePorGroup')
              ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/10 shadow-md'
              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          {isEdit && selectedElement === 'dePricePorGroup' && (
            <div className="absolute -top-6 left-0 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded shadow-xs pointer-events-none z-40 whitespace-nowrap">
              GRUPO PREÇO ANTERIOR (FLEX)
            </div>
          )}

          {/* ELEMENTO 1: TEXTO "DE" */}
          {showDe && (
            <div
              onMouseDown={isEdit && startDragging ? (e) => startDragging('deText', e) : undefined}
              onTouchStart={isEdit && startDragging ? (e) => startDragging('deText', e) : undefined}
              onClick={isEdit && onSelectElement ? (e) => onSelectElement('deText', e) : undefined}
              style={{
                color: deColor,
                fontSize: `${deFontSize}px`,
                fontFamily: deFontFamily,
                transform: deRotation ? `rotate(${deRotation}deg)` : undefined,
                cursor: isEdit ? 'pointer' : 'default',
              }}
              className={`relative inline-flex items-baseline justify-center self-baseline font-black leading-none px-1 py-0.5 select-none transition-all whitespace-nowrap ${
                isEdit && selectedElements.has('deText')
                  ? 'ring-1 ring-emerald-500 border border-emerald-500 bg-emerald-500/20 rounded-sm'
                  : 'border border-transparent hover:border-slate-300'
              }`}
            >
              {isEdit && selectedElement === 'deText' && (
                <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                  TEXTO "DE"
                </div>
              )}
              <span>{deText}</span>
              {isEdit && selectedElement === 'deText' && (
                <>
                  {startResizing && (
                    <div
                      onMouseDown={(e) => startResizing('deText', e)}
                      onTouchStart={(e) => startResizing('deText', e)}
                      title="Arraste para redimensionar"
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-emerald-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                    />
                  )}
                  {startRotating && (
                    <div
                      onMouseDown={(e) => startRotating('deText', e)}
                      onTouchStart={(e) => startRotating('deText', e)}
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

          {/* ELEMENTO 2: PREÇO ORIGINAL (NORMAL) RISCADO */}
          {showNormalPrice && (
            <div
              onMouseDown={
                isEdit && startDragging ? (e) => startDragging('normalPrice', e) : undefined
              }
              onTouchStart={
                isEdit && startDragging ? (e) => startDragging('normalPrice', e) : undefined
              }
              onClick={
                isEdit && onSelectElement ? (e) => onSelectElement('normalPrice', e) : undefined
              }
              style={{
                color: normalPriceColor,
                fontSize: `${normalPriceFontSize}px`,
                fontFamily: normalPriceFontFamily,
                transform: normalPriceRotation ? `rotate(${normalPriceRotation}deg)` : undefined,
                cursor: isEdit ? 'pointer' : 'default',
              }}
              className={`relative inline-flex items-baseline justify-center self-baseline font-black leading-none px-1 py-0.5 whitespace-nowrap select-none transition-all ${
                isEdit && selectedElements.has('normalPrice')
                  ? 'ring-1 ring-emerald-500 border border-emerald-500 bg-emerald-500/20 rounded-sm'
                  : 'border border-transparent hover:border-slate-300'
              }`}
            >
              {isEdit && selectedElement === 'normalPrice' && (
                <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                  PREÇO ORIGINAL
                </div>
              )}

              <span>R$ {normalPrice}</span>
              <span className="absolute left-0.5 right-0.5 top-1/2 -translate-y-1/2 h-[3px] bg-red-600 rounded-none shadow-xs pointer-events-none" />

              {isEdit && selectedElement === 'normalPrice' && (
                <>
                  {startResizing && (
                    <div
                      onMouseDown={(e) => startResizing('normalPrice', e)}
                      onTouchStart={(e) => startResizing('normalPrice', e)}
                      title="Arraste para redimensionar"
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-emerald-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                    />
                  )}
                  {startRotating && (
                    <div
                      onMouseDown={(e) => startRotating('normalPrice', e)}
                      onTouchStart={(e) => startRotating('normalPrice', e)}
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

          {/* ELEMENTO 3: TEXTO "POR:" */}
          {showPor && (
            <div
              onMouseDown={isEdit && startDragging ? (e) => startDragging('porText', e) : undefined}
              onTouchStart={
                isEdit && startDragging ? (e) => startDragging('porText', e) : undefined
              }
              onClick={isEdit && onSelectElement ? (e) => onSelectElement('porText', e) : undefined}
              style={{
                color: porColor,
                fontSize: `${porFontSize}px`,
                fontFamily: porFontFamily,
                transform: porRotation ? `rotate(${porRotation}deg)` : undefined,
                cursor: isEdit ? 'pointer' : 'default',
              }}
              className={`relative inline-flex items-baseline justify-center self-baseline font-black leading-none px-1 py-0.5 select-none transition-all whitespace-nowrap ${
                isEdit && selectedElements.has('porText')
                  ? 'ring-1 ring-emerald-500 border border-emerald-500 bg-emerald-500/20 rounded-sm'
                  : 'border border-transparent hover:border-slate-300'
              }`}
            >
              {isEdit && selectedElement === 'porText' && (
                <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                  TEXTO "POR"
                </div>
              )}

              <span>{porText}</span>
              {isEdit && selectedElement === 'porText' && (
                <>
                  {startResizing && (
                    <div
                      onMouseDown={(e) => startResizing('porText', e)}
                      onTouchStart={(e) => startResizing('porText', e)}
                      title="Arraste para redimensionar"
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-emerald-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                    />
                  )}
                  {startRotating && (
                    <div
                      onMouseDown={(e) => startRotating('porText', e)}
                      onTouchStart={(e) => startRotating('porText', e)}
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

          {/* ROTAÇÃO DO GRUPO INTEIRO */}
          {isEdit && selectedElement === 'dePricePorGroup' && startRotating && (
            <div
              onMouseDown={(e) => startRotating('dePricePorGroup', e)}
              onTouchStart={(e) => startRotating('dePricePorGroup', e)}
              title="Arraste para rotacionar o grupo inteiro"
              className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
            >
              <i className="bi bi-arrow-clockwise text-[11px]" />
            </div>
          )}
        </div>
      )}

    </>
  );
}
