import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { FORMAT_DIMENSIONS, isLayerVisible, type ImageFormat, type ImageLayout, type PositionedLayer, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { createTemplatePictureLoader, renderImageTemplate } from './renderImageTemplate';
import { imageTemplateError } from './imageTemplateService';

type Point = { x: number; y: number };
type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
const rotate = (x: number, y: number, angle: number) => {
  const radians = angle * Math.PI / 180;
  const sin = Math.sin(radians), cos = Math.cos(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
};
const bounded = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)));

function hit(layer: PositionedLayer, point: Point) {
  const local = rotate(point.x - layer.x - layer.width / 2, point.y - layer.y - layer.height / 2, -layer.angle);
  return Math.abs(local.x) <= layer.width / 2 && Math.abs(local.y) <= layer.height / 2;
}

type Gesture = { layer: PositionedLayer; start: Point; pointer: number; corner?: Corner; rotating?: boolean };
function gestureLayer({ layer, start, corner, rotating }: Gesture, point: Point): PositionedLayer {
  if (rotating) {
    const center = { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
    const angle = (value: Point) => Math.atan2(value.y - center.y, value.x - center.x) * 180 / Math.PI;
    const rotated = ((layer.angle + angle(point) - angle(start) + 180) % 360 + 360) % 360 - 180;
    return { ...layer, angle: Math.round(rotated) };
  }
  const dx = point.x - start.x, dy = point.y - start.y;
  if (!corner) return { ...layer, x: bounded(layer.x + dx, -3840, 3840), y: bounded(layer.y + dy, -3840, 3840) };
  const sx = corner.endsWith('e') ? 1 : -1;
  const sy = corner.startsWith('s') ? 1 : -1;
  const local = rotate(dx, dy, -layer.angle);
  const width = bounded(layer.width + sx * local.x, 16, 3840);
  const height = bounded(layer.height + sy * local.y, 16, 3840);
  const shift = rotate(sx * (width - layer.width) / 2, sy * (height - layer.height) / 2, layer.angle);
  return { ...layer, width, height, x: bounded(layer.x + (layer.width - width) / 2 + shift.x, -3840, 3840),
    y: bounded(layer.y + (layer.height - height) / 2 + shift.y, -3840, 3840) };
}

export function TemplateArtboard({ format, layout, product, assets, activeId, onSelect, onChange, getPicture, disabled }: {
  format: ImageFormat; layout: ImageLayout; product: TemplatePreviewProduct | null;
  assets: { sources: ReadonlyMap<string, string>; loading: boolean; error: string; retry: () => void };
  activeId: string; onSelect: (id: string) => void; onChange: (layer: PositionedLayer) => void;
  getPicture: ReturnType<typeof createTemplatePictureLoader>; disabled: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Gesture | null>(null);
  const [moving, setMoving] = useState<PositionedLayer | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const { width, height } = FORMAT_DIMENSIONS[format];
  const selected = moving ?? layout.layers.find((layer) => layer.id === activeId);
  const selectedLayer = selected?.type !== 'background' && selected && isLayerVisible(selected, product) ? selected : null;

  useEffect(() => {
    if (!canvas.current) return;
    const target = canvas.current;
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      const drawing = moving ? { layers: layout.layers.map((layer) => layer.id === moving.id ? moving : layer) } : layout;
      void renderImageTemplate({ canvas: target, format, layout: drawing, product, assets: assets.sources, getPicture,
        signal: controller.signal, preview: true }).then(({ errors, notices }) => {
        if (!controller.signal.aborted) setMessages([...new Set([...errors, ...notices])]);
      }).catch((error) => { if (!controller.signal.aborted) setMessages([imageTemplateError(error)]); });
    });
    return () => { cancelAnimationFrame(frame); controller.abort(); };
  }, [assets.sources, format, getPicture, layout, moving, product]);

  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * width / bounds.width, y: (event.clientY - bounds.top) * height / bounds.height };
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0 || !event.isPrimary) return;
    const start = point(event);
    const corner = (event.target as HTMLElement).dataset.corner as Corner | undefined;
    const rotating = (event.target as HTMLElement).dataset.rotate === 'true';
    const layer = corner || rotating ? selectedLayer : layout.layers.find((candidate): candidate is PositionedLayer =>
      candidate.type !== 'background' && isLayerVisible(candidate, product) && hit(candidate, start));
    if (!layer) return;
    onSelect(layer.id);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { layer, start, corner, rotating, pointer: event.pointerId };
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const gesture = drag.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    drag.current = null;
    setMoving(null);
    if (cancelled) return;
    const next = gestureLayer(gesture, point(event));
    if (next.x !== gesture.layer.x || next.y !== gesture.layer.y || next.width !== gesture.layer.width
      || next.height !== gesture.layer.height || next.angle !== gesture.layer.angle) onChange(next);
  }

  return <div className="ct-stage">
    <div className="ct-artboard-area">
      <div className="ct-artboard" style={{ '--ct-ratio': width / height, '--ct-board-width': `${Math.round(520 * width / height)}px` } as CSSProperties}
        tabIndex={0} aria-label={`Área de edição do modelo ${format}. Use as setas para mover a camada selecionada.`}
        onPointerDown={startDrag} onPointerMove={(event) => {
          if (drag.current?.pointer === event.pointerId) setMoving(gestureLayer(drag.current, point(event)));
        }} onPointerUp={(event) => finishDrag(event, false)} onPointerCancel={(event) => finishDrag(event, true)}
        onLostPointerCapture={(event) => finishDrag(event, true)}
        onKeyDown={(event) => {
          if (!selectedLayer || disabled) return;
          const shift = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
          if (!shift) return;
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          onChange({ ...selectedLayer, x: bounded(selectedLayer.x + shift[0] * step, -3840, 3840),
            y: bounded(selectedLayer.y + shift[1] * step, -3840, 3840) });
        }}>
        <canvas ref={canvas} role="img" aria-label={`Prévia ${format}${product?.fields.name ? ` de ${product.fields.name}` : ''}`} />
        {selectedLayer && <div aria-hidden="true" className="ct-layer-outline" style={{
          left: `${100 * selectedLayer.x / width}%`, top: `${100 * selectedLayer.y / height}%`,
          width: `${100 * selectedLayer.width / width}%`, height: `${100 * selectedLayer.height / height}%`,
          transform: `rotate(${selectedLayer.angle}deg)`,
        }}>
          <span className="ct-rotate-handle" data-rotate="true" title="Arraste para girar" />
          {CORNERS.map((corner) => <span key={corner} className={`ct-handle ct-handle-${corner}`} data-corner={corner} />)}
        </div>}
      </div>
    </div>
    {assets.loading ? <small role="status" className="ct-stage-message">Carregando elementos da imagem…</small>
      : assets.error ? <small role="alert" className="ct-stage-message">{assets.error} <button type="button" className="ct-link" disabled={disabled} onClick={assets.retry}>Tentar novamente</button></small>
        : !!messages.length && <small className="ct-stage-message" role="status">{messages.join(' ')}</small>}
  </div>;
}
