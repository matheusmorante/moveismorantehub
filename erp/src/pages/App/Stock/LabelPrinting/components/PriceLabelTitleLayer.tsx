import React from 'react';
import type { PriceLabelArtData } from '../types/PriceLabelArtData';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

const SAFETY_MARGIN_PX = 16;
type InteractivePriceLabelLayer = Exclude<PriceLabelLayerKey, null>;
type LayerInteractionEvent = React.MouseEvent | React.TouchEvent;

interface PriceLabelTitleLayerProps {
  data: PriceLabelArtData;
  canvasWidth: number;
  scale: number;
  isEdit: boolean;
  selectedElement: PriceLabelLayerKey;
  selectedElements: Set<PriceLabelLayerKey>;
  onSelectElement?: (layer: InteractivePriceLabelLayer, event: React.MouseEvent) => void;
  startDragging?: (layer: InteractivePriceLabelLayer, event: LayerInteractionEvent) => void;
  startResizing?: (layer: InteractivePriceLabelLayer, event: LayerInteractionEvent) => void;
  startRotating?: (layer: InteractivePriceLabelLayer, event: LayerInteractionEvent) => void;
  onTitleWidthChange?: (width: number) => void;
}

export function PriceLabelTitleLayer({
  data,
  canvasWidth,
  scale,
  isEdit,
  selectedElement,
  selectedElements,
  onSelectElement,
  startDragging,
  startResizing,
  startRotating,
  onTitleWidthChange,
}: PriceLabelTitleLayerProps) {
  const {
    title,
    showTitle = true,
    titleFontSize,
    titleColor,
    titleFontFamily,
    titlePos,
    titleRotation,
  } = data;

  const titleMaxWidth = Math.max(1, canvasWidth - SAFETY_MARGIN_PX * 2 - Math.abs(titlePos.x) * 2);
  const titleWidth = Math.min(Math.max(60, data.titleWidth ?? titleMaxWidth), titleMaxWidth);
  const startTitleWidthResize = (
    edge: 'left' | 'right',
    event: React.MouseEvent | React.TouchEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onTitleWidthChange) return;

    const startX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const initialWidth = titleWidth;
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const delta = (currentX - startX) / Math.max(scale, 0.01);
      const nextWidth = initialWidth + (edge === 'right' ? delta : -delta);
      onTitleWidthChange(Math.min(titleMaxWidth, Math.max(60, Math.round(nextWidth))));
    };
    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
  };

  return (
    <>
      {/* 1. TÍTULO / NOME DO PRODUTO */}
      {showTitle && (
        <div
          onMouseDown={isEdit && startDragging ? (e) => startDragging('title', e) : undefined}
          onTouchStart={isEdit && startDragging ? (e) => startDragging('title', e) : undefined}
          onClick={isEdit && onSelectElement ? (e) => onSelectElement('title', e) : undefined}
          style={{
            color: titleColor,
            fontSize: `${titleFontSize}px`,
            fontFamily: titleFontFamily,
            top: '25px',
            left: '50%',
            width: `${titleWidth}px`,
            transform: `translate(calc(-50% + ${titlePos?.x || 0}px), ${Math.max(-15, Math.min(300, titlePos?.y || 0))}px) rotate(${titleRotation || 0}deg)`,
            cursor: isEdit ? 'move' : 'default',
            zIndex: selectedElements.has('title') ? 30 : 10,
          }}
          className={`absolute inline-flex min-w-0 items-center justify-center overflow-hidden font-black uppercase tracking-tight text-center leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
            isEdit && selectedElements.has('title')
              ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none'
              : 'border border-transparent'
          }`}
        >
          {isEdit && selectedElement === 'title' && (
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
              NOME DO PRODUTO
            </div>
          )}

          <span className="block min-w-0 truncate">{title || 'TÍTULO DO PRODUTO'}</span>

          {isEdit && selectedElement === 'title' && (
            <>
              {onTitleWidthChange && (
                <>
                  <button
                    type="button"
                    onMouseDown={(e) => startTitleWidthResize('left', e)}
                    onTouchStart={(e) => startTitleWidthResize('left', e)}
                    title="Arraste para ajustar a largura do título"
                    className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-blue-600 shadow-sm cursor-ew-resize z-40"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => startTitleWidthResize('right', e)}
                    onTouchStart={(e) => startTitleWidthResize('right', e)}
                    title="Arraste para ajustar a largura do título"
                    className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-blue-600 shadow-sm cursor-ew-resize z-40"
                  />
                </>
              )}
              {startResizing && selectedElement !== 'title' && (
                <div
                  onMouseDown={(e) => startResizing('title', e)}
                  onTouchStart={(e) => startResizing('title', e)}
                  title="Arraste para redimensionar"
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                />
              )}
              {startRotating && (
                <div
                  onMouseDown={(e) => startRotating('title', e)}
                  onTouchStart={(e) => startRotating('title', e)}
                  title="Arraste para rotacionar elemento"
                  className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                >
                  <i className="bi bi-arrow-clockwise text-[11px]" />
                </div>
              )}
            </>
          )}
        </div>
      )}

    </>
  );
}
