import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  siteElementActivationFormSchema,
  type SiteElementActivationFormValues,
} from '../../../../../../shared-utils/siteElementSchemas';
import { siteElementErrorMessage, siteElementModelLabel, type SiteElementModel } from './siteElementService';

interface Props {
  model: SiteElementModel;
  onEdit: () => void;
  onDelete: () => void;
  onActivationChange: (values: SiteElementActivationFormValues) => Promise<void>;
  disabled?: boolean;
}

export default function SiteElementModelActions({ model, onEdit, onDelete, onActivationChange, disabled }: Props) {
  const active = model.active ?? true;
  const label = siteElementModelLabel(model);
  const form = useZodForm(siteElementActivationFormSchema, { id: model.id, kind: model.kind, active: !active, updated_at: model.updated_at });
  const { isSubmitting, errors } = form.formState;
  const busy = isSubmitting || disabled;
  const toggleActivation = form.submit(async (values) => {
    try {
      await onActivationChange(values);
    } catch (error) {
      form.setError('root', { message: siteElementErrorMessage(error) });
    }
  }, (validationErrors) => form.setError('root', {
    message: Object.values(flattenFormErrors(validationErrors))[0] || 'Modelo não identificado.',
  }));

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="flex flex-wrap items-stretch gap-2">
        <button type="button" role="switch" aria-checked={active} aria-busy={isSubmitting}
          aria-label={`Ativação de ${label}`} title={`${active ? 'Desativar' : 'Ativar'} ${model.kind === 'top_bar' ? 'aviso' : 'modelo'}`}
          disabled={busy} onClick={toggleActivation}
          className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600 disabled:cursor-wait disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800">
          <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${active ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
            <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${active ? 'translate-x-4' : 'translate-x-0'}`} />
          </span>
          {active ? 'Ativo' : 'Inativo'}
        </button>
        <button type="button" onClick={onEdit} aria-label={`Editar ${label}`} disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:bg-slate-800">
          <i className="bi bi-pencil" />Editar
        </button>
        <button type="button" onClick={onDelete} aria-label={`Excluir ${label}`} disabled={busy}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30">
          <i className="bi bi-trash" />Excluir
        </button>
      </div>
      {isSubmitting && <p role="status" className="text-xs text-slate-600 dark:text-slate-300">Salvando status…</p>}
      {errors.root && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{errors.root.message}</p>}
    </div>
  );
}
