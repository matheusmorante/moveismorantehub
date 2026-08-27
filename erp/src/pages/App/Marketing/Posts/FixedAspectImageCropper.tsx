import React, { useEffect, useRef, useState } from 'react';
import { compressImageToFile } from '@/pages/utils/imageUtils';

type Props = {
  file: File;
  kind: 'header' | 'footer' | 'seal';
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

type Selection = { x: number; y: number; width: number; height: number };
type Corner = 'nw' | 'ne' | 'sw' | 'se';
type DragState = { mode: 'move'; pointerX: number; pointerY: number; selection: Selection }
  | { mode: 'resize'; pointerX: number; corner: Corner; selection: Selection };

export default function FixedAspectImageCropper({ file, kind, onCancel, onConfirm }: Props) {
  const [source, setSource] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const target = kind === 'seal' ? { width: 800, height: 200 } : { width: 1080, height: 170 };

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const initializeSelection = () => {
    const image = imageRef.current;
    if (!image) return;
    const ratio = target.width / target.height;
    let width = image.clientWidth * 0.88;
    let height = width / ratio;
    if (height > image.clientHeight * 0.88) {
      height = image.clientHeight * 0.88;
      width = height * ratio;
    }
    setSelection({
      x: (image.clientWidth - width) / 2,
      y: (image.clientHeight - height) / 2,
      width,
      height,
    });
  };

  const moveSelection = (event: React.PointerEvent<HTMLElement>) => {
    const image = imageRef.current;
    const drag = dragRef.current;
    if (!image || !drag || !selection) return;
    if (drag.mode === 'resize') {
      resizeSelection(event.clientX, drag, image);
      return;
    }
    const x = Math.min(Math.max(0, drag.selection.x + event.clientX - drag.pointerX), image.clientWidth - selection.width);
    const y = Math.min(Math.max(0, drag.selection.y + event.clientY - drag.pointerY), image.clientHeight - selection.height);
    setSelection({ ...selection, x, y });
  };

  const resizeSelection = (pointerX: number, drag: Extract<DragState, { mode: 'resize' }>, image: HTMLImageElement) => {
    const start = drag.selection;
    const east = drag.corner.endsWith('e');
    const south = drag.corner.startsWith('s');
    const ratio = target.width / target.height;
    const requestedWidth = start.width + (pointerX - drag.pointerX) * (east ? 1 : -1);
    const anchorX = east ? start.x : start.x + start.width;
    const anchorY = south ? start.y : start.y + start.height;
    const maxWidthX = east ? image.clientWidth - anchorX : anchorX;
    const maxWidthY = (south ? image.clientHeight - anchorY : anchorY) * ratio;
    const width = Math.max(80, Math.min(requestedWidth, maxWidthX, maxWidthY));
    const height = width / ratio;
    setSelection({ x: east ? anchorX : anchorX - width, y: south ? anchorY : anchorY - height, width, height });
  };

  const finishCrop = async () => {
    const image = imageRef.current;
    if (!image || !selection) return;
    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(
      image,
      selection.x * scaleX,
      selection.y * scaleY,
      selection.width * scaleX,
      selection.height * scaleY,
      0,
      0,
      target.width,
      target.height,
    );
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1));
    if (blob) {
      const cropped = new File([blob], `${kind}-${Date.now()}.png`, { type: 'image/png' });
      onConfirm(await compressImageToFile(cropped, { maxMB: 2, maxWidth: 1080 }));
    }
  };

  const beginResize = (event: React.PointerEvent<HTMLSpanElement>, corner: Corner) => {
    if (!selection) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode: 'resize', pointerX: event.clientX, corner, selection };
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4">
    <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div><h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Recortar {kind === 'header' ? 'cabeçalho' : kind === 'footer' ? 'rodapé' : 'selo'}</h4><p className="text-[10px] text-slate-400">Arraste a área de seleção · saída {target.width} × {target.height} px</p></div>
        <button type="button" onClick={onCancel}><i className="bi bi-x-lg" /></button>
      </div>
      <div className="mt-4 flex max-h-[65vh] items-center justify-center overflow-auto rounded-xl bg-slate-950 p-3">
        <div className="relative w-fit max-w-full select-none">
          {source && <img ref={imageRef} src={source} alt="Imagem inteira para recorte" draggable={false} onLoad={initializeSelection} className="block max-h-[60vh] max-w-full object-contain" />}
          {selection && <div
            className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(2,6,23,0.7)]"
            style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height }}
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = { mode: 'move', pointerX: event.clientX, pointerY: event.clientY, selection };
            }}
            onPointerMove={moveSelection}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-[10px] font-black text-slate-700 shadow"><i className="bi bi-arrows-move mr-1" />Mova ou redimensione</span>
            {(['nw', 'ne', 'sw', 'se'] as Corner[]).map(corner => <span key={corner} onPointerDown={event => beginResize(event, corner)} onPointerMove={moveSelection} onPointerUp={() => { dragRef.current = null; }} style={{ cursor: `${corner}-resize` }} className={`absolute h-4 w-4 touch-none rounded-sm border-2 border-blue-600 bg-white ${corner.includes('n') ? '-top-2' : '-bottom-2'} ${corner.includes('w') ? '-left-2' : '-right-2'}`} />)}
          </div>}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button><button type="button" onClick={finishCrop} disabled={!selection} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Aplicar recorte</button></div>
    </div>
  </div>;
}
