import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestConfirmation } from '@/components/shared/confirmationService';
import {
  copyImageLayout, createImageLayer, FORMAT_DIMENSIONS, IMAGE_FORMATS, imageTemplateFormSchema, isLayerVisible,
  LAYER_TYPES, MAX_IMAGE_LAYERS, templateAssetIds, type ImageFormat, type ImageLayer, type ImageLayerType, type ImageLayout,
  type ImageTemplateDesign, type ImageTemplateFormValues,
} from '../../../../../../shared-utils/catalogImageTemplate';
import { TemplateArtboard } from './TemplateArtboard';
import { TemplateLayerSettings } from './TemplateLayerSettings';
import { TemplateProductPreview, useTemplateProductPreview } from './TemplateProductPreview';
import { createTemplatePictureLoader, renderImageTemplate } from './renderImageTemplate';
import { assetSource, imageTemplateError, prepareTemplateAsset, readTemplateAssets, saveImageTemplate,
  type ImageTemplateSummary, type TemplateAsset } from './imageTemplateService';
import { useTemplateAssets } from './useTemplateAssets';

interface EditorProps {
  initial: ImageTemplateFormValues;
  original: ImageTemplateSummary | null;
  userId: string;
  onBack: () => void;
  onSaved: (isNew: boolean) => void;
}

const FIRST_FORMAT = '1:1' as const;
const formatLabels: Record<ImageFormat, string> = { '1:1': 'Quadrado', '4:5': 'Feed', '9:16': 'Stories e Reels' };

export default function ImageTemplateEditor({ initial, original, userId, onBack, onSaved }: EditorProps) {
  const form = useForm<ImageTemplateFormValues>({ defaultValues: initial, resolver: zodResolver(imageTemplateFormSchema) });
  const design = useWatch({ control: form.control, name: 'design' });
  const { isDirty, isSubmitting } = form.formState;
  const [record, setRecord] = useState(original);
  const [id] = useState(() => original?.id ?? crypto.randomUUID());
  const [format, setFormat] = useState<ImageFormat>(FIRST_FORMAT);
  const [activeId, setActiveId] = useState(initial.design.formats[FIRST_FORMAT].layers[0].id);
  const past = useRef<ImageTemplateDesign[]>([]);
  const future = useRef<ImageTemplateDesign[]>([]);
  const [pendingAssets, setPendingAssets] = useState<Map<string, TemplateAsset>>(() => new Map());
  const confirmedAssets = useRef(new Set<string>());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [layerMenuId, setLayerMenuId] = useState<string | null>(null);
  const exportRequest = useRef<AbortController | null>(null);
  const dragId = useRef('');
  const getPicture = useMemo(createTemplatePictureLoader, []);
  const preview = useTemplateProductPreview(userId);
  const product = preview.product;
  const currentFormat = design.formats[format] ? format : FIRST_FORMAT;
  const layout = design.formats[currentFormat]!;
  const active = layout.layers.find((layer) => layer.id === activeId) ?? layout.layers[0];
  const assets = useTemplateAssets(layout, product, pendingAssets);
  const busy = uploading || exporting || isSubmitting;
  const dimensions = FORMAT_DIMENSIONS[currentFormat];

  useEffect(() => () => exportRequest.current?.abort(), []);
  useEffect(() => {
    if (record && !isDirty && !isSubmitting) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [isDirty, isSubmitting, record]);

  function applyDesign(next: ImageTemplateDesign) {
    form.setValue('design', next, { shouldDirty: true });
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
    if (!design.formats[next]) changeFormatLayout(next, copyImageLayout(layout, currentFormat, next));
    setFormat(next);
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
    if (!next.formats[format]) setFormat(FIRST_FORMAT);
  }

  function replaceLayer(layer: ImageLayer, amendHistory = false) {
    const latest = form.getValues('design').formats[currentFormat]!;
    const current = latest.layers.find(({ id: layerId }) => layerId === layer.id);
    if (current && JSON.stringify(current) !== JSON.stringify(layer)) {
      changeLayout({ layers: latest.layers.map((entry) => entry.id === layer.id ? layer : entry) }, amendHistory);
    }
  }

  function addLayer(type: ImageLayerType) {
    if (layout.layers.length >= MAX_IMAGE_LAYERS) return;
    const layer = createImageLayer(type, currentFormat);
    changeLayout({ layers: type === 'background' ? [...layout.layers, layer] : [layer, ...layout.layers] });
    setActiveId(layer.id);
  }

  function duplicateLayer(layer: ImageLayer, index: number) {
    if (layer.type === 'background' || layout.layers.length >= MAX_IMAGE_LAYERS) return;
    const copy = { ...layer, id: crypto.randomUUID(), name: `${layer.name.slice(0, 72)} (cópia)` };
    const layers = [...layout.layers];
    layers.splice(index, 0, copy);
    changeLayout({ layers });
    setActiveId(copy.id);
  }

  function reorder(layerId: string, index: number) {
    const from = layout.layers.findIndex((layer) => layer.id === layerId);
    if (from < 0 || index === from || index < 0 || index >= layout.layers.length
      || layout.layers[from].type === 'background' || layout.layers[index].type === 'background') return;
    const layers = [...layout.layers];
    const [moving] = layers.splice(from, 1);
    layers.splice(index, 0, moving);
    changeLayout({ layers });
  }

  function canRemove(layer: ImageLayer) {
    return layer.type !== 'product' || layout.layers.filter((entry) => entry.type === 'product').length > 1;
  }

  async function attachFile(file: File) {
    if (busy || active.type !== 'image') return;
    const layerId = active.id;
    setUploading(true);
    setUploadError('');
    try {
      const asset = await prepareTemplateAsset(file);
      const layer = form.getValues('design').formats[currentFormat]?.layers.find((entry) => entry.id === layerId);
      if (layer?.type !== 'image') return;
      setPendingAssets((current) => new Map(current).set(asset.id, asset));
      const assetName = file.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) || 'Imagem carregada';
      replaceLayer({ ...layer, assetId: asset.id, assetName });
    } catch (cause) {
      setUploadError(imageTemplateError(cause));
    } finally { setUploading(false); }
  }

  const submit = form.handleSubmit(async (values) => {
    if (uploading || exporting) return;
    setError('');
    setMessage('');
    try {
      const pending = new Map([...pendingAssets].filter(([key]) => !confirmedAssets.current.has(key)));
      const saved = await saveImageTemplate(id, values, record, pending);
      templateAssetIds(values.design).forEach((key) => confirmedAssets.current.add(key));
      setRecord(saved);
      form.reset(values);
      setMessage('Modelo salvo.');
      onSaved(!record);
    } catch (cause) { setError(imageTemplateError(cause)); }
  }, () => {
    const result = imageTemplateFormSchema.safeParse(form.getValues());
    if (result.success) return;
    const first = result.error.issues[0];
    const affectedFormat = first.path[2] as ImageFormat;
    const layerIndex = first.path[4];
    const layer = typeof layerIndex === 'number' ? design.formats[affectedFormat]?.layers[layerIndex] : null;
    if (layer) { setFormat(affectedFormat); setActiveId(layer.id); }
    setError(layer ? `Revise a camada “${layer.name || 'sem nome'}”. ${first.message}` : first.message);
  });

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
        && isLayerVisible(layer, fresh) && !sources.has(layer.assetId) ? [layer.assetId] : []))];
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

  return <form className="ct-editor ct-surface" noValidate onSubmit={submit}>
    <header className="ct-header">
      <nav aria-label="Localização"><button type="button" className="ct-link" disabled={busy} onClick={() => void leave()}>Modelos de imagem</button><i className="bi bi-chevron-right" aria-hidden="true" /><h1>{initial.name}</h1></nav>
      <p>Crie e edite modelos de imagem para os produtos do ERP.</p>
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
          }}>Remover formato</button>
        </div>}
        <div id="ct-format-layers" role="tabpanel" aria-labelledby={`ct-format-${currentFormat.replace(':', '-')}`} className="ct-layer-panel">
        <ol className="ct-layer-list">
          {layout.layers.map((layer, index) => <li key={layer.id} className="ct-layer-row" data-active={layer.id === active.id}
            draggable={!busy && layer.type !== 'background'} onDragStart={(event) => {
              dragId.current = layer.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', layer.id);
            }} onDragEnd={() => { dragId.current = ''; }} onDragOver={(event) => { if (dragId.current && layer.type !== 'background') event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); if (dragId.current) reorder(dragId.current, index); dragId.current = ''; }}>
            <button type="button" className="ct-select-layer" aria-pressed={layer.id === active.id} disabled={busy}
              onClick={() => { setActiveId(layer.id); setLayerMenuId(null); setUploadError(''); }}>
              <i className={`bi ${layer.type === 'background' ? 'bi-lock' : 'bi-grip-vertical'}`} aria-hidden="true" />
              <i className={`bi ${LAYER_TYPES[layer.type].icon}`} aria-hidden="true" />
              <span><strong>{layer.name || 'Camada sem nome'}</strong><small>{LAYER_TYPES[layer.type].label}</small></span>
            </button>
            <button type="button" className="ct-layer-menu-toggle" aria-label={`Ações da camada ${layer.name}`}
              aria-expanded={layerMenuId === layer.id} aria-controls={layerMenuId === layer.id ? `ct-layer-menu-${layer.id}` : undefined} disabled={busy}
              onClick={() => setLayerMenuId(layerMenuId === layer.id ? null : layer.id)}>
              <i className="bi bi-three-dots" aria-hidden="true" />
            </button>
            {layerMenuId === layer.id && <div id={`ct-layer-menu-${layer.id}`} className="ct-layer-menu">
              <button type="button" disabled={busy} onClick={() => {
                setLayerMenuId(null);
                setActiveId(layer.id);
                setUploadError('');
                window.requestAnimationFrame(() => {
                  const input = document.getElementById('ct-layer-name') as HTMLInputElement | null;
                  input?.focus();
                  input?.select();
                });
              }}>Alterar nome</button>
              <button type="button" disabled={busy || !canRemove(layer)} onClick={() => {
                changeLayout({ layers: layout.layers.filter((entry) => entry.id !== layer.id) }); setLayerMenuId(null);
              }}>Excluir</button>
              <button type="button" disabled={busy || layer.type === 'background' || layout.layers.length >= MAX_IMAGE_LAYERS} onClick={() => {
                duplicateLayer(layer, index); setLayerMenuId(null);
              }}>Duplicar</button>
            </div>}
          </li>)}
        </ol>
        </div>
        <label className="ct-field"><span className="sr-only">Adicionar camada</span><select value="" disabled={busy || layout.layers.length >= MAX_IMAGE_LAYERS}
          onChange={(event) => addLayer(event.target.value as ImageLayerType)}>
          <option value="" disabled>＋ Adicionar camada</option>
          {Object.entries(LAYER_TYPES).map(([type, info]) => <option key={type} value={type}
            disabled={type === 'background' && layout.layers.some((layer) => layer.type === 'background')}>{info.label}</option>)}
        </select></label>
      </aside>
      <TemplateLayerSettings key={active.id} layer={active} product={product}
        assetPreview={active.type === 'image' && active.assetId ? assets.sources.get(active.assetId) : undefined}
        onChange={replaceLayer} onFile={(file) => void attachFile(file)}
        uploading={uploading} disabled={busy} uploadError={uploadError} />
      <section className="ct-preview-area" aria-label="Modelo">
        <div className="ct-preview-title"><div><h2>Modelo</h2><small>{currentFormat} · {dimensions.width} × {dimensions.height} px</small></div>
          <div className="ct-arrows">
            <button type="button" className="ct-button ct-icon-button" aria-label="Desfazer" title="Desfazer" disabled={busy || !past.current.length} onClick={() => moveHistory('undo')}><i className="bi bi-arrow-counterclockwise" aria-hidden="true" /></button>
            <button type="button" className="ct-button ct-icon-button" aria-label="Refazer" title="Refazer" disabled={busy || !future.current.length} onClick={() => moveHistory('redo')}><i className="bi bi-arrow-clockwise" aria-hidden="true" /></button>
          </div>
        </div>
        <TemplateArtboard key={currentFormat} format={currentFormat} layout={layout} product={product} assets={assets} getPicture={getPicture}
          activeId={active.id} onSelect={setActiveId} onChange={replaceLayer} disabled={busy} />
        <TemplateProductPreview preview={preview} disabled={busy} />
      </section>
    </div>
    <footer className="ct-editor-footer">
      <div className="ct-editor-feedback">{error ? <span role="alert" className="ct-error">{error}</span> : message && <span role="status">{message}</span>}</div>
      <button className="ct-button" type="button" disabled={busy} onClick={() => void leave()}>Voltar</button>
      <button className="ct-button" type="button" disabled={busy || !product || preview.detail.isError || assets.loading}
        onClick={() => void download()}><i className="bi bi-download" aria-hidden="true" />{exporting ? 'Gerando PNG…' : 'Baixar PNG'}</button>
      <button className="ct-button ct-primary" type="submit" disabled={busy}>{isSubmitting ? 'Salvando…' : 'Salvar'}</button>
    </footer>
  </form>;
}
