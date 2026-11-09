import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deleteImageTemplateSchema, imageTemplateMetadataSchema, type DeleteImageTemplateValues } from '../../../../../../shared-utils/catalogImageTemplate';
import { imageTemplateError, type ImageTemplateSummary } from './imageTemplateService';

export type TemplateDetails = { name: string; description: string };

function useTemplateDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const target = dialog.current;
    if (!target?.open) target?.showModal();
    return () => { if (target?.open) target.close(); };
  }, []);
  return dialog;
}

export function TemplateDetailsDialog({ mode, defaults, onClose, onConfirm }: {
  mode: 'create' | 'rename' | 'copy'; defaults?: Pick<TemplateDetails, 'name' | 'description'>;
  onClose: () => void; onConfirm: (values: TemplateDetails) => Promise<void> | void;
}) {
  const dialog = useTemplateDialog();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<TemplateDetails>({
    resolver: zodResolver(imageTemplateMetadataSchema),
    defaultValues: { name: '', description: '', ...defaults },
  });
  const { isSubmitting, errors } = formState;
  const title = mode === 'create' ? 'Criar um modelo de imagem' : mode === 'rename' ? 'Renomear modelo' : 'Fazer uma cópia';
  return <dialog ref={dialog} className="ct-dialog ct-surface" aria-labelledby="ct-dialog-title" onCancel={(event) => {
    event.preventDefault(); if (!isSubmitting) onClose();
  }}>
    <form noValidate onSubmit={handleSubmit(async (values) => {
      setError('');
      try {
        const metadata = imageTemplateMetadataSchema.parse(values);
        await onConfirm(metadata);
      } catch (cause) { setError(imageTemplateError(cause)); }
    })}>
      <header className="ct-dialog-header"><h2 id="ct-dialog-title">{title}</h2>
        <button type="button" className="ct-button ct-icon-button" aria-label="Fechar" disabled={isSubmitting} onClick={onClose}><i className="bi bi-x-lg" aria-hidden="true" /></button>
      </header>
      <div className="ct-dialog-fields">
        <label className="ct-field"><span>Nome do modelo</span><input {...register('name')} maxLength={100} autoFocus autoComplete="off"
          placeholder="Nome do modelo" disabled={isSubmitting} aria-invalid={!!errors.name} /></label>
        {errors.name && <small role="alert" className="ct-error">{errors.name.message}</small>}
        <label className="ct-field"><span>Descrição do modelo <small className="ct-muted">· Opcional</small></span>
          <textarea {...register('description')} maxLength={400} rows={3} placeholder="Descrição" disabled={isSubmitting} /></label>
        {errors.description && <small role="alert" className="ct-error">{errors.description.message}</small>}
        {error && <small role="alert" className="ct-error">{error}</small>}
      </div>
      <footer className="ct-dialog-footer">
        <button type="button" className="ct-button" disabled={isSubmitting} onClick={onClose}>Cancelar</button>
        <button type="submit" className="ct-button ct-primary" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : mode === 'rename' ? 'Salvar' : 'Avançar'}</button>
      </footer>
    </form>
  </dialog>;
}

export function TemplateDeleteDialog({ model, onClose, onConfirm }: {
  model: ImageTemplateSummary; onClose: () => void; onConfirm: (values: DeleteImageTemplateValues) => Promise<void>;
}) {
  const dialog = useTemplateDialog();
  const [error, setError] = useState('');
  const { handleSubmit, formState: { isSubmitting } } = useForm<DeleteImageTemplateValues>({
    resolver: zodResolver(deleteImageTemplateSchema), defaultValues: { id: model.id, updated_at: model.updated_at,
      ...(model.test_artifact ? { test_artifact: model.test_artifact } : {}) },
  });
  return <dialog ref={dialog} className="ct-dialog ct-surface" aria-labelledby="ct-delete-title" onCancel={(event) => {
    event.preventDefault(); if (!isSubmitting) onClose();
  }}>
    <form noValidate onSubmit={handleSubmit(async (values) => {
      setError('');
      try { await onConfirm(values); } catch (cause) { setError(imageTemplateError(cause)); }
    }, () => setError('Atualize a lista para confirmar a versão do modelo.'))}>
      <header className="ct-dialog-header"><h2 id="ct-delete-title">Excluir modelo de imagem?</h2></header>
      <div className="ct-dialog-fields"><p>O modelo “{model.name}” será removido da biblioteca.</p>
        {error && <p role="alert" className="ct-error">{error}</p>}</div>
      <footer className="ct-dialog-footer">
        <button type="button" className="ct-button" autoFocus disabled={isSubmitting} onClick={onClose}>Cancelar</button>
        <button type="submit" className="ct-button ct-danger" disabled={isSubmitting}>{isSubmitting ? 'Excluindo…' : 'Excluir modelo'}</button>
      </footer>
    </form>
  </dialog>;
}
