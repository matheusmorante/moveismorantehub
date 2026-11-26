import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { requestConfirmation } from '@/components/shared/confirmationService';
import {
  FORMAT_DIMENSIONS,
  imageTemplateFormSchema,
  templateAssetIds,
  type ImageFormat,
  type ImageTemplateDesign,
  type ImageTemplateFormValues,
  type TemplatePreviewProduct,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import { setTestArtifactMode } from '../../../../../../../shared-utils/testing/testArtifactContext';
import { findTemplateSelection } from '../../../../../../../shared-utils/catalogImageTemplateGroups';
import { TemplateArtboard } from '../TemplateArtboard';
import { TemplateLayerSettings } from '../TemplateLayerSettings';
import { TemplateLayersSidebar } from './TemplateLayersSidebar';
import { TemplateGroupSettings, TemplateMultiSelectionSettings } from '../TemplateGroupSettings';
import { TemplateCopyLayersDialog } from '../TemplateCopyLayersDialog';
import { TemplateProductPreview, useTemplateProductPreview } from '../TemplateProductPreview';
import { mapPreviewProduct } from '../productPreviewService';
import { createTemplatePictureLoader } from '../renderImageTemplate';
import { preloadTemplateProductImages } from '../services/preloadTemplateProductImages';
import { templateLayerPhotoUrls } from '../rendering/templateImageMask';
import { imageTemplateError, saveImageTemplate, type ImageTemplateSummary, type SavedImageTemplate, type TemplateAsset } from '../imageTemplateService';
import { useTemplateAssets } from '../useTemplateAssets';
import { imageTemplateTestContext } from '../imageTemplateTestContext';
import { FIRST_TEMPLATE_FORMAT, useImageTemplateHistory } from '../hooks/useImageTemplateHistory';
import { useImageTemplateLayerActions } from '../hooks/useImageTemplateLayerActions';
import { useImageTemplateFileLayers } from '../hooks/useImageTemplateFileLayers';
import { useImageTemplateExport } from '../hooks/useImageTemplateExport';

interface EditorProps {
  initial: ImageTemplateFormValues;
  original: SavedImageTemplate | null;
  userId: string;
  onBack: () => void;
  onSaved: (isNew: boolean) => void;
}

/**
 * Orchestrates the image template studio: design history, multi-format tabs, layer inspector,
 * live preview product binding, file drag-and-drop imports, autosave, and PNG export.
 */
export default function ImageTemplateEditor({ initial, original, userId, onBack, onSaved }: EditorProps) {
  const form = useForm<ImageTemplateFormValues>({ defaultValues: initial, resolver: zodResolver(imageTemplateFormSchema) });
  const { profile } = useAuth();
  const design = useWatch({ control: form.control, name: 'design' });
  const { isDirty, isSubmitting } = form.formState;

  const [record, setRecord] = useState<ImageTemplateSummary | null>(original);
  const [id] = useState(() => original?.id ?? crypto.randomUUID());
  const [format, setFormat] = useState<ImageFormat>(FIRST_TEMPLATE_FORMAT);
  const [activeId, setActiveId] = useState(initial.design.formats[FIRST_TEMPLATE_FORMAT].layers[0].id);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<Map<string, TemplateAsset>>(() => new Map());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busyRef = useRef(false);

  const artboardRef = useRef<HTMLDivElement>(null);
  const saveInFlight = useRef(false);
  const autoSaveRequested = useRef(false);
  const autoSaveTick = useRef<() => void>(() => {});
  const designMigrationPending = useRef(!!original?.needsDesignMigration && !original.test_artifact);
  const getPicture = useMemo(createTemplatePictureLoader, []);

  const currentFormat = design.formats[format] ? format : FIRST_TEMPLATE_FORMAT;
  const layout = design.formats[currentFormat]!;
  const productImageCount = Math.max(1, ...layout.layers.flatMap((layer) => (layer.type === 'product' ? [layer.imageIndex + 1] : [])));
  const preloadPreviewProductImages = useCallback((candidate: TemplatePreviewProduct) => {
    preloadTemplateProductImages(layout, candidate, getPicture);
  }, [getPicture, layout]);

  const preview = useTemplateProductPreview(userId, productImageCount, preloadPreviewProductImages);
  const product = preview.product;
  const active = findTemplateSelection(layout, activeId) ?? null;

  const getDesign = useCallback(() => form.getValues('design'), [form]);
  const setDesign = useCallback((next: ImageTemplateDesign) => {
    form.setValue('design', next, { shouldDirty: true });
  }, [form]);

  // Keeps circular dependencies between history, layer actions, assets, and export cleanly decoupled.
  const selectionSetterRef = useRef<Parameters<typeof useImageTemplateHistory>[0]['setSelectionMode']>(() => {});
  const history = useImageTemplateHistory({
    getDesign,
    setDesign,
    design,
    format,
    activeId,
    testArtifact: record?.test_artifact,
    setFormat,
    setActiveId,
    setSelectionMode: (next) => selectionSetterRef.current(next),
    clearFeedback: () => {
      setError('');
      setMessage('');
    },
  });

  const uploadErrorSetterRef = useRef<(msg: string) => void>(() => {});
  const isBusy = () => busyRef.current;

  const layerActions = useImageTemplateLayerActions({
    getDesign,
    currentFormat,
    layout,
    activeId,
    isBusy,
    setActiveId,
    setUploadError: (value) => uploadErrorSetterRef.current(typeof value === 'function' ? value('') : value),
    setError,
    setMessage,
    changeLayout: history.changeLayout,
    commit: history.commit,
  });
  selectionSetterRef.current = layerActions.setSelectionMode;

  const assets = useTemplateAssets(layout, product, pendingAssets);

  const fileLayers = useImageTemplateFileLayers({
    getDesign,
    setDesign,
    currentFormat,
    layout,
    active,
    isBusy,
    testArtifact: record?.test_artifact,
    assetSources: assets.sources,
    getPicture,
    past: history.past,
    future: history.future,
    setPendingAssets,
    replaceLayer: layerActions.replaceLayer,
    changeLayout: history.changeLayout,
    setActiveId,
    setError,
    setMessage,
  });
  uploadErrorSetterRef.current = fileLayers.setUploadError;

  const exporter = useImageTemplateExport({
    getFormValues: () => form.getValues(),
    currentFormat,
    productId: preview.productId,
    detailRefetch: preview.detail.refetch,
    resolveFresh: preview.resolveFresh,
    assetSources: assets.sources,
    getPicture,
    isBusy,
    setError,
    setMessage,
  });

  const busy = fileLayers.uploading || exporter.exporting || isSubmitting;
  busyRef.current = busy;

  const dimensions = FORMAT_DIMENSIONS[currentFormat];
  const testContext = imageTemplateTestContext();
  const canMarkTest = import.meta.env.DEV
    && testContext?.ownerId === userId
    && (profile?.role === 'administrator' || profile?.roles?.includes('administrator'));

  useEffect(() => {
    if (record && !isDirty && !isSubmitting) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [isDirty, isSubmitting, record]);

  const submitValid = form.handleSubmit(async (values) => {
    if (fileLayers.uploading || exporter.exporting) return;
    setError('');
    setMessage('');
    try {
      const pending = new Map([...pendingAssets].filter(([key]) => !fileLayers.confirmedAssets.current.has(key)));
      const saved = await saveImageTemplate(id, values, record, pending, (assetIds) => {
        assetIds.forEach((assetId) => fileLayers.confirmedAssets.current.add(assetId));
      });
      designMigrationPending.current = false;
      templateAssetIds(values.design).forEach((key) => fileLayers.confirmedAssets.current.add(key));
      setRecord(saved);
      form.reset(values);
      setMessage(autoSaveRequested.current ? 'Alterações salvas automaticamente.' : 'Modelo salvo.');
      onSaved(!record);
    } catch (cause) {
      setError(imageTemplateError(cause));
    }
  }, () => {
    autoSaveRequested.current = false;
    const result = imageTemplateFormSchema.safeParse(form.getValues());
    if (result.success) return;
    const first = result.error.issues[0];
    const affectedFormat = first.path[2] as ImageFormat;
    const layerIndex = first.path[4];
    const group = typeof layerIndex === 'number' && first.path[3] === 'groups'
      ? design.formats[affectedFormat]?.groups?.[layerIndex]
      : null;
    const layer = typeof layerIndex === 'number' && first.path[3] === 'layers'
      ? design.formats[affectedFormat]?.layers[layerIndex]
      : null;
    if (group) {
      setFormat(affectedFormat);
      setActiveId(group.id);
    }
    if (layer) {
      setFormat(affectedFormat);
      setActiveId(layer.id);
    }
    setError(group
      ? `Revise o agrupamento “${group.name || 'sem nome'}”. ${first.message}`
      : layer
        ? `Revise a camada “${layer.name || 'sem nome'}”. ${first.message}`
        : first.message);
  });

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    if (saveInFlight.current) {
      event?.preventDefault();
      return;
    }
    saveInFlight.current = true;
    autoSaveRequested.current ||= !event;
    void submitValid(event)
      .catch((cause) => setError(imageTemplateError(cause)))
      .finally(() => {
        saveInFlight.current = false;
        autoSaveRequested.current = false;
      });
  };

  autoSaveTick.current = () => {
    if ((!isDirty && !designMigrationPending.current) || busy || saveInFlight.current) return;
    autoSaveRequested.current = true;
    void submit();
  };

  useEffect(() => {
    if (designMigrationPending.current) autoSaveTick.current();
  }, [original?.id, original?.needsDesignMigration]);

  useEffect(() => {
    const timer = window.setInterval(() => autoSaveTick.current(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function leave() {
    if (busy) return;
    if (!record || isDirty) {
      const discard = await requestConfirmation({
        title: 'Sair do editor?',
        message: 'As alterações ainda sem salvar serão descartadas.',
        confirmLabel: 'Sair do editor',
        type: 'warning',
      });
      if (!discard) return;
    }
    onBack();
  }

  return (
    <form
      className="ct-editor ct-surface"
      data-file-drag-over={fileDragOver || undefined}
      noValidate
      onSubmit={submit}
      onDragEnter={(event) => {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        setFileDragOver(true);
      }}
      onDragOver={(event) => {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setFileDragOver(false);
      }}
      onDrop={(event) => {
        if (!Array.from(event.dataTransfer.types).includes('Files') && event.dataTransfer.files.length === 0) return;
        event.preventDefault();
        setFileDragOver(false);
        const file = event.dataTransfer.files[0];
        if (file) void fileLayers.addImageLayerFromFile(file);
      }}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (
          (event.ctrlKey || event.metaKey)
          && !event.altKey
          && !target.isContentEditable
          && !target.closest('input, textarea, select, [contenteditable], [role="textbox"]')
        ) {
          const key = event.key.toLowerCase();
          if (key === 'z' || key === 'y') {
            event.preventDefault();
            if (!busy) history.moveHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo');
            return;
          }
        }
        if (
          event.key !== 'Delete'
          || busy
          || layerActions.selectionMode
          || !active
          || (active.type !== 'group' && !layerActions.canRemove(active))
          || (!target.closest('.ct-artboard') && !target.closest('.ct-select-layer[aria-pressed="true"]'))
        ) {
          return;
        }
        event.preventDefault();
        if (active.type === 'group') layerActions.removeGrouping(active.id);
        else layerActions.removeLayer(active);
      }}
    >
      <header className="ct-header">
        <nav aria-label="Localização">
          <button type="button" className="ct-link" disabled={busy} onClick={() => void leave()}>
            Modelos de imagem
          </button>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <h1>{initial.name}</h1>
        </nav>
        <p>Crie e edite modelos de imagem para os produtos do ERP.</p>
        {canMarkTest && (
          <label className="ct-checkbox">
            <input
              type="checkbox"
              checked={!!design.testArtifact}
              disabled={busy || !!record}
              onChange={(event) => history.commit(setTestArtifactMode({ design }, 'design', event.target.checked, testContext).design)}
            />
            Modelo de teste desta execução
          </label>
        )}
        {design.testArtifact && (
          <small className="ct-muted">Modelo identificado como teste e vinculado ao operador desta execução.</small>
        )}
      </header>

      <div className="ct-workspace">
        <TemplateLayersSidebar
          design={design}
          currentFormat={currentFormat}
          layout={layout}
          activeId={activeId}
          busy={busy}
          sources={assets.sources}
          selectionMode={layerActions.selectionMode}
          artboardRef={artboardRef}
          setActiveId={setActiveId}
          setUploadError={fileLayers.setUploadError}
          chooseFormat={history.chooseFormat}
          removeCurrentFormat={history.removeCurrentFormat}
          changeLayout={history.changeLayout}
          setSelectionMode={layerActions.setSelectionMode}
          toggleLayerSelection={layerActions.toggleLayerSelection}
          removeGrouping={layerActions.removeGrouping}
          duplicateGrouping={layerActions.duplicateGrouping}
          renameLayer={layerActions.renameLayer}
          removeLayer={layerActions.removeLayer}
          duplicateLayer={layerActions.duplicateLayer}
          openCopyLayersDialog={layerActions.openCopyLayersDialog}
          canRemove={layerActions.canRemove}
          reorder={layerActions.reorder}
          addLayer={layerActions.addLayer}
        />

        {layerActions.selectionMode ? (
          <TemplateMultiSelectionSettings
            mode={layerActions.selectionMode}
            disabled={busy}
            groupName={layout.groups?.find((group) => group.id === layerActions.selectionMode?.groupId)?.name}
            onConfirm={layerActions.confirmSelection}
            onCancel={() => layerActions.setSelectionMode(null)}
            onCopyToFormat={() => layerActions.openCopyLayersDialog(layerActions.selectionMode!.layerIds)}
          />
        ) : active?.type === 'group' ? (
          <TemplateGroupSettings group={active} layout={layout} product={product} disabled={busy} onChange={layerActions.replaceLayer} />
        ) : active ? (
          <TemplateLayerSettings
            key={active.id}
            layer={active}
            product={product}
            assetPreview={active.type === 'image' && active.assetId ? assets.sources.get(active.assetId) : undefined}
            maskPhotos={templateLayerPhotoUrls(active, product, assets.sources) ?? undefined}
            getPicture={getPicture}
            palette={layout.layers.flatMap((entry) =>
              entry.type === 'background'
                ? [entry.color]
                : entry.type === 'sticker'
                  ? [entry.fill, entry.color]
                  : 'color' in entry
                    ? [entry.color]
                    : [],
            )}
            onChange={layerActions.replaceLayer}
            onFile={fileLayers.attachFile}
            uploading={fileLayers.uploading}
            disabled={busy}
            uploadError={fileLayers.uploadError}
          />
        ) : (
          <section className="ct-layer-settings" aria-label="Camada selecionada">
            <p className="ct-muted">Clique em uma camada para editar suas propriedades.</p>
          </section>
        )}

        <section className="ct-preview-area" aria-label="Modelo">
          <div className="ct-preview-title">
            <div>
              <h2>Modelo</h2>
              <small>{currentFormat} · {dimensions.width} × {dimensions.height} px</small>
            </div>
            <div className="ct-arrows">
              <button
                type="button"
                className="ct-button ct-icon-button"
                aria-label="Desfazer"
                title="Desfazer"
                disabled={busy || !history.past.current.length}
                onClick={() => history.moveHistory('undo')}
              >
                <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ct-button ct-icon-button"
                aria-label="Refazer"
                title="Refazer"
                disabled={busy || !history.future.current.length}
                onClick={() => history.moveHistory('redo')}
              >
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />
              </button>
            </div>
          </div>
          <TemplateArtboard
            format={currentFormat}
            layout={layout}
            product={product}
            assets={assets}
            productLoading={!product && (preview.initialProducts?.isFetching || preview.detail?.isFetching)}
            artboardRef={artboardRef}
            activeId={layerActions.selectionMode ? '' : active?.id ?? ''}
            selectedIds={layerActions.selectionMode?.layerIds}
            onSelect={setActiveId}
            onChange={layerActions.replaceLayer}
            disabled={busy || !!layerActions.selectionMode}
            getPicture={getPicture}
          />
          <TemplateProductPreview
            preview={preview}
            disabled={busy}
            onProductIntent={(selectedId) => {
              const source = preview.rows.find((row) => row.id === selectedId)?.previewSource;
              if (source) preloadPreviewProductImages(mapPreviewProduct(source));
            }}
          />
        </section>
      </div>

      <footer className="ct-editor-footer">
        <div className="ct-editor-feedback">
          {error ? <span role="alert" className="ct-error">{error}</span> : message && <span role="status">{message}</span>}
        </div>
        <button className="ct-button" type="button" disabled={busy} onClick={() => void leave()}>
          Voltar
        </button>
        <button
          className="ct-button"
          type="button"
          disabled={busy || !product || preview.detail?.isError || assets.loading}
          onClick={() => void exporter.download()}
        >
          <i className="bi bi-download" aria-hidden="true" />
          {exporter.exporting ? 'Gerando PNG…' : 'Baixar PNG'}
        </button>
        <button className="ct-button ct-primary" type="submit" disabled={busy}>
          {isSubmitting ? 'Salvando…' : 'Salvar'}
        </button>
      </footer>

      {layerActions.copyLayersRequest && (
        <TemplateCopyLayersDialog
          sourceFormat={layerActions.copyLayersRequest.sourceFormat}
          disabled={busy}
          onClose={() => layerActions.setCopyLayersRequest(null)}
          onConfirm={layerActions.copySelectedLayersToFormats}
        />
      )}
    </form>
  );
}
