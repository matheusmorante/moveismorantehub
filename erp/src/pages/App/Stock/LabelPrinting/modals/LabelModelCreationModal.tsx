import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelCropFormSchema } from '../../../../../../../shared-utils/labelDesignFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { readImageFile } from '../../../../../../../shared-utils/readImageFile';
import type { z } from 'zod';
import { imageFilesFormSchema } from '../../../../../../../shared-utils/fileFormSchemas';

export interface LabelModelCreationModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onApply: (imageDataUrl: string, scale: number) => void | boolean | Promise<void | boolean>;
  readonly contextKey?: string;
}

export interface CropArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_CROP = 20;

export const LabelModelCreationModal: React.FC<LabelModelCreationModalProps> = (props) => props.isOpen ? <LabelModelCreationSession key={JSON.stringify([props.contextKey ?? null])} {...props} /> : null;

const LabelModelCreationSession: React.FC<LabelModelCreationModalProps> = ({
  isOpen,
  onClose,
  onApply,
  contextKey,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [scaleInput, setScaleInput] = useState<number>(100);
  const [crop, setCrop] = useState<CropArea>({ x: 20, y: 20, w: 200, h: 200 });
  const [dragging, setDragging] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; crop: CropArea } | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false), [errorMessage, setErrorMessage] = useState(''), [statusMessage, setStatusMessage] = useState('');
  const active = useRef(true), pending = useRef<symbol | null>(null), uncertain = useRef(false);
  const readerController = useRef<AbortController | null>(null), prepared = useRef<{ signature: string; url: string } | null>(null);
  const source = useRef({ isOpen, contextKey }); if (source.current.isOpen !== isOpen || source.current.contextKey !== contextKey) source.current = { isOpen, contextKey };
  const cropForm = useZodForm(labelCropFormSchema, { image: imageSrc || '', scale, crop, displayWidth: 0, displayHeight: 0, renderedWidth: 0, renderedHeight: 0, sourceWidth: 0, sourceHeight: 0 });
  const uploadForm = useZodForm(imageFilesFormSchema, { files: [] });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { active.current = true; return () => { active.current = false; readerController.current?.abort(); }; }, []);
  useEffect(() => {
    readerController.current?.abort(); pending.current = null; uncertain.current = false; prepared.current = null;
    setImageSrc(null); setPreviewUrl(null); setScale(1); setScaleInput(100); setCrop({ x: 20, y: 20, w: 200, h: 200 }); setImgNaturalSize({ w: 0, h: 0 }); setDragging(null); setDragStart(null); setErrorMessage(''); setStatusMessage(''); setBusy(false);
  }, [isOpen, contextKey]);
  const close = useCallback(() => { if (!pending.current) onClose(); }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); } };
    window.addEventListener('keydown', keydown, true); return () => window.removeEventListener('keydown', keydown, true);
  }, [isOpen, close]);
  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => { const message = Object.values(flattenFormErrors(errors))[0]; setErrorMessage(message); toast.error(message); };
  const invalidatePreview = () => { prepared.current = null; setPreviewUrl(null); };

  // Sync scale slider and number input
  const handleScaleSlider = (val: number) => {
    if (pending.current) return;
    setScale(val);
    setScaleInput(Math.round(val * 100));
  };
  const handleScaleInput = (val: number) => {
    if (pending.current) return;
    const clamped = Math.max(10, Math.min(500, val));
    setScale(clamped / 100);
    setScaleInput(clamped);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file || pending.current) return;
    event.target.value = '';
    const token = Symbol('read'), scope = source.current, current = () => active.current && source.current === scope && scope.isOpen;
    pending.current = token; setBusy(true); setErrorMessage(''); setStatusMessage('Lendo a imagem do modelo...');
    const controller = new AbortController(); readerController.current = controller;
    try { await uploadForm.validateAndRun({ files: [file] }, async (values) => {
      const result = await readImageFile(values.files[0], controller.signal);
      if (!current()) return false;
      const image = labelCropFormSchema.shape.image.safeParse(result); if (!image.success) throw new Error('O arquivo não contém uma imagem válida.');
      setImageSrc(image.data); setImgNaturalSize({ w: 0, h: 0 }); invalidatePreview(); return true;
    }, (errors) => { if (current()) invalid(errors); }); }
    catch (error) { if (current()) setErrorMessage(error instanceof Error ? error.message : 'Não foi possível ler a imagem.'); }
    finally { if (pending.current === token) pending.current = null; if (current()) { setBusy(false); setStatusMessage(''); } }
  };

  // Crop dragging logic
  const onMouseDownMove = (e: React.MouseEvent) => {
    if (pending.current) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging('move');
    setDragStart({ mx: e.clientX, my: e.clientY, crop: { ...crop } });
  };

  const onMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging('resize');
    setDragStart({ mx: e.clientX, my: e.clientY, crop: { ...crop } });
  };

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !dragStart || !containerRef.current || pending.current) return;
      prepared.current = null; setPreviewUrl(null);
      const dx = e.clientX - dragStart.mx;
      const dy = e.clientY - dragStart.my;
      const bounds = containerRef.current.getBoundingClientRect();

      if (dragging === 'move') {
        const newX = Math.max(0, Math.min(bounds.width - dragStart.crop.w, dragStart.crop.x + dx));
        const newY = Math.max(0, Math.min(bounds.height - dragStart.crop.h, dragStart.crop.y + dy));
        setCrop((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (dragging === 'resize') {
        const newW = Math.max(
          MIN_CROP,
          Math.min(bounds.width - dragStart.crop.x, dragStart.crop.w + dx)
        );
        const newH = Math.max(
          MIN_CROP,
          Math.min(bounds.height - dragStart.crop.y, dragStart.crop.h + dy)
        );
        setCrop((prev) => ({ ...prev, w: newW, h: newH }));
      }
    },
    [dragging, dragStart]
  );

  const onMouseUp = useCallback(() => {
    setDragging(null);
    setDragStart(null);
  }, []);

  const renderCrop = (values: z.output<typeof labelCropFormSchema>): string => {
    const canvas = canvasRef.current, image = imgRef.current; if (!canvas || !image) throw new Error('A imagem ainda não está disponível.');
    const signature = JSON.stringify(values); if (prepared.current?.signature === signature) return prepared.current.url;
    const left = (values.displayWidth - values.renderedWidth) / 2, top = (values.displayHeight - values.renderedHeight) / 2;
    const x = Math.max(0, values.crop.x - left), y = Math.max(0, values.crop.y - top);
    const width = Math.min(values.renderedWidth, values.crop.x + values.crop.w - left) - x, height = Math.min(values.renderedHeight, values.crop.y + values.crop.h - top) - y;
    const scaleX = values.sourceWidth / values.renderedWidth, scaleY = values.sourceHeight / values.renderedHeight;
    canvas.width = Math.max(1, Math.round(width * scaleX)); canvas.height = Math.max(1, Math.round(height * scaleY));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível preparar o recorte.');
    context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, x * scaleX, y * scaleY, width * scaleX, height * scaleY, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/png'); if (!/^data:image\/png;base64,.+/.test(result)) throw new Error('A imagem recortada não foi confirmada.');
    prepared.current = { signature, url: result }; return result;
  };
  const runCrop = async (apply: boolean) => {
    if (pending.current) return;
    if (apply && uncertain.current) { setErrorMessage('Há uma aplicação sem confirmação. Confira antes de repetir.'); return; }
    const token = Symbol('crop'), scope = source.current, current = () => active.current && source.current === scope && scope.isOpen;
    pending.current = token; setBusy(true); setErrorMessage(''); setStatusMessage(apply ? 'Preparando e aplicando o modelo...' : 'Preparando a prévia do recorte...');
    const image = imgRef.current, container = containerRef.current;
    const values = { image: imageSrc || '', scale, crop, displayWidth: container?.clientWidth || 0, displayHeight: container?.clientHeight || 0, renderedWidth: image?.clientWidth || 0, renderedHeight: image?.clientHeight || 0, sourceWidth: imgNaturalSize.w, sourceHeight: imgNaturalSize.h };
    let applying = false;
    try { await cropForm.validateAndRun(values, async (parsed) => {
      if (!current()) return false;
      const result = renderCrop(parsed); setPreviewUrl(result);
      if (!apply) return true;
      applying = true;
      const confirmed = await withTimeout(Promise.resolve(onApply(result, parsed.scale)).then((value) => value !== false), 30_000, null, 'Aplicar modelo de etiqueta');
      if (!current()) return false;
      if (confirmed === null) throw new Error('A aplicação do modelo não foi confirmada. Confira antes de repetir.');
      if (!confirmed) { applying = false; throw new Error('O modelo não foi aplicado. Tente novamente.'); }
      onClose(); return true;
    }, (errors) => { if (current()) invalid(errors); }); }
    catch (error) { if (current()) { if (applying && (!error || typeof error !== 'object' || !('knownFailure' in error) || !error.knownFailure)) uncertain.current = true; setErrorMessage(error instanceof Error ? error.message : 'Não foi possível aplicar o recorte.'); } }
    finally { if (pending.current === token) pending.current = null; if (current()) { setBusy(false); setStatusMessage(''); } }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-model-creation-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
      }}
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm border-0 cursor-default"
        disabled={busy} onClick={close}
        aria-label="Fechar criador de modelo de etiqueta"
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3
              id="label-model-creation-title"
              className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight"
            >
              <i className="bi bi-stars mr-2 text-blue-500" />
              Criar Modelo de Etiqueta
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
              Upload · Recorte · Escala
            </p>
          </div>
          <button
            type="button"
            disabled={busy} onClick={close}
            aria-label="Fechar"
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <i className="bi bi-x-lg text-lg" />
          </button>
        </div>

        <fieldset disabled={busy} className="min-w-0 flex-1 overflow-y-auto p-8 space-y-6">
          {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
          {statusMessage && <p role="status"><i className="bi bi-arrow-repeat animate-spin inline-block mr-2" aria-hidden="true" />{statusMessage}</p>}
          {/* Upload Zone */}
          {!imageSrc ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                <i className="bi bi-cloud-arrow-up" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Clique para carregar a arte / modelo
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                  PNG, JPG ou WEBP de alta resolução
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              {/* Toolbar above crop */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Área de Recorte
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (pending.current) return; invalidatePreview();
                      setImgNaturalSize({ w: 0, h: 0 });
                      setImageSrc(null);
                      setPreviewUrl(null);
                    }}
                    className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <i className="bi bi-arrow-left" /> Trocar imagem
                  </button>
                  <button
                    type="button"
                    onClick={() => void runCrop(false)}
                    className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <i className="bi bi-crop" /> Pré-visualizar Recorte
                  </button>
                </div>
              </div>

              {/* Image with crop overlay */}
              <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 select-none cursor-crosshair"
                style={{ maxHeight: '320px' }}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Para recorte"
                  className="w-full h-full object-contain max-h-[320px]"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                    const bounds = containerRef.current;
                    if (bounds) setCrop((previous) => { const w = Math.min(previous.w, bounds.clientWidth), h = Math.min(previous.h, bounds.clientHeight); return { x: Math.max(0, Math.min(previous.x, bounds.clientWidth - w)), y: Math.max(0, Math.min(previous.y, bounds.clientHeight - h)), w, h }; });
                  }}
                  onError={() => { setImgNaturalSize({ w: 0, h: 0 }); setErrorMessage('Não foi possível carregar a imagem. Escolha outro arquivo.'); }}
                  draggable={false}
                />

                {/* Dark overlay outside crop */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `rgba(0,0,0,0.5)`,
                    WebkitMaskImage: `polygon(0% 0%, 0% 100%, ${crop.x}px 100%, ${crop.x}px ${crop.y}px, ${crop.x + crop.w}px ${crop.y}px, ${crop.x + crop.w}px ${crop.y + crop.h}px, ${crop.x}px ${crop.y + crop.h}px, ${crop.x}px 100%, 100% 100%, 100% 0%)`,
                  }}
                />

                {/* Crop box */}
                <div
                  className="absolute border-2 border-blue-400 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.w,
                    height: crop.h,
                    cursor: 'move',
                  }}
                  onMouseDown={onMouseDownMove}
                >
                  {/* Corner handles */}
                  <div
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border border-white rounded-full cursor-se-resize"
                    onMouseDown={onMouseDownResize}
                  />
                  {/* Center badge */}
                  <span className="absolute top-1 left-1 bg-blue-600/80 text-white text-[8px] font-mono px-1 rounded pointer-events-none">
                    {Math.round(crop.w)}x{Math.round(crop.h)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            aria-label="Imagem do modelo de etiqueta"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Scale Controls */}
          {imageSrc && (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Escala da Etiqueta
                </span>
                <div className="flex items-center gap-1">
                  <input
                    aria-label="Escala do modelo em porcentagem"
                    type="number"
                    min={10}
                    max={500}
                    value={scaleInput}
                    onChange={(e) => handleScaleInput(Number(e.target.value))}
                    className="w-14 text-right text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5"
                  />
                  <span className="text-xs font-mono text-slate-400">%</span>
                </div>
              </div>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.05}
                value={scale}
                onChange={(e) => handleScaleSlider(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          )}

          {/* Preview Box */}
          {previewUrl && (
            <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-emerald-200 shrink-0 flex items-center justify-center p-1">
                <img
                  src={previewUrl}
                  alt="Preview do recorte"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  Recorte Pronto!
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Clique em Aplicar para carregar na grade de impressão.
                </p>
              </div>
            </div>
          )}

          {/* Hidden canvas for export */}
          <canvas ref={canvasRef} className="hidden" />
        </fieldset>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={busy} onClick={close}
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void runCrop(true)}
            disabled={!imageSrc || busy || uncertain.current}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <i className="bi bi-check-lg" />
            Aplicar ao Grid
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelModelCreationModal;
