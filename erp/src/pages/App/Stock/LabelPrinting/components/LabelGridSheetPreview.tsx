import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelSampleImageFormSchema } from '../../../../../../../shared-utils/labelImageFormSchemas';
import { readImageFile } from '../../../../../../../shared-utils/readImageFile';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

export interface LabelGridSheetPreviewLayout {
  paperWidth: number;
  paperHeight: number;
  columns: number;
  rows: number;
  margins: { top: number; bottom: number; left: number; right: number };
  gaps: { horizontal: number; vertical: number };
  layoutType: 'round' | 'rect';
  backgroundColor: string;
  imageScale: number;
  previewImage: string | null;
  customPreviewImage: string | null;
}

interface LabelGridSheetPreviewProps {
  layout: LabelGridSheetPreviewLayout;
  onCustomPreviewImageChange: (image: string | null) => void | Promise<void>;
  ownerKey?: string;
  disabled?: boolean;
}

export const LabelGridSheetPreview: React.FC<LabelGridSheetPreviewProps> = ({
  layout,
  onCustomPreviewImageChange,
  ownerKey,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageForm = useZodForm(labelSampleImageFormSchema, { action: 'upload', files: [] });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false);
  const mounted = useRef(false), locked = useRef(false), replayBlocked = useRef(false);
  const pending = useRef<{ revision: number; controller: AbortController } | null>(null);
  // Parents create layout objects inline. Compare their values and explicit
  // editor identity, not object/callback references or completeness of drafts.
  const contextKey = JSON.stringify([ownerKey, layout, disabled]);
  const owner = useRef({ key: contextKey, revision: 0 });
  if (owner.current.key !== contextKey) owner.current = { key: contextKey, revision: owner.current.revision + 1 };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.controller.abort(); };
  }, []);
  useEffect(() => {
    if (pending.current && pending.current.revision !== owner.current.revision) pending.current.controller.abort();
    replayBlocked.current = false; setBlocked(false); setError('');
  }, [contextKey]);

  const run = async (values: Parameters<typeof imageForm.validateAndRun>[0]) => {
    if (!mounted.current || disabled || locked.current || replayBlocked.current) return;
    locked.current = true; setBusy(true); setError('');
    const controller = new AbortController(), revision = owner.current.revision;
    pending.current = { controller, revision };
    const current = () => mounted.current && owner.current.revision === revision && !controller.signal.aborted;
    const fail = (message: string) => { if (current()) { setError(message); toast.error(message); } };
    try {
      await imageForm.validateAndRun(values, async (parsed) => {
        if (!current()) return;
        const image = parsed.action === 'upload' ? await readImageFile(parsed.files[0], controller.signal) : null;
        if (!current()) return;
        const result = await withTimeout(Promise.resolve(onCustomPreviewImageChange(image)).then(() => ({ done: true })),
          15_000, null, 'etiquetas:aplicar-amostra');
        if (!current()) return;
        if (!result) {
          replayBlocked.current = true; setBlocked(true);
          throw new Error('A alteração da amostra não foi confirmada. Confira a prévia antes de tentar novamente.');
        }
      }, (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira a imagem da amostra.'));
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : 'Não foi possível alterar a amostra.');
    } finally {
      if (pending.current?.controller === controller) pending.current = null;
      controller.abort(); locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const aspect = layout.paperWidth / layout.paperHeight;
  const previewHeight = 1000;
  const previewWidth = previewHeight * aspect;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
      {busy && <p role="status" className="flex w-full items-center gap-2 text-sm text-blue-700"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />Validando e aplicando a amostra…</p>}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            Conteúdo de Amostra
          </p>
          <p className="text-[7px] text-slate-400 italic">
            Escolha uma imagem para pré-visualizar o layout da folha.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {layout.customPreviewImage && (
            <button
              type="button"
              disabled={disabled || busy || blocked}
              onClick={() => void run({ action: 'clear', image: layout.customPreviewImage || '' })}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[8px] font-black uppercase transition-all"
            >
              <i className="bi bi-trash3 mr-2" /> Limpar
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            aria-label="Carregar amostra de etiqueta"
            disabled={disabled || busy || blocked}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              await run({ action: 'upload', files: [file] });
            }}
          />
          <button
            type="button"
            disabled={disabled || busy || blocked}
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-3"
          >
            <i className="bi bi-image-fill" />{' '}
            {layout.customPreviewImage ? 'Trocar Amostra' : 'Escolher Amostra'}
          </button>
        </div>
      </div>

      <div
        className="relative bg-white shadow-2xl border-4 border-white overflow-hidden flex flex-col"
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
          padding: `${layout.margins.top / 2}px ${layout.margins.right / 2}px ${layout.margins.bottom / 2}px ${layout.margins.left / 2}px`,
        }}
      >
        <div
          className="flex-1 grid"
          style={{
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            columnGap: `${layout.gaps.horizontal / 2}px`,
            rowGap: `${layout.gaps.vertical / 2}px`,
          }}
        >
          {Array.from({ length: layout.columns * layout.rows }).map((_, index) => (
            <div key={index} className="relative flex items-center justify-center overflow-visible">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: layout.backgroundColor || 'white',
                  zIndex: 0,
                }}
              >
                {layout.previewImage && (
                  <img
                    src={layout.previewImage}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `translate(-50%, -50%) scale(${layout.imageScale})`,
                      opacity: 1,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          className="absolute grid pointer-events-none"
          style={{
            inset: `${layout.margins.top / 2}px ${layout.margins.right / 2}px ${layout.margins.bottom / 2}px ${layout.margins.left / 2}px`,
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            columnGap: `${layout.gaps.horizontal / 2}px`,
            rowGap: `${layout.gaps.vertical / 2}px`,
          }}
        >
          {Array.from({ length: layout.columns * layout.rows }).map((_, index) => (
            <div key={index} className="relative flex items-center justify-center overflow-visible">
              <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 10 }} />
              <div
                className={`relative border border-slate-400 overflow-hidden ${layout.layoutType === 'round' ? 'rounded-full' : ''}`}
                style={{ width: '100%', height: '100%', zIndex: 5 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
