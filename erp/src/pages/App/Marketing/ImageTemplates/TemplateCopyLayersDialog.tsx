import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IMAGE_FORMATS, type ImageFormat } from '../../../../../../shared-utils/catalogImageTemplate';

const formatNames: Record<ImageFormat, string> = { '1:1': 'Quadrado', '4:5': 'Feed', '9:16': 'Stories e Reels' };
const copyTargetsSchema = z.object({
  formats: z.array(z.enum(IMAGE_FORMATS)).min(1, 'Selecione pelo menos uma proporção.'),
});
type CopyTargets = z.infer<typeof copyTargetsSchema>;

export function TemplateCopyLayersDialog({ sourceFormat, disabled, onClose, onConfirm }: {
  sourceFormat: ImageFormat; disabled: boolean; onClose: () => void;
  onConfirm: (formats: ImageFormat[]) => Promise<void> | void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const schema = useMemo(() => copyTargetsSchema.refine(({ formats }) => formats.every((format) => format !== sourceFormat), {
    path: ['formats'], message: 'Escolha uma proporção diferente da atual.',
  }), [sourceFormat]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CopyTargets>({
    resolver: zodResolver(schema), defaultValues: { formats: [] },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return createPortal(<dialog ref={dialogRef} className="ct-dialog ct-surface ct-copy-layers-dialog"
    aria-labelledby="ct-copy-layers-title" onCancel={(event) => { event.preventDefault(); if (!isSubmitting) onClose(); }}>
    <form noValidate onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.stopPropagation();
      setError('');
      void handleSubmit(async ({ formats }) => {
        try { await onConfirm(formats); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível copiar as camadas.'); }
      })(event);
    }}>
      <header className="ct-dialog-header"><div><h2 id="ct-copy-layers-title">Copiar camadas para proporções</h2>
        <p className="ct-muted">A origem é {formatNames[sourceFormat]} ({sourceFormat}).</p></div>
        <button type="button" className="ct-button ct-icon-button" aria-label="Fechar" disabled={disabled || isSubmitting}
          onClick={onClose}><i className="bi bi-x-lg" aria-hidden="true" /></button>
      </header>
      <div className="ct-dialog-fields">
        <p className="ct-muted">Cada cópia fica independente. Uma proporção ainda não criada começa com uma camada de produto, o fundo atual e as camadas copiadas.</p>
        <div className="ct-copy-format-list">
          {IMAGE_FORMATS.filter((format) => format !== sourceFormat).map((format) => <label key={format} className="ct-copy-format-option">
            <input type="checkbox" value={format} {...register('formats')} disabled={disabled || isSubmitting} />
            <span><strong>{formatNames[format]}</strong><small>{format}</small></span>
          </label>)}
        </div>
        {errors.formats && <small role="alert" className="ct-error">{errors.formats.message}</small>}
        {error && <small role="alert" className="ct-error">{error}</small>}
      </div>
      <footer className="ct-dialog-footer">
        <button type="button" className="ct-button" disabled={disabled || isSubmitting} onClick={onClose}>Cancelar</button>
        <button type="submit" className="ct-button ct-primary" disabled={disabled || isSubmitting}>
          {isSubmitting ? 'Copiando…' : 'Copiar camadas'}
        </button>
      </footer>
    </form>
  </dialog>, document.body);
}
