import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { compressImageToFile } from '@/pages/utils/images/imageUtils';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { imageFilesFormSchema, rectangularImageCropFormSchema } from '../../../../../../shared-utils/fileFormSchemas';

type ImageSize = { width: number; height: number };
type Props = {
  file: File;
  label?: string;
  confirmLabel?: string;
  preferredMaxBytes?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
} & (
  | { kind: 'header' | 'footer' | 'seal'; targetSize?: ImageSize }
  | { kind: 'carousel'; targetSize: ImageSize }
);

const CROP_LABELS = {
  header: 'cabeçalho',
  footer: 'rodapé',
  seal: 'selo',
  carousel: 'imagem do carrossel',
};

type Selection = { x: number; y: number; width: number; height: number };
type Corner = 'nw' | 'ne' | 'sw' | 'se';
type DragState =
  | { mode: 'move'; pointerX: number; pointerY: number; selection: Selection }
  | { mode: 'resize'; pointerX: number; corner: Corner; selection: Selection };

export default function FixedAspectImageCropper({ file, kind, targetSize, label, confirmLabel = 'Aplicar recorte', preferredMaxBytes, onCancel, onConfirm }: Props) {
  const [source, setSource] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState('');
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = useRef(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const target = targetSize || (kind === 'seal' ? { width: 800, height: 200 } : { width: 1080, height: 170 });
  const { validateValues: validateImage } = useZodForm(imageFilesFormSchema, { files: [file] });
  const cropForm = useZodForm(rectangularImageCropFormSchema, { files: [file], displayWidth: 0, displayHeight: 0, sourceWidth: 0, sourceHeight: 0, selection: { x: 0, y: 0, width: 0, height: 0 } });
  const loading = !selection && !error;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    active.current = true;
    dialog.showModal();
    return () => {
      active.current = false;
      dialog.close();
    };
  }, []);

  useEffect(() => {
    let current = true;
    let url = '';
    setSource('');
    setSelection(null);
    setError('');
    void validateImage({ files: [file] }, (errors) => {
      if (current) setError(Object.values(flattenFormErrors(errors))[0]);
    }).then((values) => {
      if (!current || !values) return;
      url = URL.createObjectURL(values.files[0]);
      setSource(url);
    }).catch(() => { if (current) setError('Não foi possível abrir a imagem.'); });
    return () => { current = false; if (url) URL.revokeObjectURL(url); };
  }, [file, validateImage]);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setError('A leitura da imagem demorou demais. Cancele e selecione o arquivo novamente.'), 10_000);
    return () => window.clearTimeout(timer);
  }, [file, loading]);

  const cancelCrop = () => {
    active.current = false;
    onCancel();
  };

  const initializeSelection = () => {
    const image = imageRef.current;
    if (!image) return;
    const ratio = target.width / target.height;
    const initialFill = kind === 'carousel' ? 1 : 0.88;
    let width = image.clientWidth * initialFill;
    let height = width / ratio;
    if (height > image.clientHeight * initialFill) {
      height = image.clientHeight * initialFill;
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
    const x = Math.min(
      Math.max(0, drag.selection.x + event.clientX - drag.pointerX),
      image.clientWidth - selection.width
    );
    const y = Math.min(
      Math.max(0, drag.selection.y + event.clientY - drag.pointerY),
      image.clientHeight - selection.height
    );
    setSelection({ ...selection, x, y });
  };

  const resizeSelection = (
    pointerX: number,
    drag: Extract<DragState, { mode: 'resize' }>,
    image: HTMLImageElement
  ) => {
    const start = drag.selection;
    const east = drag.corner.endsWith('e');
    const south = drag.corner.startsWith('s');
    const ratio = target.width / target.height;
    const requestedWidth = start.width + (pointerX - drag.pointerX) * (east ? 1 : -1);
    const anchorX = east ? start.x : start.x + start.width;
    const anchorY = south ? start.y : start.y + start.height;
    const maxWidthX = east ? image.clientWidth - anchorX : anchorX;
    const maxWidthY = (south ? image.clientHeight - anchorY : anchorY) * ratio;
    const width = Math.min(Math.max(80, requestedWidth), maxWidthX, maxWidthY);
    const height = width / ratio;
    setSelection({
      x: east ? anchorX : anchorX - width,
      y: south ? anchorY : anchorY - height,
      width,
      height,
    });
  };

  const finishCrop = async () => {
    const image = imageRef.current;
    if (!image || !selection) return;
    return cropForm.validateAndRun({ files: [file], selection, displayWidth: image.clientWidth, displayHeight: image.clientHeight, sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight }, async (values) => {
      if (!active.current) return;
      setError('');
      try {
        const scaleX = values.sourceWidth / values.displayWidth;
        const scaleY = values.sourceHeight / values.displayHeight;
        const canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Não foi possível obter o contexto do recorte.');
        context.drawImage(
          image,
          values.selection.x * scaleX,
          values.selection.y * scaleY,
          values.selection.width * scaleX,
          values.selection.height * scaleY,
          0,
          0,
          target.width,
          target.height
        );
        let blob: Blob | null = null;
        const qualities = targetSize ? [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56] : [0.95];
        for (const quality of qualities) {
          const candidate = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
          if (!active.current) return;
          if (!candidate) continue;
          blob = candidate;
          if (!targetSize || blob.size <= (preferredMaxBytes ?? 5 * 1024 * 1024)) break;
        }
        if (!blob) throw new Error('Não foi possível gerar a imagem recortada.');
        const extension = blob.type === 'image/png' ? 'png' : 'webp';
        const cropped = new File([blob], `${kind}-${Date.now()}.${extension}`, { type: blob.type });
        if (targetSize) {
          if (cropped.size > 5 * 1024 * 1024) throw new Error('O recorte excede o limite de 5 MB. Tente outra imagem.');
          await onConfirm(cropped);
        } else {
          const compressed = await compressImageToFile(cropped, { maxMB: 0.8, maxWidth: target.width, fileType: 'image/webp' });
          if (active.current) await onConfirm(compressed);
        }
      } catch (cause) {
        if (active.current) setError(cause instanceof Error ? cause.message : 'Não foi possível aplicar o recorte. Tente novamente.');
      }
    }, (errors) => {
      if (active.current) setError(Object.values(flattenFormErrors(errors))[0]);
    });
  };

  const beginResize = (event: React.PointerEvent<HTMLSpanElement>, corner: Corner) => {
    if (!selection) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode: 'resize', pointerX: event.clientX, corner, selection };
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-instructions`}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-slate-950/80 dark:bg-slate-900"
      onCancel={(event) => {
        event.preventDefault();
        cancelCrop();
      }}
    >
        <div className="flex items-center justify-between">
          <div>
            <h4 id={titleId} className="text-sm font-black text-slate-800 dark:text-slate-100">
              Recortar {label || CROP_LABELS[kind]}
            </h4>
            <p id={`${titleId}-instructions`} className="text-[10px] text-slate-500 dark:text-slate-400">
              Arraste a área de seleção · saída {target.width} × {target.height} px
            </p>
          </div>
          <button type="button" aria-label="Fechar recorte" onClick={cancelCrop}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="mt-4 flex max-h-[65vh] flex-col items-center justify-center overflow-auto rounded-xl bg-slate-950 p-3">
          {loading && <p role="status" className="text-sm text-slate-200">Carregando a imagem…</p>}
          <div className="relative w-fit max-w-full select-none">
            {source && (selection || !error) && (
              <img
                ref={imageRef}
                src={source}
                alt="Imagem inteira para recorte"
                draggable={false}
                onLoad={initializeSelection}
                onError={() => setError('Não foi possível ler a imagem. Selecione um arquivo PNG, JPG ou WebP válido.')}
                className="block max-h-[60vh] max-w-full object-contain"
              />
            )}
            {selection && (
              <div
                className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(2,6,23,0.7)]"
                style={{
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragRef.current = {
                    mode: 'move',
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    selection,
                  };
                }}
                onPointerMove={moveSelection}
                onPointerUp={() => {
                  dragRef.current = null;
                }}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
              >
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-[10px] font-black text-slate-700 shadow">
                  <i className="bi bi-arrows-move mr-1" />
                  Mova ou redimensione
                </span>
                {(['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => (
                  <span
                    key={corner}
                    onPointerDown={(event) => beginResize(event, corner)}
                    onPointerMove={moveSelection}
                    onPointerUp={() => {
                      dragRef.current = null;
                    }}
                    style={{ cursor: `${corner}-resize` }}
                    className={`absolute h-4 w-4 touch-none rounded-sm border-2 border-blue-600 bg-white ${corner.includes('n') ? '-top-2' : '-bottom-2'} ${corner.includes('w') ? '-left-2' : '-right-2'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelCrop}
            className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={finishCrop}
            disabled={!selection || cropForm.formState.isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
    </dialog>
  );
}
