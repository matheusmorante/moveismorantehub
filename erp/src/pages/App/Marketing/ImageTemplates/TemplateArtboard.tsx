import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import { FORMAT_DIMENSIONS, isLayerVisible, isTemplateLayerVisible, type ImageFormat, type ImageLayout,
  type PositionedLayer, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { applyTemplateSelection, constrainTemplateSelection, findTemplateSelection, templateGroupForLayer, templateStackItems,
  type PositionedSelection } from '../../../../../../shared-utils/catalogImageTemplateGroups';
import { createTemplatePictureLoader, measureTextLayerSafetyBounds, renderImageTemplate, type TemplatePicture } from './renderImageTemplate';
import { imageTemplateError } from './imageTemplateService';

type Point = { x: number; y: number };
type Corner = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const CORNERS: Corner[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;
const rotate = (x: number, y: number, angle: number) => {
  const radians = angle * Math.PI / 180;
  const sin = Math.sin(radians), cos = Math.cos(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
};
const bounded = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)));

function hit(layer: PositionedSelection, point: Point) {
  const local = rotate(point.x - layer.x - layer.width / 2, point.y - layer.y - layer.height / 2, -layer.angle);
  return Math.abs(local.x) <= layer.width / 2 && Math.abs(local.y) <= layer.height / 2;
}

type Gesture = { layer: PositionedSelection; start: Point; pointer: number; corner?: Corner; rotating?: boolean };
function gestureLayer({ layer, start, corner, rotating }: Gesture, point: Point, shiftKey = false,
  product: TemplatePreviewProduct | null = null): PositionedSelection {
  if (rotating && layer.type !== 'group') {
    const center = { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
    const angle = (value: Point) => Math.atan2(value.y - center.y, value.x - center.x) * 180 / Math.PI;
    const rotated = ((layer.angle + angle(point) - angle(start) + 180) % 360 + 360) % 360 - 180;
    return { ...layer, angle: Math.round(rotated) };
  }
  const dx = point.x - start.x, dy = point.y - start.y;
  if (!corner) return { ...layer, x: bounded(layer.x + dx, -3840, 3840), y: bounded(layer.y + dy, -3840, 3840) };
  const sx = corner.includes('e') ? 1 : corner.includes('w') ? -1 : 0;
  const sy = corner.includes('s') ? 1 : corner.includes('n') ? -1 : 0;
  const local = rotate(dx, dy, -layer.angle);
  let width: number;
  let height: number;
  if (layer.type === 'image' || (layer.type === 'sticker' && layer.lockAspectRatio) || shiftKey) {
    const horizontalScale = Math.max(.01, (layer.width + sx * local.x) / layer.width);
    const verticalScale = Math.max(.01, (layer.height + sy * local.y) / layer.height);
    const requestedScale = sx === 0 ? verticalScale : sy === 0 ? horizontalScale
      : Math.abs(local.x) / layer.width >= Math.abs(local.y) / layer.height ? horizontalScale : verticalScale;
    const minimumScale = Math.max(16 / layer.width, 16 / layer.height);
    const maximumScale = Math.min(3840 / layer.width, 3840 / layer.height);
    const scale = Math.max(minimumScale, Math.min(maximumScale, requestedScale));
    width = Math.round(layer.width * scale);
    height = Math.round(layer.height * scale);
  } else {
    width = sx === 0 ? layer.width : bounded(layer.width + sx * local.x, 16, 3840);
    height = sy === 0 ? layer.height : bounded(layer.height + sy * local.y, 16, 3840);
  }
  if (layer.type === 'text') {
    const safe = measureTextLayerSafetyBounds({ ...layer, width, height }, product, width, height);
    width = safe.width;
    height = safe.height;
  }
  const shift = rotate(sx * (width - layer.width) / 2, sy * (height - layer.height) / 2, layer.angle);
  return { ...layer, width, height, x: bounded(layer.x + (layer.width - width) / 2 + shift.x, -3840, 3840),
    y: bounded(layer.y + (layer.height - height) / 2 + shift.y, -3840, 3840) };
}

export function TemplateArtboard({ format, layout, product, assets, productLoading = false, artboardRef, activeId, selectedIds = [], onSelect, onChange, getPicture, disabled }: {
  format: ImageFormat; layout: ImageLayout; product: TemplatePreviewProduct | null;
  assets: { sources: ReadonlyMap<string, string>; loading: boolean; error: string; retry: () => void };
  productLoading?: boolean;
  artboardRef: RefObject<HTMLDivElement>;
  activeId: string; selectedIds?: readonly string[]; onSelect: (id: string) => void; onChange: (layer: PositionedSelection) => void;
  getPicture: ReturnType<typeof createTemplatePictureLoader>; disabled: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Gesture | null>(null);
  const renderDelay = useRef<number | null>(null);
  const previousBackgroundRemoval = useRef(false);
  const [moving, setMoving] = useState<PositionedSelection | null>(null);
  const gestureError = useRef('');
  const [rendering, setRendering] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [zoom, setZoom] = useState<number>(100);
  const [processedPictures, setProcessedPictures] = useState<ReadonlyMap<string, TemplatePicture>>(() => new Map());
  const { width, height } = FORMAT_DIMENSIONS[format];

  function isSelectionVisible(selection: PositionedSelection) {
    if (selection.type === 'group') {
      const group = layout.groups?.find((entry) => entry.id === selection.id);
      return !!group && isLayerVisible(group, product) && group.layerIds.some((id) => {
        const layer = layout.layers.find((entry) => entry.id === id);
        return !!layer && layer.type !== 'background' && isTemplateLayerVisible(layout, layer, product);
      });
    }
    const layer = layout.layers.find((entry) => entry.id === selection.id);
    return !!layer && layer.type !== 'background' && isTemplateLayerVisible(layout, layer, product);
  }

  const selected = moving ?? findTemplateSelection(layout, activeId);
  const selectedLayer = selected && selected.type !== 'background' && isSelectionVisible(selected) ? selected : null;
  const previewLoading = (rendering || assets.loading || productLoading) && !moving;
  const parentGroup = selectedLayer?.type !== 'group' && selectedLayer ? templateGroupForLayer(layout, selectedLayer.id) : undefined;
  const zoomIndex = ZOOM_STEPS.indexOf(zoom as typeof ZOOM_STEPS[number]);
  const canZoomOut = zoom > ZOOM_STEPS[0];
  const canZoomIn = zoom < ZOOM_STEPS[ZOOM_STEPS.length - 1];

  function stepZoom(direction: -1 | 1) {
    setZoom((current) => {
      const index = ZOOM_STEPS.findIndex((step) => step >= current);
      const nextIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, (index < 0 ? 2 : index) + direction));
      return ZOOM_STEPS[nextIndex];
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    stepZoom(event.deltaY < 0 ? 1 : -1);
  }

  useEffect(() => {
    if (!canvas.current) return;
    const target = canvas.current;
    const controller = new AbortController();
    if (renderDelay.current === null) {
      renderDelay.current = window.setTimeout(() => {
        renderDelay.current = null;
        setRendering(true);
      }, 140);
    }
    const needsBackgroundRemoval = layout.layers.some((layer) => layer.type === 'product'
      && layer.removeBackground && isTemplateLayerVisible(layout, layer, product));
    // Keep the status out of pointer-move redraws; its flex row changes the preview's available height.
    if (!moving && needsBackgroundRemoval && !previousBackgroundRemoval.current) {
      setMessages(['Preparando o recorte por IA; na primeira vez pode levar mais tempo…']);
    }
    const frame = requestAnimationFrame(() => {
      const drawing = moving ? applyTemplateSelection(layout, moving) : layout;
      void renderImageTemplate({ canvas: target, format, layout: drawing, product, assets: assets.sources, getPicture,
        signal: controller.signal, preview: true, processedPictures,
        onBackgroundRemovalReady: (url, picture) => setProcessedPictures((previous) => {
          if (previous.get(url) === picture) return previous;
          const next = new Map(previous);
          next.delete(url);
          next.set(url, picture);
          if (next.size > 16) next.delete(next.keys().next().value!);
          return next;
        }) }).then(({ errors, notices }) => {
        if (!controller.signal.aborted) {
          if (renderDelay.current !== null) window.clearTimeout(renderDelay.current);
          renderDelay.current = null;
          setRendering(false);
        }
        if (!controller.signal.aborted && !moving) {
          setMessages([...new Set([...errors, ...notices])]);
          previousBackgroundRemoval.current = needsBackgroundRemoval;
        }
      }).catch((error) => {
        if (controller.signal.aborted) return;
        if (renderDelay.current !== null) window.clearTimeout(renderDelay.current);
        renderDelay.current = null;
        setRendering(false);
        if (moving) return;
        setMessages([imageTemplateError(error)]);
        previousBackgroundRemoval.current = needsBackgroundRemoval;
      });
    });
    return () => { cancelAnimationFrame(frame); controller.abort(); };
  }, [assets.sources, format, getPicture, layout, moving, product, processedPictures]);
  useEffect(() => () => {
    if (renderDelay.current !== null) window.clearTimeout(renderDelay.current);
  }, []);

  function point(event: { clientX: number; clientY: number; currentTarget: HTMLDivElement }) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * width / bounds.width, y: (event.clientY - bounds.top) * height / bounds.height };
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (disabled || previewLoading || event.button !== 0 || !event.isPrimary) return;
    const start = point(event);
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-corner],[data-rotate],[data-group-move]');
    const corner = target?.dataset.corner as Corner | undefined;
    const rotating = target?.dataset.rotate === 'true';
    let layer: PositionedSelection | null | undefined;
    if (corner || rotating || target?.dataset.groupMove) layer = selectedLayer;
    else {
      let candidate: PositionedSelection | null | undefined;
      for (const item of templateStackItems(layout)) {
        candidate = item.layers.find((entry): entry is PositionedLayer => entry.type !== 'background'
          && isSelectionVisible(entry) && hit(entry, start));
        if (candidate) break;
        if (item.group) {
          const groupSelection = { ...item.group, type: 'group' as const, angle: 0 as const };
          if (!isSelectionVisible(groupSelection) || !hit(groupSelection, start)) continue;
          candidate = groupSelection;
          break;
        }
      }
      layer = candidate ?? null;
    }
    if (!layer) {
      onSelect('');
      return;
    }
    event.preventDefault(); // O arraste nativo do navegador cancela o gesto de rotação.
    onSelect(layer.id);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureError.current = '';
    drag.current = { layer, start, corner, rotating, pointer: event.pointerId };
  }

  function nextGestureLayer(gesture: Gesture, target: Point, shiftKey: boolean): PositionedSelection {
    try {
      const candidate = gestureLayer(gesture, target, shiftKey, product);
      const next = constrainTemplateSelection(layout, candidate) as PositionedSelection;
      gestureError.current = '';
      return next;
    } catch (cause) {
      gestureError.current = imageTemplateError(cause);
      return gesture.layer;
    }
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const gesture = drag.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    drag.current = null;
    setMoving(null);
    if (cancelled) return;
    const next = nextGestureLayer(gesture, point(event), event.shiftKey);
    if (gestureError.current) { setMessages([gestureError.current]); return; }
    if (next.x !== gesture.layer.x || next.y !== gesture.layer.y || next.width !== gesture.layer.width
      || next.height !== gesture.layer.height || next.angle !== gesture.layer.angle) onChange(next);
  }

  return <div className="ct-stage">
    <div className="ct-stage-toolbar" role="toolbar" aria-label="Zoom da prévia">
      <button type="button" className="ct-button ct-icon-button" aria-label="Diminuir zoom" title="Diminuir zoom"
        disabled={disabled || !canZoomOut} onClick={() => stepZoom(-1)}>
        <i className="bi bi-zoom-out" aria-hidden="true" />
      </button>
      <button type="button" className="ct-button ct-zoom-reset" aria-label={`Zoom atual ${zoom}%. Clique para redefinir para 100%`}
        title="Redefinir zoom para 100%" disabled={disabled || (zoom === 100 && zoomIndex === 2)} onClick={() => setZoom(100)}>
        {zoom}%
      </button>
      <button type="button" className="ct-button ct-icon-button" aria-label="Aumentar zoom" title="Aumentar zoom"
        disabled={disabled || !canZoomIn} onClick={() => stepZoom(1)}>
        <i className="bi bi-zoom-in" aria-hidden="true" />
      </button>
    </div>
    <div className="ct-artboard-area" data-zoomed={zoom !== 100 ? 'true' : undefined} onWheel={handleWheel}>
      <div ref={artboardRef} className="ct-artboard" data-zoomed={zoom !== 100 ? 'true' : undefined}
        style={{ '--ct-ratio': width / height, '--ct-board-width': `${Math.round(520 * (width / height) * (zoom / 100))}px` } as CSSProperties}
        tabIndex={0} aria-label={`Área de edição do modelo ${format}. Use as setas para mover a camada selecionada.`}
        onPointerDown={startDrag} onPointerMove={(event) => {
          if (drag.current?.pointer === event.pointerId) setMoving(nextGestureLayer(drag.current, point(event), event.shiftKey));
        }} onPointerUp={(event) => finishDrag(event, false)} onPointerCancel={(event) => finishDrag(event, true)}
        onLostPointerCapture={(event) => finishDrag(event, true)}
        onDoubleClick={(event) => {
          if (disabled) return;
          const target = point(event);
          const layer = layout.layers.find((entry) => entry.type !== 'background' && isSelectionVisible(entry) && hit(entry, target));
          if (layer) onSelect(layer.id);
        }}
        onKeyDown={(event) => {
          if (!selectedLayer || disabled || previewLoading) return;
          const shift = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
          if (!shift) return;
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          try {
            onChange(constrainTemplateSelection(layout, { ...selectedLayer, x: bounded(selectedLayer.x + shift[0] * step, -3840, 3840),
              y: bounded(selectedLayer.y + shift[1] * step, -3840, 3840) }) as PositionedSelection);
          } catch (cause) { setMessages([imageTemplateError(cause)]); }
        }}>
        <canvas ref={canvas} role="img" aria-label={`Prévia ${format}${product?.fields.name ? ` de ${product.fields.name}` : ''}`} />
        {previewLoading && <div className="ct-preview-loading" role="status" aria-live="polite"
          onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          <span className="ct-preview-spinner" aria-hidden="true" />
          <span>Carregando prévia…</span>
        </div>}
        {parentGroup && <div aria-hidden="true" className="ct-layer-outline ct-group-boundary" style={{
          left: `${100 * parentGroup.x / width}%`, top: `${100 * parentGroup.y / height}%`,
          width: `${100 * parentGroup.width / width}%`, height: `${100 * parentGroup.height / height}%`,
        }} />}
        {selectedIds.map((id) => {
          const layer = layout.layers.find((entry) => entry.id === id);
          return layer && layer.type !== 'background' && isSelectionVisible(layer)
            ? <div key={id} aria-hidden="true" className="ct-layer-outline ct-multi-layer-outline" style={{
              left: `${100 * layer.x / width}%`, top: `${100 * layer.y / height}%`, width: `${100 * layer.width / width}%`,
              height: `${100 * layer.height / height}%`, transform: `rotate(${layer.angle}deg)`,
            }} /> : null;
        })}
        {selectedLayer && <div aria-hidden="true" className="ct-layer-outline" data-group={selectedLayer.type === 'group' || undefined} style={{
          left: `${100 * selectedLayer.x / width}%`, top: `${100 * selectedLayer.y / height}%`,
          width: `${100 * selectedLayer.width / width}%`, height: `${100 * selectedLayer.height / height}%`,
          transform: `rotate(${selectedLayer.angle}deg)`,
        }}>
          {selectedLayer.type === 'group' ? <span className="ct-group-move-handle" data-group-move="true" title="Arraste para mover o agrupamento">
            <i className="bi bi-arrows-move" aria-hidden="true" />
          </span> : <span className="ct-rotate-handle" data-rotate="true" data-flip={selectedLayer.y < 40 ? 'bottom' : undefined} title="Arraste para girar">
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          </span>}
          {CORNERS.map((corner) => <span key={corner} className={`ct-handle ct-handle-${corner}`} data-corner={corner} />)}
        </div>}
      </div>
    </div>
    {assets.loading ? <small role="status" className="ct-stage-message">Carregando elementos da imagem…</small>
      : assets.error ? <small role="alert" className="ct-stage-message">{assets.error} <button type="button" className="ct-link" disabled={disabled} onClick={assets.retry}>Tentar novamente</button></small>
        : !!messages.length && <small className="ct-stage-message" role="status">{messages.join(' ')}</small>}
  </div>;
}
