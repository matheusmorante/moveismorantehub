import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SITE_ELEMENT_CONFIG,
  siteElementImageFileSchema,
  siteElementModelFormSchema,
  type SiteElementKind,
  type SiteElementModelFormValues,
} from '../../../../../../shared-utils/siteElementSchemas';
import { saveSiteElementModel, siteElementErrorMessage, siteElementImageUrl, type SiteElementModel } from './siteElementService';

interface Props {
  kind: SiteElementKind;
  model?: SiteElementModel;
  onClose: () => void;
  onSaved: (cleanupFailed: boolean) => void;
}

export default function SiteElementFormModal({ kind, model, onClose, onSaved }: Props) {
  const config = SITE_ELEMENT_CONFIG[kind];
  const form = useForm<SiteElementModelFormValues>({
    resolver: zodResolver(siteElementModelFormSchema),
    defaultValues: {
      name: model?.name || '', kind, file: null, existingImagePath: model?.image_path || null,
      width: model?.width || 0, height: model?.height || 0,
    },
  });
  const file = form.watch('file');
  const [preview, setPreview] = useState(model ? siteElementImageUrl(model.image_path) : '');
  const [reading, setReading] = useState(false);
  const submitLock = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const { isSubmitting, errors } = form.formState;
  const busy = isSubmitting || reading;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    let current = true;
    setReading(true);
    setPreview(url);
    const fail = (message: string) => {
      if (!current) return;
      form.setValue('width', 0);
      form.setValue('height', 0);
      form.setError('file', { message });
      setReading(false);
    };
    const timer = window.setTimeout(() => {
      fail('A leitura da imagem demorou demais. Selecione o arquivo novamente.');
      current = false;
    }, 10_000);
    image.onload = () => {
      if (!current) return;
      window.clearTimeout(timer);
      form.setValue('width', image.naturalWidth);
      form.setValue('height', image.naturalHeight);
      if (image.naturalWidth !== config.width || image.naturalHeight !== config.height) {
        form.setError('file', { message: `A imagem tem ${image.naturalWidth} × ${image.naturalHeight} px. Use ${config.width} × ${config.height} px.` });
      } else form.clearErrors('file');
      setReading(false);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      fail('Não foi possível ler a imagem. Selecione um arquivo PNG, JPG ou WebP válido.');
    };
    image.src = url;
    return () => {
      current = false;
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file, form, config.width, config.height]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus();
  }, []);

  const save = form.handleSubmit(async (values) => {
    if (submitLock.current || reading) return;
    submitLock.current = true;
    form.clearErrors('root');
    try {
      const result = await saveSiteElementModel(values, model);
      onSaved(result.cleanupFailed);
    } catch (error) {
      form.setError('root', { message: siteElementErrorMessage(error) });
    } finally {
      submitLock.current = false;
    }
  });

  return <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <div ref={dialog} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="site-element-dialog-title"
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key !== 'Tab') return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
        if (!controls?.length) {
          event.preventDefault();
          dialog.current?.focus();
          return;
        }
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="site-element-dialog-title" className="text-xl font-bold text-slate-900 dark:text-white">{model ? 'Editar modelo' : 'Novo modelo'}</h2>
          <p className="mt-1 text-sm text-slate-500">{config.label}</p>
        </div>
        <button ref={closeButton} type="button" aria-label="Fechar formulário" disabled={busy} onClick={onClose}
          className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><i className="bi bi-x-lg" /></button>
      </div>
      <form noValidate onSubmit={save} className="space-y-5">
        <div>
          <label htmlFor="site-element-name" className="mb-1 block text-sm font-semibold">Nome do modelo <span className="text-red-500">*</span></label>
          <input id="site-element-name" {...form.register('name')} maxLength={100} disabled={busy}
            aria-invalid={!!errors.name} aria-describedby={errors.name ? 'site-element-name-error' : undefined}
            placeholder="Ex.: Campanha de novembro"
            className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-pink-500 dark:border-slate-700" />
          {errors.name && <p id="site-element-name-error" role="alert" className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="site-element-file" className="mb-1 block text-sm font-semibold">Arquivo da imagem {!model && <span className="text-red-500">*</span>}</label>
          <p id="site-element-image-help" className="mb-3 text-sm text-slate-500">Tamanho padrão: <strong>{config.width} × {config.height} px</strong>. PNG, JPG ou WebP, até 5 MB.</p>
          <input id="site-element-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
            aria-invalid={!!errors.file} aria-describedby={errors.file ? 'site-element-image-help site-element-file-error' : 'site-element-image-help'}
            className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-pink-50 file:px-4 file:py-2 file:font-semibold file:text-pink-700"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = '';
              if (!selected) return;
              const parsed = siteElementImageFileSchema.safeParse(selected);
              if (!parsed.success) {
                form.setValue('file', null);
                form.setValue('width', 0);
                form.setValue('height', 0);
                setPreview('');
                form.setError('file', { message: parsed.error.issues[0].message });
                return;
              }
              form.clearErrors('file');
              form.setValue('width', 0);
              form.setValue('height', 0);
              form.setValue('file', parsed.data, { shouldDirty: true });
            }} />
          <p className="mt-2 break-all text-xs text-slate-500">{file?.name || model?.file_name || 'Nenhuma imagem selecionada.'}{model && !file ? ' Selecione outro arquivo para substituir a imagem.' : ''}</p>
          {errors.file && <p id="site-element-file-error" role="alert" className="mt-2 text-sm text-red-600">{errors.file.message}</p>}
        </div>
        {preview && <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          <img src={preview} alt="Prévia da imagem do modelo" className="w-full object-contain" style={{ aspectRatio: `${config.width} / ${config.height}` }} />
        </div>}
        {errors.root && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{errors.root.message}</p>}
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-pink-600"><i className="bi bi-arrow-repeat animate-spin" />{reading ? 'Conferindo a imagem…' : 'Salvando modelo…'}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40 dark:border-slate-700">Cancelar</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50">Salvar modelo</button>
        </div>
      </form>
    </div>
  </div>;
}
