import { useEffect, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { siteElementDeleteFormSchema } from '../../../../../../shared-utils/siteElementSchemas';
import { deleteSiteElementModel, siteElementErrorMessage, type SiteElementModel } from './siteElementService';

interface Props {
  model: SiteElementModel;
  onClose: () => void;
  onDeleted: (cleanupFailed: boolean) => void;
}

export default function SiteElementDeleteDialog({ model, onClose, onDeleted }: Props) {
  const form = useZodForm(siteElementDeleteFormSchema, { id: model.id, kind: model.kind });
  const lock = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLFormElement>(null);
  const { isSubmitting, errors } = form.formState;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelButton.current?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <form ref={dialog} noValidate role="alertdialog" tabIndex={-1} aria-modal="true" aria-labelledby="site-element-delete-title" aria-describedby="site-element-delete-message"
      className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !lock.current) onClose();
        if (event.key !== 'Tab') return;
        const controls = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!controls?.length) {
          event.preventDefault();
          dialog.current?.focus();
          return;
        }
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
      onSubmit={form.submit(async (values) => {
        if (lock.current) return;
        lock.current = true;
        form.clearErrors('root');
        try {
          const result = await deleteSiteElementModel({ ...model, ...values });
          onDeleted(result.cleanupFailed);
        } catch (error) {
          form.setError('root', { message: siteElementErrorMessage(error) });
        } finally { lock.current = false; }
      }, (validationErrors) => form.setError('root', { message: Object.values(flattenFormErrors(validationErrors))[0] || 'Modelo não identificado.' }))}>
      <h2 id="site-element-delete-title" className="text-xl font-bold">Excluir modelo?</h2>
      <p id="site-element-delete-message" className="break-words text-sm text-slate-600 dark:text-slate-400">O modelo <strong>{model.name}</strong> e seu arquivo de imagem serão excluídos.</p>
      {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
      {isSubmitting && <p role="status" className="flex items-center gap-2 text-sm text-pink-600"><i className="bi bi-arrow-repeat animate-spin" />Excluindo modelo…</p>}
      <div className="flex justify-end gap-3">
        <button ref={cancelButton} type="button" disabled={isSubmitting} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Excluir modelo</button>
      </div>
    </form>
  </div>;
}
