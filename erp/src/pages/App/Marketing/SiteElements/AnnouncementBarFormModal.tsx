import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  SITE_ANNOUNCEMENT_FONT_SIZES,
  SITE_ANNOUNCEMENT_FONT_WEIGHTS,
  SITE_ANNOUNCEMENT_MAX_LENGTH,
  siteElementAnnouncementFormSchema,
  type SiteElementAnnouncementFormValues,
} from '../../../../../../shared-utils/siteElementSchemas';
import { saveSiteElementModel, siteElementErrorMessage, type AnnouncementBarModel } from './siteElementService';

interface Props {
  model?: AnnouncementBarModel;
  onClose: () => void;
  onSaved: (cleanupFailed: boolean) => void;
}

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AnnouncementBarFormModal({ model, onClose, onSaved }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const submitLock = useRef(false);
  const form = useForm<SiteElementAnnouncementFormValues>({
    resolver: zodResolver(siteElementAnnouncementFormSchema),
    defaultValues: {
      kind: 'top_bar',
      message: model?.message ?? '',
      backgroundColor: model?.background_color ?? '#173D30',
      textColor: model?.text_color ?? '#FFFFFF',
      fontWeight: String(model?.font_weight ?? 400) as SiteElementAnnouncementFormValues['fontWeight'],
      fontSizePx: String(model?.font_size_px ?? 14) as SiteElementAnnouncementFormValues['fontSizePx'],
      startsAt: toLocalDateTimeInput(model?.starts_at),
      endsAt: toLocalDateTimeInput(model?.ends_at),
    },
  });
  const { isSubmitting, errors } = form.formState;
  const message = form.watch('message');
  const backgroundColor = form.watch('backgroundColor');
  const textColor = form.watch('textColor');
  const fontWeight = form.watch('fontWeight');
  const fontSizePx = form.watch('fontSizePx');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus();
  }, []);

  const save = form.handleSubmit(async (values) => {
    if (submitLock.current) return;
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

  const updateColor = (field: 'backgroundColor' | 'textColor', value: string) => {
    form.setValue(field, value.toUpperCase(), { shouldDirty: true, shouldValidate: true });
  };

  return createPortal(<div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <div ref={dialog} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="announcement-dialog-title"
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !isSubmitting) onClose();
        if (event.key !== 'Tab') return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
        if (!controls?.length) { event.preventDefault(); dialog.current?.focus(); return; }
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="announcement-dialog-title" className="text-xl font-bold text-slate-900 dark:text-white">{model ? 'Editar aviso' : 'Novo aviso'}</h2>
          <p className="mt-1 text-sm text-slate-500">Barra de avisos</p>
        </div>
        <button ref={closeButton} type="button" aria-label="Fechar formulário" disabled={isSubmitting} onClick={onClose}
          className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><i className="bi bi-x-lg" /></button>
      </div>
      <form noValidate onSubmit={save} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="announcement-message" className="block text-sm font-semibold">Texto do aviso <span className="text-red-500">*</span></label>
          <textarea id="announcement-message" {...form.register('message')} maxLength={SITE_ANNOUNCEMENT_MAX_LENGTH} rows={2} disabled={isSubmitting}
            aria-invalid={!!errors.message} aria-describedby={errors.message ? 'announcement-message-error announcement-message-count' : 'announcement-message-count'}
            placeholder="Ex.: Compre em até 10x sem juros!"
            className="w-full resize-y rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-pink-500 dark:border-slate-700" />
          <div className="flex items-start justify-between gap-3 text-xs text-slate-500">
            <span id="announcement-message-count">{message.length}/{SITE_ANNOUNCEMENT_MAX_LENGTH} caracteres</span>
            <span>Fonte herdada da tipografia do site.</span>
          </div>
          {errors.message && <p id="announcement-message-error" role="alert" className="text-sm text-red-600">{errors.message.message}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <p className="mb-2 text-xs font-semibold text-slate-500">Pré-visualização</p>
          <div className="flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-center leading-snug break-words"
            style={{ backgroundColor, color: textColor, fontWeight: Number(fontWeight), fontSize: `${fontSizePx}px` }}>
            {message || 'Seu aviso aparecerá aqui'}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField id="announcement-background" label="Cor de fundo" value={backgroundColor} error={errors.backgroundColor?.message}
            disabled={isSubmitting} onChange={(value) => updateColor('backgroundColor', value)} />
          <ColorField id="announcement-text-color" label="Cor do texto" value={textColor} error={errors.textColor?.message}
            disabled={isSubmitting} onChange={(value) => updateColor('textColor', value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="announcement-font-weight" className="block text-sm font-semibold">Peso da fonte</label>
            <select id="announcement-font-weight" {...form.register('fontWeight')} disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-pink-500 dark:border-slate-700 dark:bg-slate-900">
              {SITE_ANNOUNCEMENT_FONT_WEIGHTS.map((weight) => <option key={weight} value={weight}>{weight === '400' ? 'Normal' : weight === '500' ? 'Médio' : weight === '600' ? 'Semibold' : 'Negrito'}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="announcement-font-size" className="block text-sm font-semibold">Tamanho da fonte</label>
            <select id="announcement-font-size" {...form.register('fontSizePx')} disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-pink-500 dark:border-slate-700 dark:bg-slate-900">
              {SITE_ANNOUNCEMENT_FONT_SIZES.map((size) => <option key={size} value={size}>{size} px</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Período de exibição</h3>
          <p className="text-xs text-slate-500">Sem datas, o aviso aparece no catálogo assim que for ativado.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="announcement-starts-at" className="block text-sm">Início da exibição</label>
              <input id="announcement-starts-at" type="datetime-local" {...form.register('startsAt')} disabled={isSubmitting}
                aria-invalid={!!errors.startsAt} className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-pink-500 dark:border-slate-700" />
              {errors.startsAt && <p role="alert" className="text-sm text-red-600">{errors.startsAt.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="announcement-ends-at" className="block text-sm">Fim da exibição</label>
              <input id="announcement-ends-at" type="datetime-local" {...form.register('endsAt')} disabled={isSubmitting}
                aria-invalid={!!errors.endsAt} className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-pink-500 dark:border-slate-700" />
              {errors.endsAt && <p role="alert" className="text-sm text-red-600">{errors.endsAt.message}</p>}
            </div>
          </div>
        </div>

        {errors.root && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{errors.root.message}</p>}
        {isSubmitting && <p role="status" className="flex items-center gap-2 text-sm text-pink-600"><i className="bi bi-arrow-repeat animate-spin" />Salvando aviso…</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" disabled={isSubmitting} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40 dark:border-slate-700">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50">Salvar aviso</button>
        </div>
      </form>
    </div>
  </div>, document.body);
}

function ColorField({ id, label, value, error, disabled, onChange }: {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const validColor = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#173D30';
  return <div className="space-y-1">
    <label htmlFor={`${id}-value`} className="block text-sm font-semibold">{label}</label>
    <div className="flex items-center gap-2 rounded-xl border border-slate-300 p-1.5 dark:border-slate-700">
      <input type="color" id={id} value={validColor} disabled={disabled} aria-label={`${label}: escolher cor`}
        onChange={(event) => onChange(event.currentTarget.value)} className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
      <input id={`${id}-value`} type="text" value={value} maxLength={7} disabled={disabled}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.currentTarget.value.toUpperCase())}
        className="min-w-0 flex-1 bg-transparent px-2 py-1 outline-none" />
    </div>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
