import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deleteImageTemplateSchema, IMAGE_TEMPLATE_STARTERS, imageTemplateMetadataSchema, imageTemplateStartSchema,
  type DeleteImageTemplateValues, type ImageTemplateStarter } from '../../../../../../shared-utils/catalogImageTemplate';
import { imageTemplateError, type ImageTemplateSummary } from './imageTemplateService';

const starterLabels: Record<ImageTemplateStarter, string> = {
  blank: 'Começar em branco', showcase: 'Vitrine', frame: 'Moldura', offer: 'Oferta', banner: 'Faixa da marca', details: 'Ficha do produto',
};
export type TemplateDetails = { name: string; description: string; starter: ImageTemplateStarter };

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
    resolver: zodResolver(imageTemplateStartSchema),
    defaultValues: { name: '', description: '', ...defaults, starter: 'blank' },
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
        await onConfirm({ ...metadata, starter: values.starter });
      } catch (cause) { setError(imageTemplateError(cause)); }
    })}>
      <header className="ct-dialog-header"><h2 id="ct-dialog-title">{title}</h2>
        <button type="button" className="ct-button ct-icon-button" aria-label="Fechar" disabled={isSubmitting} onClick={onClose}><i className="bi bi-x-lg" aria-hidden="true" /></button>
      </header>
      {mode === 'create' && <fieldset className="ct-starter-grid" disabled={isSubmitting}>
        <legend className="sr-only">Modelo inicial</legend>
        {IMAGE_TEMPLATE_STARTERS.map((starter) => <label className={`ct-starter ct-starter-${starter}`} key={starter}>
          <input type="radio" value={starter} {...register('starter')} />
          {starter === 'blank' ? <div><strong>{starterLabels[starter]}</strong><p>Monte o visual do seu produto do zero.</p></div> : <>
            <div className="ct-starter-preview" aria-hidden="true"><div className="ct-sofa"><span /></div><span className="ct-starter-decoration" /></div>
            <strong>{starterLabels[starter]}</strong>
          </>}
        </label>)}
      </fieldset>}
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
    resolver: zodResolver(deleteImageTemplateSchema), defaultValues: { id: model.id, updated_at: model.updated_at },
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
