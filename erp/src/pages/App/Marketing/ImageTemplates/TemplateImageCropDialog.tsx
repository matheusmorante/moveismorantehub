import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { imageContentBounds } from '@/pages/utils/imageContentBounds';
import type { TemplateImageCrop } from './templateImageCrop';

const cropSchema = z.object({
  sourceWidth: z.number().int().min(1).max(24_000),
  sourceHeight: z.number().int().min(1).max(24_000),
  selection: z.object({
    x: z.number().int().min(0), y: z.number().int().min(0),
    width: z.number().int().min(1), height: z.number().int().min(1),
  }),
}).superRefine(({ sourceWidth, sourceHeight, selection }, context) => {
  if (selection.x + selection.width > sourceWidth || selection.y + selection.height > sourceHeight) {
    context.addIssue({ code: 'custom', path: ['selection'], message: 'A área de recorte deve ficar dentro da imagem.' });
  }
});

type CropValues = z.infer<typeof cropSchema>;
type CropSelection = CropValues['selection'];
type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
type CropGesture = {
  pointerId: number; mode: 'move' | 'resize'; handle?: ResizeHandle;
  clientX: number; clientY: number; selection: CropSelection;
};

const handles: { id: ResizeHandle; label: string }[] = [
  { id: 'nw', label: 'Redimensionar pelo canto superior esquerdo' }, { id: 'n', label: 'Redimensionar pela borda superior' },
  { id: 'ne', label: 'Redimensionar pelo canto superior direito' }, { id: 'e', label: 'Redimensionar pela borda direita' },
  { id: 'se', label: 'Redimensionar pelo canto inferior direito' }, { id: 's', label: 'Redimensionar pela borda inferior' },
  { id: 'sw', label: 'Redimensionar pelo canto inferior esquerdo' }, { id: 'w', label: 'Redimensionar pela borda esquerda' },
];

function clamp(value: number, min: number, max: number) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

export function TemplateImageCropDialog({ source, filename, onCancel, onConfirm }: {
  source: string; filename: string; onCancel: () => void;
  onConfirm: (file: File, crop: TemplateImageCrop) => Promise<boolean | void> | boolean | void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const gestureRef = useRef<CropGesture | null>(null);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const [selection, setSelection] = useState<CropSelection | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const { handleSubmit, setValue, formState: { errors } } = useForm<CropValues>({
    resolver: zodResolver(cropSchema),
    defaultValues: { sourceWidth: 1, sourceHeight: 1, selection: { x: 0, y: 0, width: 1, height: 1 } },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !sourceSize) return;
    const resize = () => {
      const availableWidth = Math.max(1, stage.clientWidth - 32);
      const availableHeight = Math.max(1, stage.clientHeight - 32);
      const scale = Math.min(1, availableWidth / sourceSize.width, availableHeight / sourceSize.height);
      setDisplaySize({ width: sourceSize.width * scale, height: sourceSize.height * scale });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    return () => observer.disconnect();
  }, [sourceSize]);

  function initializeImage(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (!image.naturalWidth || !image.naturalHeight) {
      setError('Não foi possível abrir esta imagem para recorte.');
      return;
    }
    const nextSize = { width: image.naturalWidth, height: image.naturalHeight };
    const fullImage = imageContentBounds(image, nextSize.width, nextSize.height, .035);
    setSourceSize(nextSize);
    setValue('sourceWidth', nextSize.width);
    setValue('sourceHeight', nextSize.height);
    setCropSelection(fullImage);
    setError('');
  }

  function setCropSelection(next: CropSelection) {
    setSelection(next);
    setValue('selection', next, { shouldDirty: true, shouldValidate: false });
  }

  function beginGesture(event: ReactPointerEvent<HTMLElement>, mode: CropGesture['mode'], handle?: ResizeHandle) {
    if (!selection || processing) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { pointerId: event.pointerId, mode, handle, clientX: event.clientX, clientY: event.clientY, selection };
  }

  function moveGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !sourceSize || !displaySize) return;
    const scaleX = displaySize.width / sourceSize.width;
    const scaleY = displaySize.height / sourceSize.height;
    const dx = Math.round((event.clientX - gesture.clientX) / scaleX);
    const dy = Math.round((event.clientY - gesture.clientY) / scaleY);
    const initial = gesture.selection;
    if (gesture.mode === 'move') {
      setCropSelection({ ...initial,
        x: clamp(initial.x + dx, 0, sourceSize.width - initial.width),
        y: clamp(initial.y + dy, 0, sourceSize.height - initial.height),
      });
      return;
    }
    const handle = gesture.handle!;
    const minimumWidth = Math.min(16, sourceSize.width);
    const minimumHeight = Math.min(16, sourceSize.height);
    let left = initial.x, right = initial.x + initial.width;
    let top = initial.y, bottom = initial.y + initial.height;
    if (handle.includes('w')) left = clamp(left + dx, 0, right - minimumWidth);
    if (handle.includes('e')) right = clamp(right + dx, left + minimumWidth, sourceSize.width);
    if (handle.includes('n')) top = clamp(top + dy, 0, bottom - minimumHeight);
    if (handle.includes('s')) bottom = clamp(bottom + dy, top + minimumHeight, sourceSize.height);
    setCropSelection({ x: left, y: top, width: right - left, height: bottom - top });
  }

  function finishGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (gestureRef.current?.pointerId === event.pointerId) gestureRef.current = null;
  }

  function useFullImage() {
    if (!sourceSize) return;
    setCropSelection({ x: 0, y: 0, width: sourceSize.width, height: sourceSize.height });
    setError('');
  }

  const applyCrop = handleSubmit(async (values) => {
    const image = imageRef.current;
    if (!image) return;
    const currentSourceSize = sourceSize ?? { width: values.sourceWidth, height: values.sourceHeight };
    const currentSelection = selection ?? values.selection;
    const validatedCrop = cropSchema.safeParse({
      sourceWidth: currentSourceSize.width,
      sourceHeight: currentSourceSize.height,
      selection: currentSelection,
    });
    if (!validatedCrop.success) {
      setError('A área selecionada precisa ficar dentro da imagem.');
      return;
    }
    setError('');
    setProcessing(true);
    let closeAfterConfirm = false;
    try {
      const crop = validatedCrop.data.selection;
      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('O navegador não conseguiu preparar o recorte.');
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      const blob = await withTimeout(new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92)),
        10_000, null, 'Gerar recorte da imagem');
      if (!blob) throw new Error('Não foi possível gerar o recorte. Tente novamente.');
      const basename = filename.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'imagem';
      const applied = await onConfirm(new File([blob], `${basename}-recortada.webp`, { type: 'image/webp' }), {
        sourceWidth: currentSourceSize.width, sourceHeight: currentSourceSize.height, selection: crop,
      });
      if (applied === false) throw new Error('Não foi possível aplicar o recorte. Tente novamente.');
      closeAfterConfirm = true;
      onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível aplicar o recorte.');
    } finally {
      if (!closeAfterConfirm) setProcessing(false);
    }
  }, () => setError('A área selecionada precisa ficar dentro da imagem.'));

  return createPortal(<dialog ref={dialogRef} className="ct-image-crop-dialog ct-surface" aria-labelledby="ct-image-crop-title"
    onCancel={(event) => { event.preventDefault(); if (!processing) onCancel(); }}>
    <form className="ct-image-crop-form" noValidate onSubmit={(event) => {
      event.stopPropagation(); // Eventos do portal também alcançam o formulário do modelo na árvore React.
      void applyCrop(event);
    }}>
      <header className="ct-image-crop-header">
        <div><h2 id="ct-image-crop-title">Recortar imagem</h2><p>A seleção começa ajustada ao conteúdo principal. Arraste a área para mover ou as bordas para ajustar.</p></div>
        <button type="button" className="ct-button ct-icon-button" aria-label="Fechar recorte" disabled={processing} onClick={onCancel}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </header>
      <div className="ct-image-crop-stage" ref={stageRef}>
        <div className="ct-image-crop-photo" style={displaySize ? { width: displaySize.width, height: displaySize.height } : undefined}
          onPointerMove={moveGesture} onPointerUp={finishGesture} onPointerCancel={finishGesture}>
          <img ref={imageRef} className="ct-image-crop-source" style={displaySize ? undefined : { width: 'auto', height: 'auto' }}
            src={source} alt="Imagem para recortar" draggable={false} onLoad={initializeImage}
            onError={() => setError('Não foi possível abrir esta imagem para recorte.')} />
          {displaySize && sourceSize && selection && <div className="ct-image-crop-selection" style={{
            left: `${100 * selection.x / sourceSize.width}%`, top: `${100 * selection.y / sourceSize.height}%`,
            width: `${100 * selection.width / sourceSize.width}%`, height: `${100 * selection.height / sourceSize.height}%`,
          }} onPointerDown={(event) => beginGesture(event, 'move')}>
            <span className="ct-image-crop-instructions">Mover área de recorte</span>
            {handles.map(({ id, label }) => <button key={id} type="button" className={`ct-image-crop-handle ct-image-crop-handle-${id}`}
              aria-label={label} title={label} disabled={processing} onPointerDown={(event) => beginGesture(event, 'resize', id)} />)}
          </div>}
        </div>
        {!sourceSize && !error && <p role="status" className="ct-image-crop-loading">Carregando imagem…</p>}
      </div>
      {(error || errors.selection) && <p role="alert" className="ct-image-crop-error">{error || errors.selection?.message}</p>}
      <footer className="ct-image-crop-footer">
        <button type="button" className="ct-button" disabled={processing || !sourceSize} onClick={useFullImage}>Usar imagem inteira</button>
        <div><button type="button" className="ct-button" disabled={processing} onClick={onCancel}>Cancelar</button>
          <button type="submit" className="ct-button ct-primary" disabled={processing || !selection}>
            {processing ? 'Aplicando…' : 'Aplicar recorte'}
          </button></div>
      </footer>
    </form>
  </dialog>, document.body);
}
