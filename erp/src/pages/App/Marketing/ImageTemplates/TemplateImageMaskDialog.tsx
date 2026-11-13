import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  imageMaskEditSchema, type ImageMaskCorrection, type ImageMaskStroke,
} from '../../../../../../shared-utils/catalogImageTemplate';
import { drawCorrectedPhoto, templatePhotoKey, templatePhotoVariants } from './rendering/templateImageMask';
import type { TemplatePicture, TemplatePictureLoader } from './rendering/templatePictureLoader';

type MaskPhotos = { key: string; original: TemplatePicture; cutout: TemplatePicture };
type MaskForm = { strokes: ImageMaskStroke[] };

export function TemplateImageMaskDialog({
  photos, useMedium, getPicture, correction, onCancel, onConfirm,
}: {
  photos: readonly string[];
  useMedium: boolean;
  getPicture: TemplatePictureLoader;
  correction?: ImageMaskCorrection;
  onCancel: () => void;
  onConfirm: (value: ImageMaskCorrection | undefined) => boolean | void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<{ pointer: number; stroke: ImageMaskStroke } | null>(null);
  const [picture, setPicture] = useState<MaskPhotos>();
  const [mode, setMode] = useState<ImageMaskStroke['mode']>('restore');
  const [size, setSize] = useState(30);
  const [error, setError] = useState('');
  const [originalVisible, setOriginalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const { handleSubmit, getValues, setValue, reset, watch, formState: { errors } } = useForm<MaskForm>({
    resolver: zodResolver(imageMaskEditSchema),
    defaultValues: { strokes: [] },
  });
  const strokes = watch('strokes');
  const initial = useRef({ photos, useMedium, getPicture, correction });

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const config = initial.current;
    void (async () => {
      for (const source of config.photos) {
        for (const url of templatePhotoVariants(source, config.useMedium)) {
          if (cancelled) return;
          try {
            const [key, original, cutout] = await Promise.all([
              templatePhotoKey(source), config.getPicture(url, false),
              config.getPicture(url, true, { preview: true, priority: 'high' }),
            ]);
            if (cancelled) return;
            reset({ strokes: config.correction?.photoKey === key ? config.correction.strokes : [] });
            setPicture({ key, original, cutout });
            return;
          } catch {
            // If the medium file is missing, try the source photo.
          }
        }
      }
      if (!cancelled) setError('Não foi possível abrir a foto para ajustar o recorte.');
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reset]);

  function paint(draft?: ImageMaskStroke) {
    if (!picture || !preview.current) return;
    drawCorrectedPhoto(
      preview.current, originalVisible ? { ...picture.cutout, image: picture.original.image } : picture.cutout,
      picture.original.image, originalVisible ? [] : draft ? [...getValues('strokes'), draft] : getValues('strokes'),
    );
  }

  useEffect(() => {
    paint();
  }, [picture, strokes, originalVisible]);

  function position(event: PointerEvent<HTMLCanvasElement>): [number, number] {
    const bounds = event.currentTarget.getBoundingClientRect();
    const coord = (value: number, length: number) => Math.round(Math.min(1, Math.max(0, value / length)) * 1000);
    return [coord(event.clientX - bounds.left, bounds.width), coord(event.clientY - bounds.top, bounds.height)];
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (!picture || originalVisible || !event.isPrimary || event.button !== 0 || strokes.length >= 30) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { pointer: event.pointerId, stroke: { mode, size, points: [position(event)] } };
    paint(gesture.current.stroke);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    const current = gesture.current;
    if (current?.pointer !== event.pointerId) return;
    const points = current.stroke.points;
    const point = position(event);
    const last = points.at(-1)!;
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 3) return;
    if (points.length >= 160) return;
    points.push(point);
    paint(current.stroke);
  }

  function finish(event: PointerEvent<HTMLCanvasElement>, cancelled = false) {
    const current = gesture.current;
    if (current?.pointer !== event.pointerId) return;
    gesture.current = null;
    if (cancelled) paint();
    else setValue('strokes', [...getValues('strokes'), current.stroke], { shouldDirty: true });
  }

  return createPortal(<dialog ref={dialog} className="ct-image-crop-dialog ct-mask-dialog" aria-label="Ajustar máscara"
    onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <form className="ct-image-crop-form" onSubmit={(event) => {
      event.stopPropagation();
      void handleSubmit(({ strokes: next }) => {
      if (picture) onConfirm(next.length ? { photoKey: picture.key, strokes: next } : undefined);
      })(event);
    }}>
      <header className="ct-image-crop-header">
        <div><h2>Ajustar máscara</h2><p>Pinte sobre a região que quer restaurar ou apagar.</p></div>
        <button type="button" className="ct-button" onClick={onCancel} aria-label="Fechar ajuste da máscara">Fechar</button>
      </header>
      <div className="ct-mask-tools" aria-label="Ferramentas da máscara">
        <button type="button" className="ct-button" aria-pressed={mode === 'restore'} onClick={() => setMode('restore')}>Restaurar</button>
        <button type="button" className="ct-button" aria-pressed={mode === 'erase'} onClick={() => setMode('erase')}>Apagar</button>
        <label>Tamanho do pincel <input type="range" min={5} max={100} value={size} onChange={(event) => setSize(event.target.valueAsNumber)} /></label>
        <button type="button" className="ct-button" disabled={!strokes.length}
          onClick={() => setValue('strokes', strokes.slice(0, -1), { shouldDirty: true })}>Desfazer traço</button>
        <button type="button" className="ct-button" disabled={!picture} aria-pressed={originalVisible}
          onClick={() => setOriginalVisible((value) => !value)}>Foto original</button>
      </div>
      <div className="ct-image-crop-stage ct-mask-stage">
        {loading && <p role="status">Preparando a máscara…</p>}
        {picture && <canvas ref={preview} role="img" aria-label={originalVisible ? 'Foto original' : 'Prévia da máscara'}
          onPointerDown={start} onPointerMove={move} onPointerUp={finish}
          onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)} />}
      </div>
      {(error || errors.strokes) && <p role="alert" className="ct-image-crop-error">{error || 'Revise os traços da máscara.'}</p>}
      {picture?.cutout.flatBackground === false && <p className="ct-mask-notice" role="status">O recorte automático falhou. Use o pincel Apagar para remover o fundo manualmente.</p>}
      {strokes.length >= 30 && <p className="ct-mask-notice" role="status">Limite de 30 traços. Desfaça um traço para continuar.</p>}
      <footer className="ct-image-crop-footer"><div>
        <button type="button" className="ct-button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="ct-button ct-primary" disabled={!picture}>Aplicar ajuste</button>
      </div></footer>
    </form>
  </dialog>, document.body);
}
