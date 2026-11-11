import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { requestConfirmation } from '@/components/shared/confirmationService';
import {
  copyImageLayerToFormat, copyImageLayout, createImageLayer, FORMAT_DIMENSIONS, IMAGE_FORMATS, imageTemplateFormSchema, isTemplateLayerVisible,
  LAYER_TYPES, MAX_IMAGE_LAYERS, templateAssetIds, type ImageFormat, type ImageLayer, type ImageLayerType, type ImageLayout,
  type ImageTemplateDesign, type ImageTemplateFormValues, type TemplatePreviewProduct,
} from '../../../../../../shared-utils/catalogImageTemplate';
import { setTestArtifactMode } from '../../../../../../shared-utils/testArtifactContext';
import { TemplateArtboard } from './TemplateArtboard';
import { TemplateLayerSettings } from './TemplateLayerSettings';
import { TemplateLayersList } from './TemplateLayersList';
import { TemplateGroupSettings, TemplateMultiSelectionSettings, type LayerSelectionMode } from './TemplateGroupSettings';
import { TemplateCopyLayersDialog } from './TemplateCopyLayersDialog';
import { addTemplateGroupLayers, applyTemplateSelection, createTemplateGroup, deleteTemplateLayer,
  duplicateTemplateGroup, findTemplateSelection, releaseTemplateLayer, removeTemplateGroup, reorderTemplateItem,
  type TemplateSelection } from '../../../../../../shared-utils/catalogImageTemplateGroups';
import { TemplateProductPreview, useTemplateProductPreview } from './TemplateProductPreview';
import { createTemplatePictureLoader, renderImageTemplate } from './renderImageTemplate';
import { getDerivedImageUrl } from '@/utils/imageUrlUtils';
import { imageFileDimensions, imageLayerBoundsAfterCrop, imageLayerBoundsForSourceSize, type TemplateImageCrop } from './templateImageCrop';
import { assetSource, imageTemplateError, prepareTemplateAsset, readTemplateAssets, saveImageTemplate,
  type ImageTemplateSummary, type SavedImageTemplate, type TemplateAsset } from './imageTemplateService';
import { useTemplateAssets } from './useTemplateAssets';
import { imageTemplateTestContext } from './imageTemplateTestContext';

interface EditorProps {
  initial: ImageTemplateFormValues;
  original: SavedImageTemplate | null;
  userId: string;
  onBack: () => void;
  onSaved: (isNew: boolean) => void;
}

const FIRST_FORMAT = '1:1' as const;
const formatLabels: Record<ImageFormat, string> = { '1:1': 'Quadrado', '4:5': 'Feed', '9:16': 'Stories e Reels' };
type CopyLayersRequest = { sourceFormat: ImageFormat; layerIds: string[] };

export default function ImageTemplateEditor({ initial, original, userId, onBack, onSaved }: EditorProps) {
  const form = useForm<ImageTemplateFormValues>({ defaultValues: initial, resolver: zodResolver(imageTemplateFormSchema) });
  const { profile } = useAuth();
  const design = useWatch({ control: form.control, name: 'design' });
  const { isDirty, isSubmitting } = form.formState;
  const [record, setRecord] = useState<ImageTemplateSummary | null>(original);
  const [id] = useState(() => original?.id ?? crypto.randomUUID());
  const [format, setFormat] = useState<ImageFormat>(FIRST_FORMAT);
  const [activeId, setActiveId] = useState(initial.design.formats[FIRST_FORMAT].layers[0].id);
  const artboardRef = useRef<HTMLDivElement>(null);
  const past = useRef<ImageTemplateDesign[]>([]);
  const future = useRef<ImageTemplateDesign[]>([]);
  const [pendingAssets, setPendingAssets] = useState<Map<string, TemplateAsset>>(() => new Map());
  const confirmedAssets = useRef(new Set<string>());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileDragOver, setFileDragOver] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectionMode, setSelectionMode] = useState<LayerSelectionMode | null>(null);
  const [copyLayersRequest, setCopyLayersRequest] = useState<CopyLayersRequest | null>(null);
  const exportRequest = useRef<AbortController | null>(null);
  const saveInFlight = useRef(false);
  const autoSaveRequested = useRef(false);
  const autoSaveTick = useRef<() => void>(() => {});
  const designMigrationPending = useRef(!!original?.needsDesignMigration && !original.test_artifact);
  const getPicture = useMemo(createTemplatePictureLoader, []);
  const currentFormat = design.formats[format] ? format : FIRST_FORMAT;
  const layout = design.formats[currentFormat]!;
  const productImageCount = Math.max(1, ...layout.layers.flatMap((layer) => layer.type === 'product' ? [layer.imageIndex + 1] : []));
  const preloadPreviewProductImages = useCallback((candidate: TemplatePreviewProduct) => {
    for (const image of candidate.images) {
      void getPicture(getDerivedImageUrl(image, 'medium'), false).catch(() => {});
    }
  }, [getPicture]);
  const preview = useTemplateProductPreview(userId, productImageCount, preloadPreviewProductImages);
  const product = preview.product;
  const active = findTemplateSelection(layout, activeId) ?? null;
  const assets = useTemplateAssets(layout, product, pendingAssets);
  const busy = uploading || exporting || isSubmitting;
  const dimensions = FORMAT_DIMENSIONS[currentFormat];
  const testContext = imageTemplateTestContext();
  const canMarkTest = import.meta.env.DEV && testContext?.ownerId === userId
    && (profile?.role === 'administrator' || profile?.roles?.includes('administrator'));

  useEffect(() => {
    let cancelled = false;
    const imageSources = layout.layers.flatMap((layer) => {
      if (layer.type !== 'image' || !layer.assetId) return [];
      const source = assets.sources.get(layer.assetId);
      return source ? [{ id: layer.id, assetId: layer.assetId, source }] : [];
    });
    if (!imageSources.length) return;
    void Promise.all(imageSources.map(async ({ id, assetId, source }) => {
      try {
        const picture = await getPicture(source, false);
        return { id, assetId, width: picture.width, height: picture.height };
      } catch { return null; }
    })).then((loaded) => {
      if (cancelled) return;
      const sizes = new Map<string, NonNullable<(typeof loaded)[number]>>();
      loaded.forEach((entry) => { if (entry) sizes.set(entry.id, entry); });
      const latest = form.getValues('design');
      const currentLayout = latest.formats[currentFormat];
      if (!currentLayout) return;
      let changed = false;
      const layers = currentLayout.layers.map((layer) => {
        const size = layer.type === 'image' ? sizes.get(layer.id) : undefined;
        if (!size || layer.type !== 'image' || layer.assetId !== size.assetId) return layer;
        const bounds = imageLayerBoundsForSourceSize(layer, size.width, size.height);
        if (bounds.width === layer.width && bounds.height === layer.height) return layer;
        changed = true;
        return { ...layer, ...bounds };
      });
      if (!changed) return;
      const next = { ...latest, formats: { ...latest.formats, [currentFormat]: { ...currentLayout, layers } } };
      past.current = [...past.current.slice(-49), latest];
      future.current = [];
      form.setValue('design', record?.test_artifact ? { ...next, testArtifact: record.test_artifact } : next, { shouldDirty: true });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [assets.sources, currentFormat, form, getPicture, layout.layers, record?.test_artifact]);

  useEffect(() => () => exportRequest.current?.abort(), []);
  useEffect(() => {
    if (record && !isDirty && !isSubmitting) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [isDirty, isSubmitting, record]);

  function applyDesign(next: ImageTemplateDesign) {
    form.setValue('design', record?.test_artifact ? { ...next, testArtifact: record.test_artifact } : next, { shouldDirty: true });
    setError('');
    setMessage('');
  }

  function commit(next: ImageTemplateDesign) {
    past.current = [...past.current.slice(-49), form.getValues('design')];
    future.current = [];
    applyDesign(next);
  }

  function changeLayout(next: ImageLayout, amendHistory = false) {
    const latest = form.getValues('design');
    const updated = { ...latest, formats: { ...latest.formats, [currentFormat]: next } };
    if (amendHistory) applyDesign(updated);
    else commit(updated);
  }

  function chooseFormat(next: ImageFormat) {
    const nextLayout = design.formats[next] ?? copyImageLayout(layout, currentFormat, next);
    if (!design.formats[next]) changeFormatLayout(next, nextLayout);
    setFormat(next);
    setSelectionMode(null);
    if (activeId && !findTemplateSelection(nextLayout, activeId)) setActiveId(nextLayout.layers[0]?.id ?? '');
  }

  function selectLayer(id: string) {
    setActiveId(id);
    artboardRef.current?.focus({ preventScroll: true });
  }

  function changeFormatLayout(target: ImageFormat, value: ImageLayout | undefined) {
    const latest = form.getValues('design');
    commit({ ...latest, formats: { ...latest.formats, [target]: value } });
  }

  function moveHistory(direction: 'undo' | 'redo') {
    const [from, to] = direction === 'undo' ? [past, future] : [future, past];
    const next = from.current.pop();
    if (!next) return;
    to.current.push(form.getValues('design'));
    applyDesign(next);
    setSelectionMode(null);
    const nextFormat = next.formats[format] ? format : FIRST_FORMAT;
    if (nextFormat !== format) setFormat(nextFormat);
    const nextLayout = next.formats[nextFormat]!;
    if (activeId && !findTemplateSelection(nextLayout, activeId)) setActiveId(nextLayout.layers[0]?.id ?? '');
  }

  function replaceLayer(layer: TemplateSelection, amendHistory = false) {
    const latest = form.getValues('design').formats[currentFormat]!;
    const current = findTemplateSelection(latest, layer.id);
    if (current && JSON.stringify(current) !== JSON.stringify(layer)) {
      try { changeLayout(applyTemplateSelection(latest, layer), amendHistory); }
      catch (cause) { setError(imageTemplateError(cause)); return false; }
    }
    return !!current;
  }

  function addLayer(type: ImageLayerType) {
    if (type === 'background' || layout.layers.length >= MAX_IMAGE_LAYERS) return;
    const layer = createImageLayer(type, currentFormat);
    changeLayout({ ...layout, layers: [layer, ...layout.layers] });
    setActiveId(layer.id);
  }

  function duplicateLayer(layer: ImageLayer) {
    if (layer.type === 'background' || layout.layers.length >= MAX_IMAGE_LAYERS) return;
    const copy = { ...layer, id: crypto.randomUUID(), name: `${layer.name.slice(0, 72)} (cópia)` };
    const layers = [...layout.layers];
    layers.splice(layout.layers.findIndex((entry) => entry.id === layer.id), 0, copy);
    const groups = layout.groups?.map((group) => group.layerIds.includes(layer.id)
      ? { ...group, layerIds: [...group.layerIds, copy.id] } : group);
    changeLayout({ ...layout, layers, ...(groups ? { groups } : {}) });
    setActiveId(copy.id);
  }

  function reorder(layerId: string, targetId: string) {
    const next = reorderTemplateItem(layout, layerId, targetId);
    if (next !== layout) changeLayout(next);
  }

  function canRemove(layer: ImageLayer) {
    return layer.type !== 'background' && (layer.type !== 'product'
      || layout.layers.filter((entry) => entry.type === 'product').length > 1);
  }

  function removeLayer(layer: ImageLayer) {
    if (busy || !canRemove(layer)) return;
    const nextLayer = layout.layers.find((entry) => entry.id !== layer.id);
    changeLayout(deleteTemplateLayer(layout, layer.id));
    setActiveId(nextLayer?.id ?? '');
    if (nextLayer) window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('.ct-select-layer[aria-pressed="true"]')?.focus();
    });
  }

  function removeGrouping(groupId: string) {
    const group = layout.groups?.find((entry) => entry.id === groupId);
    changeLayout(removeTemplateGroup(layout, groupId));
    if (activeId === groupId) setActiveId(group?.layerIds[0] ?? '');
  }

  function duplicateGrouping(groupId: string) {
    const group = layout.groups?.find((entry) => entry.id === groupId);
    if (!group || layout.layers.length + group.layerIds.length > MAX_IMAGE_LAYERS) return;
    try {
      const duplicated = duplicateTemplateGroup(layout, groupId);
      changeLayout(duplicated.layout);
      setActiveId(duplicated.group.id);
    } catch (cause) { setError(imageTemplateError(cause)); }
  }

  function confirmSelection() {
    if (!selectionMode) return;
    try {
      if (selectionMode.groupId) {
        changeLayout(addTemplateGroupLayers(layout, selectionMode.groupId, selectionMode.layerIds));
        setActiveId(selectionMode.groupId);
      } else {
        const created = createTemplateGroup(layout, selectionMode.layerIds);
        changeLayout(created.layout);
        setActiveId(created.group.id);
      }
      setSelectionMode(null);
    } catch (cause) { setError(imageTemplateError(cause)); }
  }

  function openCopyLayersDialog(layerIds: string[]) {
    const selectedIds = [...new Set(layerIds)].filter((id) => layout.layers.some((layer) => layer.id === id && layer.type !== 'background'));
    if (!selectedIds.length) return;
    setError('');
    setCopyLayersRequest({ sourceFormat: currentFormat, layerIds: selectedIds });
  }

  function copySelectedLayersToFormats(targetFormats: ImageFormat[]) {
    if (!copyLayersRequest) return;
    const latest = form.getValues('design');
    const sourceFormat = copyLayersRequest.sourceFormat;
    const sourceLayout = latest.formats[sourceFormat];
    if (!sourceLayout) throw new Error('A proporção de origem não está mais disponível.');
    const sourceIds = new Set(copyLayersRequest.layerIds);
    const selectedLayers = sourceLayout.layers.filter((layer): layer is Exclude<ImageLayer, { type: 'background' }> =>
      layer.type !== 'background' && sourceIds.has(layer.id));
    if (!selectedLayers.length || selectedLayers.length !== sourceIds.size) {
      throw new Error('Uma ou mais camadas selecionadas não estão mais disponíveis.');
    }

    const nextFormats = { ...latest.formats };
    const suffix = ' (cópia)';
    for (const targetFormat of targetFormats) {
      if (targetFormat === sourceFormat) continue;
      let targetLayout = nextFormats[targetFormat];
      if (!targetLayout) {
        const sourceBackground = [...sourceLayout.layers].reverse().find((layer): layer is Extract<ImageLayer, { type: 'background' }> =>
          layer.type === 'background');
        const background = sourceBackground
          ? { ...sourceBackground, id: crypto.randomUUID() }
          : createImageLayer('background', targetFormat);
        const layers: ImageLayer[] = selectedLayers.some((layer) => layer.type === 'product')
          ? [background]
          : [createImageLayer('product', targetFormat), background];
        targetLayout = { layers };
      }

      const copies = selectedLayers.map((layer) => {
        const adapted = copyImageLayerToFormat(layer, sourceFormat, targetFormat);
        return { ...adapted, id: crypto.randomUUID(), name: `${layer.name.slice(0, 80 - suffix.length)}${suffix}` };
      });
      if (targetLayout.layers.length + copies.length > MAX_IMAGE_LAYERS) {
        throw new Error(`A proporção ${targetFormat} não tem espaço para todas as camadas copiadas.`);
      }
      nextFormats[targetFormat] = { ...targetLayout, layers: [...copies, ...targetLayout.layers] };
    }

    commit({ ...latest, formats: nextFormats });
    setSelectionMode(null);
    setActiveId(copyLayersRequest.layerIds[0]);
    setMessage(`Camadas copiadas para ${targetFormats.map((ratio) => formatLabels[ratio]).join(' e ')}.`);
    setCopyLayersRequest(null);
  }

  function toggleLayerSelection(layerId: string) {
    setSelectionMode((current) => current ? { ...current, layerIds: current.layerIds.includes(layerId)
      ? current.layerIds.filter((id) => id !== layerId) : [...current.layerIds, layerId] } : null);
  }

  function renameLayer(layerId: string) {
    setActiveId(layerId);
    setUploadError('');
    window.requestAnimationFrame(() => {
      const input = document.getElementById('ct-layer-name') as HTMLInputElement | null;
      input?.focus(); input?.select();
    });
  }

  async function attachFile(file: File, options?: { fit?: 'contain' | 'cover'; crop?: TemplateImageCrop }): Promise<boolean> {
    if (busy || active?.type !== 'image') return false;
    const layerId = active.id;
    setUploading(true);
    setUploadError('');
    try {
      const asset = await prepareTemplateAsset(file);
      const layer = form.getValues('design').formats[currentFormat]?.layers.find((entry) => entry.id === layerId);
      if (layer?.type !== 'image') return false;
      const assetName = file.name.split(/[\\/]/).pop()?.replace(/\p{Cc}/gu, ' ').trim().slice(0, 120) || 'Imagem carregada';
      let cropBounds: ReturnType<typeof imageLayerBoundsForSourceSize>;
      if (options?.crop) cropBounds = imageLayerBoundsAfterCrop(layer, options.crop);
      else {
        const sourceSize = await imageFileDimensions(file);
        cropBounds = imageLayerBoundsForSourceSize(layer, sourceSize.width, sourceSize.height);
      }
      if (!replaceLayer({ ...layer, ...cropBounds, assetId: asset.id, assetName, fit: options?.fit ?? layer.fit })) return false;
      setPendingAssets((current) => new Map(current).set(asset.id, asset));
      return true;
    } catch (cause) {
      setUploadError(imageTemplateError(cause));
      return false;
    } finally { setUploading(false); }
  }

  async function addImageLayerFromFile(file: File) {
    if (busy) return;
    setUploadError('');
    if (layout.layers.length >= MAX_IMAGE_LAYERS) {
      setError(`O modelo já atingiu o limite de ${MAX_IMAGE_LAYERS} camadas.`);
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const asset = await prepareTemplateAsset(file);
      const sourceSize = await imageFileDimensions(file);
      const latestDesign = form.getValues('design');
      const latestLayout = latestDesign.formats[currentFormat];
      if (!latestLayout) throw new Error('O formato atual do modelo não está disponível.');
      if (latestLayout.layers.length >= MAX_IMAGE_LAYERS) {
        throw new Error(`O modelo já atingiu o limite de ${MAX_IMAGE_LAYERS} camadas.`);
      }
      const assetIds = templateAssetIds(latestDesign);
      if (!assetIds.includes(asset.id) && assetIds.length >= 12) {
        throw new Error('O modelo já usa o limite de 12 imagens diferentes.');
      }
      const highestImageNumber = latestLayout.layers.reduce((highest, layer) => {
        if (layer.type !== 'image') return highest;
        const match = /^Imagem(?:\s+personalizada)?\s+(\d+)$/i.exec(layer.name.trim());
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0);
      const baseLayer = {
        ...createImageLayer('image', currentFormat) as Extract<ImageLayer, { type: 'image' }>,
        name: `Imagem personalizada ${highestImageNumber + 1}`,
        assetId: asset.id,
        assetName: file.name.split(/[\\/]/).pop()?.replace(/\p{Cc}/gu, ' ').trim().slice(0, 120) || 'Imagem carregada',
      };
      const layer = { ...baseLayer, ...imageLayerBoundsForSourceSize(baseLayer, sourceSize.width, sourceSize.height) };
      setPendingAssets((current) => new Map(current).set(asset.id, asset));
      changeLayout({ ...latestLayout, layers: [layer, ...latestLayout.layers] });
      setActiveId(layer.id);
      setMessage(`Camada “${layer.name}” adicionada. Salvamento automático em até 1 minuto.`);
    } catch (cause) {
      setError(imageTemplateError(cause));
    } finally { setUploading(false); }
  }

  const submitValid = form.handleSubmit(async (values) => {
    if (uploading || exporting) return;
    setError('');
    setMessage('');
    try {
      const pending = new Map([...pendingAssets].filter(([key]) => !confirmedAssets.current.has(key)));
      const saved = await saveImageTemplate(id, values, record, pending);
      designMigrationPending.current = false;
      templateAssetIds(values.design).forEach((key) => confirmedAssets.current.add(key));
      setRecord(saved);
      form.reset(values);
      setMessage(autoSaveRequested.current ? 'Alterações salvas automaticamente.' : 'Modelo salvo.');
      onSaved(!record);
    } catch (cause) { setError(imageTemplateError(cause)); }
  }, () => {
    autoSaveRequested.current = false;
    const result = imageTemplateFormSchema.safeParse(form.getValues());
    if (result.success) return;
    const first = result.error.issues[0];
    const affectedFormat = first.path[2] as ImageFormat;
    const layerIndex = first.path[4];
    const group = typeof layerIndex === 'number' && first.path[3] === 'groups' ? design.formats[affectedFormat]?.groups?.[layerIndex] : null;
    const layer = typeof layerIndex === 'number' && first.path[3] === 'layers' ? design.formats[affectedFormat]?.layers[layerIndex] : null;
    if (group) { setFormat(affectedFormat); setActiveId(group.id); }
    if (layer) { setFormat(affectedFormat); setActiveId(layer.id); }
    setError(group ? `Revise o agrupamento “${group.name || 'sem nome'}”. ${first.message}`
      : layer ? `Revise a camada “${layer.name || 'sem nome'}”. ${first.message}` : first.message);
  });
  const submit = (event?: FormEvent<HTMLFormElement>) => {
    if (saveInFlight.current) { event?.preventDefault(); return; }
    saveInFlight.current = true;
    autoSaveRequested.current ||= !event;
    void submitValid(event)
      .catch((cause) => setError(imageTemplateError(cause)))
      .finally(() => { saveInFlight.current = false; autoSaveRequested.current = false; });
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

  async function download() {
    if (!preview.productId || busy) return;
    const controller = new AbortController();
    exportRequest.current = controller;
    setExporting(true);
    setError('');
    setMessage('');
    try {
      const result = imageTemplateFormSchema.safeParse(form.getValues());
      if (!result.success) throw new Error(result.error.issues[0].message);
      const parsed = result.data;
      const currentLayout = parsed.design.formats[currentFormat]!;
      const { data: freshSource } = await preview.detail.refetch({ cancelRefetch: false, throwOnError: true });
      if (controller.signal.aborted) return;
      if (!freshSource) throw new Error('Não foi possível atualizar o produto para gerar o PNG.');
      const fresh = preview.resolveFresh(freshSource);
      const sources = new Map(assets.sources);
      const missing = [...new Set(currentLayout.layers.flatMap((layer) => layer.type === 'image' && layer.assetId
        && isTemplateLayerVisible(currentLayout, layer, fresh) && !sources.has(layer.assetId) ? [layer.assetId] : []))];
      const extra = await readTemplateAssets(missing, controller.signal);
      extra.forEach((asset) => sources.set(asset.id, assetSource(asset)));
      const canvas = document.createElement('canvas');
      const rendered = await renderImageTemplate({ canvas, format: currentFormat, layout: currentLayout, product: fresh,
        assets: sources, getPicture, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (rendered.errors.length) throw new Error(rendered.errors.join(' '));
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('O navegador não conseguiu gerar o PNG.');
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const label = `${parsed.name}-${fresh.fields.retailerId || fresh.id}-${currentFormat}`.replace(/[^\p{L}\p{N}]+/gu, '-');
      link.href = url;
      link.download = `${label}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Imagem gerada com os dados atuais do produto.');
    } catch (cause) { if (!controller.signal.aborted) setError(imageTemplateError(cause)); }
    finally { if (!controller.signal.aborted) setExporting(false); }
  }

  async function leave() {
    if (busy) return;
    if (!record || isDirty) {
      const discard = await requestConfirmation({ title: 'Sair do editor?', message: 'As alterações ainda sem salvar serão descartadas.',
        confirmLabel: 'Sair do editor', type: 'warning' });
      if (!discard) return;
    }
    onBack();
  }

  return <form className="ct-editor ct-surface" data-file-drag-over={fileDragOver || undefined} noValidate onSubmit={submit}
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
      if (file) void addImageLayerFromFile(file);
    }}
    onKeyDown={(event) => {
    const target = event.target as HTMLElement;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !target.isContentEditable
      && !target.closest('input, textarea, select, [contenteditable], [role="textbox"]')) {
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        if (!busy) moveHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo');
        return;
      }
    }
    if (event.key !== 'Delete' || busy || selectionMode || !active || active.type !== 'group' && !canRemove(active)
      || (!target.closest('.ct-artboard') && !target.closest('.ct-select-layer[aria-pressed="true"]'))) return;
    event.preventDefault();
    if (active.type === 'group') removeGrouping(active.id);
    else removeLayer(active);
  }}>
    <header className="ct-header">
      <nav aria-label="Localização"><button type="button" className="ct-link" disabled={busy} onClick={() => void leave()}>Modelos de imagem</button><i className="bi bi-chevron-right" aria-hidden="true" /><h1>{initial.name}</h1></nav>
      <p>Crie e edite modelos de imagem para os produtos do ERP.</p>
      {canMarkTest && <label className="ct-checkbox">
        <input type="checkbox" checked={!!design.testArtifact} disabled={busy || !!record}
          onChange={(event) => commit(setTestArtifactMode({ design }, 'design', event.target.checked, testContext).design)} />
        Modelo de teste desta execução
      </label>}
      {design.testArtifact && <small className="ct-muted">Modelo identificado como teste e vinculado ao operador desta execução.</small>}
    </header>
    <div className="ct-workspace">
      <aside className="ct-layers" aria-label="Camadas">
        <h2>Camadas</h2><p className="ct-muted">Adicione e personalize as camadas.</p>
        <strong className="ct-format-label">Proporção do modelo</strong>
        <div className="ct-format-tabs" role="tablist" aria-label="Proporção do modelo">
          {IMAGE_FORMATS.map((ratio, index) => <button type="button" role="tab" key={ratio} data-ratio={ratio}
            id={`ct-format-${ratio.replace(':', '-')}`} aria-controls="ct-format-layers" aria-selected={currentFormat === ratio}
            tabIndex={currentFormat === ratio ? 0 : -1} disabled={busy}
            title={`${formatLabels[ratio]}${design.formats[ratio] ? '' : ' · criar a partir do formato atual'}`}
            onClick={() => chooseFormat(ratio)} onKeyDown={(event) => {
              const next = event.key === 'ArrowRight' ? (index + 1) % IMAGE_FORMATS.length
                : event.key === 'ArrowLeft' ? (index + IMAGE_FORMATS.length - 1) % IMAGE_FORMATS.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? IMAGE_FORMATS.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault();
              chooseFormat(IMAGE_FORMATS[next]);
              event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-ratio="${IMAGE_FORMATS[next]}"]`)?.focus();
            }}>{ratio}</button>)}
        </div>
        {currentFormat !== FIRST_FORMAT && <div className="ct-format-heading">
          <button type="button" className="ct-link" disabled={busy} onClick={() => {
            changeFormatLayout(currentFormat, undefined); setFormat(FIRST_FORMAT);
            setSelectionMode(null);
            if (activeId && !findTemplateSelection(design.formats[FIRST_FORMAT], activeId)) {
              setActiveId(design.formats[FIRST_FORMAT].layers[0]?.id ?? '');
            }
          }}>Remover formato</button>
        </div>}
        <div id="ct-format-layers" role="tabpanel" aria-labelledby={`ct-format-${currentFormat.replace(':', '-')}`} className="ct-layer-panel">
        <TemplateLayersList key={currentFormat} layout={layout} activeId={activeId} sources={assets.sources} disabled={busy}
          selection={selectionMode} onSelect={(id) => { selectLayer(id); setUploadError(''); }}
          onToggleSelection={toggleLayerSelection} onBeginSelection={(id) => setSelectionMode({ layerIds: [id] })}
          onAddToGroup={(groupId) => { setActiveId(groupId); setSelectionMode({ groupId, layerIds: [] }); }}
          onRemoveGroup={removeGrouping} onDuplicateGroup={duplicateGrouping}
          onUngroup={(id) => { changeLayout(releaseTemplateLayer(layout, id)); setActiveId(id); }}
          onRename={renameLayer} onRemove={removeLayer} onDuplicate={duplicateLayer} onCopyToFormat={openCopyLayersDialog}
          canRemove={canRemove} onReorder={reorder} />
        </div>
        <label className="ct-field"><span className="sr-only">Adicionar camada</span><select value="" disabled={busy || !!selectionMode || layout.layers.length >= MAX_IMAGE_LAYERS}
          onChange={(event) => addLayer(event.target.value as ImageLayerType)}>
          <option value="" disabled>＋ Adicionar camada</option>
          {Object.entries(LAYER_TYPES).filter(([type]) => type !== 'background').map(([type, info]) =>
            <option key={type} value={type}>{info.label}</option>)}
        </select></label>
      </aside>
      {selectionMode ? <TemplateMultiSelectionSettings mode={selectionMode} disabled={busy}
          groupName={layout.groups?.find((group) => group.id === selectionMode.groupId)?.name}
          onConfirm={confirmSelection} onCancel={() => setSelectionMode(null)}
          onCopyToFormat={() => openCopyLayersDialog(selectionMode.layerIds)} />
        : active?.type === 'group' ? <TemplateGroupSettings group={active} layout={layout} product={product} disabled={busy} onChange={replaceLayer} />
        : active ? <TemplateLayerSettings key={active.id} layer={active} product={product}
          assetPreview={active.type === 'image' && active.assetId ? assets.sources.get(active.assetId) : undefined}
          palette={layout.layers.flatMap((entry) => entry.type === 'background' ? [entry.color]
            : entry.type === 'sticker' ? [entry.fill, entry.color] : 'color' in entry ? [entry.color] : [])}
          onChange={replaceLayer} onFile={attachFile}
          uploading={uploading} disabled={busy} uploadError={uploadError} />
        : <section className="ct-layer-settings" aria-label="Camada selecionada"><p className="ct-muted">Clique em uma camada para editar suas propriedades.</p></section>}
      <section className="ct-preview-area" aria-label="Modelo">
        <div className="ct-preview-title"><div><h2>Modelo</h2><small>{currentFormat} · {dimensions.width} × {dimensions.height} px</small></div>
          <div className="ct-arrows">
            <button type="button" className="ct-button ct-icon-button" aria-label="Desfazer" title="Desfazer" disabled={busy || !past.current.length} onClick={() => moveHistory('undo')}><i className="bi bi-arrow-counterclockwise" aria-hidden="true" /></button>
            <button type="button" className="ct-button ct-icon-button" aria-label="Refazer" title="Refazer" disabled={busy || !future.current.length} onClick={() => moveHistory('redo')}><i className="bi bi-arrow-clockwise" aria-hidden="true" /></button>
          </div>
        </div>
        <TemplateArtboard format={currentFormat} layout={layout} product={product} assets={assets}
          productLoading={preview.detail.isFetching} getPicture={getPicture}
          artboardRef={artboardRef} activeId={selectionMode ? '' : active?.id ?? ''} selectedIds={selectionMode?.layerIds}
          onSelect={setActiveId} onChange={replaceLayer} disabled={busy || !!selectionMode} />
        <TemplateProductPreview preview={preview} disabled={busy} onProductIntent={(id) => {
          const source = preview.rows.find((row) => row.id === id)?.previewSource;
          const image = source?.images[0];
          if (image) void getPicture(getDerivedImageUrl(image, 'medium'), false).catch(() => {});
        }} />
      </section>
    </div>
    <footer className="ct-editor-footer">
      <div className="ct-editor-feedback">{error ? <span role="alert" className="ct-error">{error}</span> : message && <span role="status">{message}</span>}</div>
      <button className="ct-button" type="button" disabled={busy} onClick={() => void leave()}>Voltar</button>
      <button className="ct-button" type="button" disabled={busy || !product || preview.detail.isError || assets.loading}
        onClick={() => void download()}><i className="bi bi-download" aria-hidden="true" />{exporting ? 'Gerando PNG…' : 'Baixar PNG'}</button>
      <button className="ct-button ct-primary" type="submit" disabled={busy}>{isSubmitting ? 'Salvando…' : 'Salvar'}</button>
    </footer>
    {copyLayersRequest && <TemplateCopyLayersDialog sourceFormat={copyLayersRequest.sourceFormat} disabled={busy}
      onClose={() => setCopyLayersRequest(null)} onConfirm={copySelectedLayersToFormats} />}
  </form>;
}
