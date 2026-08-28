import React, { useEffect, useRef, useState } from 'react';
import { compressImageToFile } from '@/pages/utils/imageUtils';

type Selection = { x: number; y: number; size: number };
type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Drag = { mode: 'move'; x: number; y: number; selection: Selection } | { mode: 'resize'; x: number; corner: Corner; selection: Selection };

interface SquareImageCropperProps {
    imageUrl: string;
    onCancel: () => void;
    onConfirm: (file: File) => void;
}

export function SquareImageCropper({ imageUrl, onCancel, onConfirm }: SquareImageCropperProps) {
    const [selection, setSelection] = useState<Selection | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const dragRef = useRef<Drag | null>(null);

    useEffect(() => setSelection(null), [imageUrl]);

    const initializeSelection = () => {
        const image = imageRef.current;
        if (!image) return;
        const size = Math.min(image.clientWidth, image.clientHeight) * 0.88;
        setSelection({ x: (image.clientWidth - size) / 2, y: (image.clientHeight - size) / 2, size });
    };

    const resize = (pointerX: number, drag: Extract<Drag, { mode: 'resize' }>, image: HTMLImageElement) => {
        const east = drag.corner.endsWith('e');
        const south = drag.corner.startsWith('s');
        const anchorX = east ? drag.selection.x : drag.selection.x + drag.selection.size;
        const anchorY = south ? drag.selection.y : drag.selection.y + drag.selection.size;
        const requested = drag.selection.size + (pointerX - drag.x) * (east ? 1 : -1);
        const maxX = east ? image.clientWidth - anchorX : anchorX;
        const maxY = south ? image.clientHeight - anchorY : anchorY;
        const size = Math.max(80, Math.min(requested, maxX, maxY));
        setSelection({ x: east ? anchorX : anchorX - size, y: south ? anchorY : anchorY - size, size });
    };

    const move = (event: React.PointerEvent<HTMLElement>) => {
        const image = imageRef.current;
        const drag = dragRef.current;
        if (!image || !drag || !selection) return;
        if (drag.mode === 'resize') return resize(event.clientX, drag, image);
        const x = Math.min(Math.max(0, drag.selection.x + event.clientX - drag.x), image.clientWidth - selection.size);
        const y = Math.min(Math.max(0, drag.selection.y + event.clientY - drag.y), image.clientHeight - selection.size);
        setSelection({ ...selection, x, y });
    };

    const finish = async () => {
        const image = imageRef.current;
        if (!image || !selection) return;
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(image, selection.x * image.naturalWidth / image.clientWidth, selection.y * image.naturalHeight / image.clientHeight, selection.size * image.naturalWidth / image.clientWidth, selection.size * image.naturalHeight / image.clientHeight, 0, 0, 1080, 1080);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1));
        if (blob) onConfirm(await compressImageToFile(new File([blob], `produto-quadrado-${Date.now()}.png`, { type: 'image/png' }), { maxMB: 0.2, maxWidth: 1080 }));
    };

    const startResize = (event: React.PointerEvent<HTMLSpanElement>, corner: Corner) => {
        if (!selection) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { mode: 'resize', x: event.clientX, corner, selection };
    };

    return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4">
        <div className="w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between"><div><h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Recortar foto do produto</h4><p className="text-[10px] text-slate-400">Arraste ou redimensione o quadrado · saída 1080 × 1080 px</p></div><button type="button" onClick={onCancel} aria-label="Fechar"><i className="bi bi-x-lg" /></button></div>
            <div className="mt-4 flex max-h-[65vh] items-center justify-center overflow-auto rounded-xl bg-slate-950 p-3"><div className="relative w-fit max-w-full select-none">
                <img ref={imageRef} src={imageUrl} crossOrigin="anonymous" alt="Imagem para recorte" draggable={false} onLoad={initializeSelection} className="block max-h-[60vh] max-w-full object-contain" />
                {selection && <div className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(2,6,23,0.7)]" style={{ left: selection.x, top: selection.y, width: selection.size, height: selection.size }} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { mode: 'move', x: event.clientX, y: event.clientY, selection }; }} onPointerMove={move} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
                    <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-[10px] font-black text-slate-700 shadow"><i className="bi bi-arrows-move mr-1" />Mova ou redimensione</span>
                    {(['nw', 'ne', 'sw', 'se'] as Corner[]).map(corner => <span key={corner} onPointerDown={event => startResize(event, corner)} onPointerMove={move} onPointerUp={() => { dragRef.current = null; }} style={{ cursor: `${corner}-resize` }} className={`absolute h-4 w-4 touch-none rounded-sm border-2 border-blue-600 bg-white ${corner.includes('n') ? '-top-2' : '-bottom-2'} ${corner.includes('w') ? '-left-2' : '-right-2'}`} />)}
                </div>}
            </div></div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button><button type="button" onClick={finish} disabled={!selection} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Aplicar recorte</button></div>
        </div>
    </div>;
}
