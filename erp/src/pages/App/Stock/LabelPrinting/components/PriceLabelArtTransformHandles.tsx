import type { MouseEvent, TouchEvent } from 'react';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

type InteractivePriceLabelLayer = Exclude<PriceLabelLayerKey, null>;
type InteractionEvent = MouseEvent | TouchEvent;

interface PriceLabelArtTransformHandlesProps {
  layer: InteractivePriceLabelLayer;
  startResizing?: (layer: InteractivePriceLabelLayer, event: InteractionEvent) => void;
  startRotating?: (layer: InteractivePriceLabelLayer, event: InteractionEvent) => void;
  resizeClassName?: string;
  resizeTitle?: string;
}

const DEFAULT_RESIZE_CLASS_NAME =
  'absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125';
const ROTATE_CLASS_NAME =
  'absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600';

export function PriceLabelArtTransformHandles({
  layer,
  startResizing,
  startRotating,
  resizeClassName = DEFAULT_RESIZE_CLASS_NAME,
  resizeTitle = 'Arraste para redimensionar',
}: PriceLabelArtTransformHandlesProps) {
  return (
    <>
      {startResizing && (
        <div
          onMouseDown={(event) => startResizing(layer, event)}
          onTouchStart={(event) => startResizing(layer, event)}
          title={resizeTitle}
          className={resizeClassName}
        />
      )}
      {startRotating && (
        <div
          onMouseDown={(event) => startRotating(layer, event)}
          onTouchStart={(event) => startRotating(layer, event)}
          title="Arraste para rotacionar"
          className={ROTATE_CLASS_NAME}
        >
          <i className="bi bi-arrow-clockwise text-[11px]" />
        </div>
      )}
    </>
  );
}
