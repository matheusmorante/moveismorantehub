import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FixedAspectImageCropper from '../Posts/FixedAspectImageCropper';
import AnnouncementBarFormModal from './AnnouncementBarFormModal';
import {
  SITE_ELEMENT_CONFIG,
  SITE_ELEMENT_LINK_MAX_LENGTH,
  siteElementImageFileSchema,
  siteElementCarouselFormSchema,
  type SiteElementKind,
} from '../../../../../../shared-utils/siteElementSchemas';
import {
  CAROUSEL_BANNER_IMAGES,
  CAROUSEL_BANNER_VARIANTS,
  LEGACY_CAROUSEL_IMAGE,
  type CarouselBannerVariant,
} from '../../../../../../shared-utils/siteElementDimensions';
import { saveSiteElementModel, siteElementErrorMessage, siteElementImageUrl, type CarouselSiteElementModel, type SiteElementModel } from './siteElementService';

interface Props {
  kind: SiteElementKind;
  model?: SiteElementModel;
  onClose: () => void;
  onSaved: (cleanupFailed: boolean) => void;
}

function storedVariant(variant: 'mobile' | 'tablet', model?: CarouselSiteElementModel) {
  const existingImagePath = model?.[`${variant}_image_path`] ?? null;
  const dimensions = existingImagePath ? CAROUSEL_BANNER_IMAGES[variant] : undefined;
  return {
    file: null,
    existingImagePath,
    width: model?.[`${variant}_width`] ?? dimensions?.width ?? 0,
    height: model?.[`${variant}_height`] ?? dimensions?.height ?? 0,
  };
}

export default function SiteElementFormModal(props: Props) {
  if (props.kind === 'top_bar') {
    return <AnnouncementBarFormModal model={props.model?.kind === 'top_bar' ? props.model : undefined}
      onClose={props.onClose} onSaved={props.onSaved} />;
  }
  return <CarouselSiteElementFormModal model={props.model?.kind === 'carousel' ? props.model : undefined}
    onClose={props.onClose} onSaved={props.onSaved} />;
}

function CarouselSiteElementFormModal({ model, onClose, onSaved }: Omit<Props, 'kind'> & { model?: CarouselSiteElementModel }) {
  const config = SITE_ELEMENT_CONFIG.carousel;
  const form = useForm({
    resolver: zodResolver(siteElementCarouselFormSchema),
    defaultValues: {
      name: model?.name || '', kind: 'carousel', file: null, existingImagePath: model?.image_path || null,
      linkUrl: model?.link_url ?? '',
      width: model?.width || 0, height: model?.height || 0,
      mobile: storedVariant('mobile', model),
      tablet: storedVariant('tablet', model),
    },
  });
  const desktop = { file: form.watch('file'), existingImagePath: form.watch('existingImagePath') };
  const tablet = form.watch('tablet');
  const mobile = form.watch('mobile');
  const [cropRequest, setCropRequest] = useState<{ file: File; variant: CarouselBannerVariant } | null>(null);
  const submitLock = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const { isSubmitting, errors } = form.formState;
  const busy = isSubmitting || !!cropRequest;
  const legacyCarousel = model?.height === LEGACY_CAROUSEL_IMAGE.height;
  const updatingLegacy = legacyCarousel && !!(desktop.file || tablet?.file || mobile?.file);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus();
  }, []);

  const selectFile = (variant: CarouselBannerVariant, selected: File) => {
    const field = variant === 'desktop' ? 'file' : `${variant}.file` as const;
    const parsed = siteElementImageFileSchema.safeParse(selected);
    if (!parsed.success) {
      if (variant === 'desktop') {
        form.setValue('file', null, { shouldDirty: true });
        form.setValue('width', model?.width ?? 0);
        form.setValue('height', model?.height ?? 0);
      } else {
        form.setValue(variant, storedVariant(variant, model), { shouldDirty: true });
      }
      form.setError(field, { message: parsed.error.issues[0].message });
      return;
    }
    form.clearErrors(field);
    setCropRequest({ file: parsed.data, variant });
  };

  const confirmCrop = (croppedFile: File) => {
    if (!cropRequest) return;
    const { variant } = cropRequest;
    const dimensions = CAROUSEL_BANNER_IMAGES[variant];
    if (variant === 'desktop') {
      form.setValue('file', croppedFile, { shouldDirty: true });
      form.setValue('width', dimensions.width);
      form.setValue('height', dimensions.height);
      form.clearErrors('file');
    } else {
      form.setValue(`${variant}.file`, croppedFile, { shouldDirty: true });
      form.setValue(`${variant}.width`, dimensions.width);
      form.setValue(`${variant}.height`, dimensions.height);
      form.clearErrors(`${variant}.file`);
    }
    setCropRequest(null);
  };

  const save = form.handleSubmit(async (values) => {
    if (submitLock.current || cropRequest) return;
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

  const cropVariant = cropRequest?.variant ?? 'desktop';
  const cropTarget = CAROUSEL_BANNER_IMAGES[cropVariant];

  return createPortal(<div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <div ref={dialog} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="site-element-dialog-title"
      className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
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
          <label htmlFor="site-element-link" className="mb-1 block text-sm font-semibold">Link de destino</label>
          <input id="site-element-link" {...form.register('linkUrl')} type="text" inputMode="url"
            autoComplete="url" maxLength={SITE_ELEMENT_LINK_MAX_LENGTH} disabled={busy}
            aria-invalid={!!errors.linkUrl} aria-describedby={errors.linkUrl ? 'site-element-link-help site-element-link-error' : 'site-element-link-help'}
            placeholder="/pagina ou https://exemplo.com"
            className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-pink-500 dark:border-slate-700" />
          <p id="site-element-link-help" className="mt-1 text-xs text-slate-500">Endereço que abre ao clicar na imagem do catálogo. Campo opcional.</p>
          {errors.linkUrl && <p id="site-element-link-error" role="alert" className="mt-1 text-sm text-red-600">{errors.linkUrl.message}</p>}
        </div>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Selecione as três versões do banner. PNG, JPG ou WebP, até 5 MB por arquivo.</p>
          {legacyCarousel && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            Este modelo tem uma imagem de 1920 × 620 px. Para atualizar o banner, selecione e recorte as três versões.
          </p>}
          <div className="grid gap-3 sm:grid-cols-3">
            {CAROUSEL_BANNER_VARIANTS.map((variant) => {
              const asset = { desktop, tablet, mobile }[variant];
              const dimensions = CAROUSEL_BANNER_IMAGES[variant];
              const error = variant === 'desktop' ? errors.file : errors[variant]?.file;
              const existingFileName = variant === 'desktop' ? model?.file_name : model?.[`${variant}_file_name`] ?? undefined;
              return <SiteElementAssetField key={variant} id={`site-element-${variant}`} label={dimensions.label} dimensions={dimensions}
                file={asset?.file} existingImagePath={asset?.existingImagePath} existingFileName={existingFileName}
                error={error?.message} disabled={isSubmitting} required={!legacyCarousel || updatingLegacy}
                onSelect={(file) => selectFile(variant, file)} />;
            })}
          </div>
        </div>
        {errors.root && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{errors.root.message}</p>}
        {isSubmitting && <p role="status" className="flex items-center gap-2 text-sm text-pink-600"><i className="bi bi-arrow-repeat animate-spin" />Salvando modelo…</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40 dark:border-slate-700">Cancelar</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50">Salvar modelo</button>
        </div>
      </form>
    </div>
    {cropRequest && <FixedAspectImageCropper file={cropRequest.file} kind="carousel"
      label={`imagem para ${CAROUSEL_BANNER_IMAGES[cropVariant].label.toLowerCase()}`} targetSize={cropTarget}
      preferredMaxBytes={CAROUSEL_BANNER_IMAGES[cropVariant].preferredMaxBytes}
      confirmLabel="Concluir"
      onCancel={() => setCropRequest(null)} onConfirm={confirmCrop} />}
  </div>, document.body);
}

function SiteElementAssetField({
  id, label, dimensions, file, existingImagePath, existingFileName, error, disabled, required = false,
  onSelect,
}: {
  id: string;
  label: string;
  dimensions: { width: number; height: number };
  file: File | null | undefined;
  existingImagePath: string | null | undefined;
  existingFileName?: string;
  error?: string;
  disabled: boolean;
  required?: boolean;
  onSelect: (file: File) => void;
}) {
  const [filePreview, setFilePreview] = useState('');
  useEffect(() => {
    if (!file) { setFilePreview(''); return; }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = filePreview || (existingImagePath ? siteElementImageUrl(existingImagePath) : '');
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return <div className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
    <label htmlFor={id} className="block text-sm font-semibold">{label} {required && <span className="text-red-500">*</span>}</label>
    <p id={helpId} className="text-xs text-slate-500">{dimensions.width} × {dimensions.height} px</p>
    <input id={id} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled}
      aria-invalid={!!error} aria-describedby={error ? `${helpId} ${errorId}` : helpId}
      className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-pink-50 file:px-3 file:py-2 file:font-semibold file:text-pink-700"
      onChange={(event) => {
        const selected = event.target.files?.[0];
        event.target.value = '';
        if (selected) onSelect(selected);
      }} />
    <p className="break-all text-xs text-slate-500">{file?.name || existingFileName || 'Nenhuma imagem selecionada.'}</p>
    {preview && <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
      <img src={preview} alt={`Prévia de ${label.toLowerCase()}`} loading="lazy" decoding="async"
        className="w-full object-contain" style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }} />
    </div>}
    {error && <p id={errorId} role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
