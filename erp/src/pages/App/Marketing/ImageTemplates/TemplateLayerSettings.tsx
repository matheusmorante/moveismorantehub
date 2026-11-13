import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  LAYER_TYPES, isLayerVisible, templateFieldLabel, type ImageLayer, type TemplateField, type TemplatePreviewProduct,
} from '../../../../../../shared-utils/catalogImageTemplate';
import { MAX_PARENT_PRODUCT_IMAGES } from '../../../../../../shared-utils/productImageLimits';
import { warmBackgroundRemoval } from '@/pages/utils/images/backgroundRemoval';
import { TemplateImageCropDialog } from './TemplateImageCropDialog';
import type { TemplateImageCrop } from './templateImageCrop';
import { NumberField } from './TemplateNumberField';
import { interpolateTemplateFields, measureTextLayerSafetyBounds } from './renderImageTemplate';
import { ColorField, DEFAULT_COLOR_SWATCHES } from './layerSettings/TemplateColorField';
import { LayerRule } from './layerSettings/TemplateLayerRule';
import { LayerSwitch } from './layerSettings/TemplateLayerSwitch';
import { TemplateTypographySection } from './layerSettings/TemplateTypographySection';
import {
  createMessageToken,
  messageAttributeSignature,
  messageEditorRange,
  optionsFor,
  renderMessageEditor,
  serializeMessageEditor,
  setMessageEditorCaret,
} from './layerSettings/templateMessageTokens';

export { LayerRule };

type EditableTextLayer = Extract<ImageLayer, { type: 'text' }>;

function scaledDimensions(width: number, height: number, dimension: 'width' | 'height', value: number) {
  const minimumScale = Math.max(16 / width, 16 / height);
  const maximumScale = Math.min(3840 / width, 3840 / height);
  const requestedScale = value / (dimension === 'width' ? width : height);
  const scale = Math.max(minimumScale, Math.min(maximumScale, requestedScale));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function resizeTextSelection(layer: EditableTextLayer, width: number, height: number): EditableTextLayer {
  const horizontalAnchor = layer.align === 'center' ? .5 : layer.align === 'right' ? 1 : 0;
  const verticalAlign = layer.verticalAlign ?? 'middle';
  const verticalAnchor = verticalAlign === 'middle' ? .5 : verticalAlign === 'bottom' ? 1 : 0;
  return {
    ...layer,
    x: Math.max(-3840, Math.min(3840, Math.round(layer.x - (width - layer.width) * horizontalAnchor))),
    y: Math.max(-3840, Math.min(3840, Math.round(layer.y - (height - layer.height) * verticalAnchor))),
    width,
    height,
  };
}

export function TemplateLayerSettings({ layer, product, assetPreview, palette, onChange, onFile, uploading, disabled, uploadError }: {
  layer: ImageLayer; product: TemplatePreviewProduct | null; assetPreview?: string; palette?: readonly string[];
  onChange: (layer: ImageLayer, amendHistory?: boolean) => boolean | void;
  onFile: (file: File, options?: { fit?: 'contain' | 'cover'; crop?: TemplateImageCrop }) => Promise<boolean | void> | boolean | void;
  uploading: boolean; disabled: boolean; uploadError: string;
}) {
  const angleDragChanged = useRef<boolean | null>(null);
  const textInput = useRef<HTMLDivElement>(null);
  const [textError, setTextError] = useState('');
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const fittedTextSelection = useRef<{ layerId: string; signature: string } | null>(null);
  const swatches = palette?.length ? [...new Set([...DEFAULT_COLOR_SWATCHES, ...palette])] : DEFAULT_COLOR_SWATCHES;
  const messageLabels = messageAttributeSignature(product?.attributes);
  const layerText = 'text' in layer ? layer.text : '';

  useLayoutEffect(() => {
    const editor = textInput.current;
    if (!editor || !('text' in layer)) return;
    if (editor.dataset.messageValue === layer.text && editor.dataset.attributeLabels === messageLabels) return;
    renderMessageEditor(editor, layer.text, product, messageLabels);
  }, [layer, layerText, messageLabels, product]);

  useEffect(() => {
    if (!fieldMenuOpen) return;
    const closeMenu = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === 'Escape') setFieldMenuOpen(false); return; }
      if (!(event.target as Element | null)?.closest('.ct-message-entry')) setFieldMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => { document.removeEventListener('mousedown', closeMenu); document.removeEventListener('keydown', closeMenu); };
  }, [fieldMenuOpen]);

  useEffect(() => {
    if (layer.type !== 'text') return;
    const signature = JSON.stringify([layer.id, interpolateTemplateFields(layer.text, product, !product), layer.font, layer.fontSize,
      layer.bold, layer.italic, layer.letterSpacing, layer.lineSpacing, layer.underline, layer.strike]);
    if (fittedTextSelection.current?.layerId !== layer.id) {
      fittedTextSelection.current = { layerId: layer.id, signature };
    } else {
      if (fittedTextSelection.current.signature === signature) return;
      fittedTextSelection.current = { layerId: layer.id, signature };
    }
    const safe = measureTextLayerSafetyBounds(layer, product);
    // The measured size is a minimum: keep extra room so vertical alignment can position the text.
    const width = Math.max(layer.width, safe.minimumWidth);
    const height = Math.max(layer.height, safe.minimumHeight);
    if (width === layer.width && height === layer.height) return;
    onChange(resizeTextSelection(layer, width, height));
  }, [layer, onChange, product]);

  const textSafetyBounds = layer.type === 'text' ? measureTextLayerSafetyBounds(layer, product) : null;
  const endAngleDrag = () => { angleDragChanged.current = null; };

  const update = (patch: Partial<ImageLayer>, amendHistory = false) => {
    let next = { ...layer, ...patch } as ImageLayer;
    const effectUpdated = ['textEffect', 'textEffectSize', 'textShadowColor', 'textShadowOpacity', 'textOutlineColor', 'text3dColor', 'text3dDirection', 'text3dAngle', 'textNeonColor']
      .some((key) => Object.prototype.hasOwnProperty.call(patch, key));
    if ('font' in next && effectUpdated) {
      next.textEffect ??= next.textShadow ? 'shadow' : 'none';
      next.textShadow = false;
    }
    const textGeometryChanged = ['text', 'font', 'fontSize', 'bold', 'italic', 'letterSpacing', 'lineSpacing', 'underline', 'strike', 'width', 'height']
      .some((key) => Object.prototype.hasOwnProperty.call(patch, key));
    if (next.type === 'text' && textGeometryChanged) {
      if (layer.type === 'text' && 'fontSize' in patch && typeof patch.fontSize === 'number' && patch.fontSize > layer.fontSize) {
        const scale = patch.fontSize / layer.fontSize;
        next = resizeTextSelection(next, Math.min(3840, Math.max(next.width, Math.ceil(layer.width * scale))),
          Math.min(3840, Math.max(next.height, Math.ceil(layer.height * scale))));
      }
      const safe = measureTextLayerSafetyBounds(next, product);
      next = resizeTextSelection(next, safe.width, safe.height);
    }
    const currentValues = layer as unknown as Record<string, unknown>;
    if (Object.entries(next).every(([key, value]) => Object.is(value, currentValues[key]))) return;
    return onChange(next, amendHistory);
  };

  function scaleElement(factor: number) {
    if (layer.type === 'background') return;
    const next = scaledDimensions(layer.width, layer.height, 'width', Math.round(layer.width * factor));
    update({
      width: next.width,
      height: next.height,
      x: Math.max(-3840, Math.min(3840, Math.round(layer.x + (layer.width - next.width) / 2))),
      y: Math.max(-3840, Math.min(3840, Math.round(layer.y + (layer.height - next.height) / 2))),
    });
  }

  function insertField(field: TemplateField) {
    if (!('text' in layer)) return;
    const editor = textInput.current;
    if (!editor) return;
    const range = messageEditorRange(editor);
    range.deleteContents();
    const token = createMessageToken(field, templateFieldLabel(field, product?.attributes));
    range.insertNode(token);
    range.setStartAfter(token);
    range.collapse(true);
    editor.focus();
    setMessageEditorCaret(range);
    if (!commitMessageEditor(editor)) restoreMessageEditor(editor);
  }

  function commitMessageEditor(editor: HTMLDivElement) {
    const text = serializeMessageEditor(editor);
    if (text.length > 700) {
      setTextError('O texto pode ter até 700 caracteres.');
      return false;
    }
    setTextError('');
    editor.dataset.messageValue = text;
    editor.dataset.attributeLabels = messageLabels;
    update({ text });
    return true;
  }

  function restoreMessageEditor(editor: HTMLDivElement) {
    if (!('text' in layer)) return;
    renderMessageEditor(editor, layer.text, product, messageLabels);
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    setMessageEditorCaret(range);
  }

  function insertMessageText(text: string) {
    const editor = textInput.current;
    if (!editor) return;
    const range = messageEditorRange(editor);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    editor.focus();
    setMessageEditorCaret(range);
    if (!commitMessageEditor(editor)) restoreMessageEditor(editor);
  }

  function removeMessageToken(token: HTMLElement) {
    const editor = textInput.current;
    if (!editor || !editor.contains(token)) return;
    const range = document.createRange();
    range.setStartBefore(token);
    range.collapse(true);
    token.remove();
    editor.focus();
    setMessageEditorCaret(range);
    commitMessageEditor(editor);
  }

  function handleMessageKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const editor = textInput.current;
    if (!editor || event.target !== editor) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      insertMessageText('\n');
      return;
    }
    if ((event.key !== 'Backspace' && event.key !== 'Delete') || !window.getSelection()?.isCollapsed) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return;
    const backwards = event.key === 'Backspace';
    let adjacent: Node | null = null;
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer;
      if (backwards && range.startOffset === 0) adjacent = textNode.previousSibling;
      if (!backwards && range.startOffset === textNode.textContent?.length) adjacent = textNode.nextSibling;
    } else if (range.startContainer instanceof Element) {
      adjacent = range.startContainer.childNodes[backwards ? range.startOffset - 1 : range.startOffset] ?? null;
    }
    if (adjacent instanceof HTMLElement && adjacent.dataset.templateField) {
      event.preventDefault();
      removeMessageToken(adjacent);
    }
  }

  return <fieldset className="ct-layer-settings" disabled={disabled}>
    <h2>Camada de {LAYER_TYPES[layer.type].label.toLowerCase()}</h2>
    <label className="ct-field"><span>Nome da camada</span><input id="ct-layer-name" maxLength={80} value={layer.name}
      disabled={layer.type === 'background'}
      onChange={(event) => update({ name: event.target.value })} /></label>
    {layer.type === 'background' ? <>
      <ColorField label="Cor do fundo" value={layer.color} swatches={swatches} onChange={(color) => update({ color })} />
      <NumberField label="Opacidade (%)" value={layer.opacity ?? 100} min={0} max={100} onChange={(opacity) => update({ opacity })} />
    </> : <>
      {layer.type === 'product' && <>
        <NumberField label="Número da imagem" value={layer.imageIndex} min={0} max={MAX_PARENT_PRODUCT_IMAGES - 1} onChange={(imageIndex) => update({ imageIndex })} />
        <label className="ct-field"><span>Imagem de cópia de segurança</span><select value={layer.fallback}
          onChange={(event) => update({ fallback: event.target.value as 'main' | 'none' })}>
          <option value="none">Nenhuma</option><option value="main">Imagem principal</option>
        </select></label>
      </>}
      {layer.type === 'image' && <>
        <label className="ct-field"><span>{layer.assetId ? 'Substituir imagem' : 'Carregar imagem'}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
            event.target.value = '';
          }} /></label>
        {uploading && <small role="status">Preparando imagem…</small>}
        {uploadError && <small className="ct-error" role="alert">{uploadError}</small>}
        {layer.assetId && <div className="ct-asset-card">
          {assetPreview ? <img src={assetPreview} alt="" /> : <span className="ct-asset-placeholder" aria-hidden="true"><i className="bi bi-image" /></span>}
          <span className="ct-asset-name" title={layer.assetName || 'Imagem carregada'}>{layer.assetName || 'Imagem carregada'}</span>
          <button type="button" className="ct-link" onClick={() => update({ assetId: null, assetName: undefined })}>Remover</button>
        </div>}
        {layer.assetId && <button type="button" className="ct-button ct-crop-trigger" disabled={uploading || !assetPreview}
          title={!assetPreview ? 'Carregando imagem para recorte' : undefined}
          onClick={() => setCropOpen(true)}><i className="bi bi-crop" aria-hidden="true" />Recortar imagem</button>}
      </>}
      {(layer.type === 'text' || layer.type === 'sticker') && <div className="ct-panel-group">
        <h3>Entrada de texto e seleção de atributos</h3>
        <div className="ct-field"><span>Mensagem</span>
          <div className="ct-message-entry"><div id="ct-layer-message" ref={textInput} className="ct-message-editor" role="textbox"
            aria-label="Mensagem" aria-placeholder="Insere texto e/ou prime '+' para adicionar campos do produto"
            aria-multiline="true" aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning
            data-placeholder="Insere texto e/ou prime '+' para adicionar campos do produto"
            onInput={(event) => { if (!commitMessageEditor(event.currentTarget)) restoreMessageEditor(event.currentTarget); }}
            onKeyDown={handleMessageKeyDown}
            onPaste={(event) => { event.preventDefault(); insertMessageText(event.clipboardData.getData('text/plain')); }}
            onMouseDown={(event) => {
              if (event.target instanceof Element && event.target.closest('[data-remove-template-field]')) event.preventDefault();
            }}
            onClick={(event) => {
              if (!(event.target instanceof Element)) return;
              const remove = event.target.closest('[data-remove-template-field]');
              const token = remove?.closest<HTMLElement>('[data-template-field]');
              if (token) removeMessageToken(token);
            }} />
            <button type="button" className="ct-button ct-add-field" aria-label="Adicionar campo do produto"
              onMouseDown={(event) => event.preventDefault()}
              aria-expanded={fieldMenuOpen} onClick={() => setFieldMenuOpen((open) => !open)}>+</button>
            {fieldMenuOpen && <div className="ct-field-menu" aria-label="Campos do produto">
              {optionsFor('name', product).map(([value, label]) => <button type="button" key={value}
                onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  insertField(value); setFieldMenuOpen(false);
                }}>{label}</button>)}
            </div>}
          </div>
        </div>
        {textError && <small role="alert" className="ct-error">{textError}</small>}
      </div>}
      {layer.type === 'sticker' && <div className="ct-field-grid">
        <label className="ct-field"><span>Formato</span><select value={layer.shape} onChange={(event) => update({ shape: event.target.value as typeof layer.shape })}>
          <option value="circle">Círculo</option><option value="square">Quadrado</option><option value="rectangle">Retângulo</option>
        </select></label>
        <NumberField label="Opacidade do preenchimento (%)" min={0} max={100} value={layer.fillOpacity ?? 100}
          onChange={(fillOpacity) => update({ fillOpacity })} />
        <ColorField label="Cor da forma" value={layer.fill} swatches={swatches} onChange={(fill) => update({ fill })} />
      </div>}
      {'font' in layer && <TemplateTypographySection layer={layer} swatches={swatches} disabled={disabled}
        onUpdate={(patch) => update(patch)} />}
      <div className="ct-panel-group">
        <label className="ct-field ct-angle">
          <span>Ângulo</span>
          <input type="range" min={-180} max={180} value={layer.angle} aria-valuetext={`${layer.angle}°`}
            onPointerDown={() => { angleDragChanged.current = false; }} onPointerUp={endAngleDrag}
            onPointerCancel={endAngleDrag} onBlur={endAngleDrag} onKeyDown={endAngleDrag}
            onChange={(event) => {
              update({ angle: event.target.valueAsNumber }, angleDragChanged.current === true);
              if (angleDragChanged.current !== null) angleDragChanged.current = true;
            }} />
          <span className="ct-angle-limits" aria-hidden="true"><span>−180°</span><span>180°</span></span>
        </label>
        <div className="ct-field-grid">
          <NumberField label="Ângulo (°)" value={layer.angle} min={-180} max={180} onChange={(angle) => update({ angle })} />
          <NumberField label="Opacidade (%)" value={layer.opacity} min={0} max={100} onChange={(opacity) => update({ opacity })} />
        </div>
        <div className="ct-section-heading">
          <h3>Tamanho e posição</h3>
          <div className="ct-tools" aria-label="Escala rápida do elemento">
            <button type="button" className="ct-button ct-icon-button" aria-label="Diminuir tamanho do elemento"
              title="Diminuir tamanho do elemento (−10%)" disabled={layer.width <= (textSafetyBounds?.minimumWidth ?? 16)
                || layer.height <= (textSafetyBounds?.minimumHeight ?? 16)}
              onClick={() => scaleElement(1 / 1.1)}><i className="bi bi-dash-lg" aria-hidden="true" /></button>
            <button type="button" className="ct-button ct-icon-button" aria-label="Aumentar tamanho do elemento"
              title="Aumentar tamanho do elemento (+10%)" disabled={layer.width >= 3840 || layer.height >= 3840}
              onClick={() => scaleElement(1.1)}><i className="bi bi-plus-lg" aria-hidden="true" /></button>
          </div>
        </div>
        <div className="ct-field-grid">
          <NumberField label="X" min={-3840} max={3840} value={layer.x} onChange={(x) => update({ x })} />
          <NumberField label="Y" min={-3840} max={3840} value={layer.y} onChange={(y) => update({ y })} />
          <NumberField label="Largura" min={textSafetyBounds?.minimumWidth ?? 16} max={3840} value={layer.width}
            onChange={(width) => update(layer.type === 'image' || (layer.type === 'sticker' && layer.lockAspectRatio)
              ? scaledDimensions(layer.width, layer.height, 'width', width) : { width })} />
          <div className="ct-size-lock-row">
            <NumberField label="Altura" min={textSafetyBounds?.minimumHeight ?? 16} max={3840} value={layer.height}
              onChange={(height) => update(layer.type === 'image' || (layer.type === 'sticker' && layer.lockAspectRatio)
                ? scaledDimensions(layer.width, layer.height, 'height', height) : { height })} />
            {layer.type === 'sticker' && <button type="button" className="ct-button ct-icon-button ct-lock-aspect"
              aria-label="Bloquear proporção de imagem" title="Bloquear proporção de imagem" aria-pressed={!!layer.lockAspectRatio}
              onClick={() => update({ lockAspectRatio: !layer.lockAspectRatio })}>
              <i className={`bi ${layer.lockAspectRatio ? 'bi-lock-fill' : 'bi-unlock'}`} aria-hidden="true" />
            </button>}
          </div>
        </div>
      </div>
      {layer.type === 'product' && <div className="ct-panel-group"
        onMouseEnter={() => { void warmBackgroundRemoval(); }}
        onFocus={() => { void warmBackgroundRemoval(); }}>
        <h3>Melhorar com a IA</h3>
        <LayerSwitch label="Remoção do fundo" description="A IA detecta a silhueta no navegador; na primeira vez, o modelo é baixado."
          checked={layer.removeBackground} onChange={(removeBackground) => update({ removeBackground })} />
        <LayerSwitch label="Enquadrar" description="Aproxima e centraliza o móvel na camada, mantendo uma folga pequena até as bordas."
          checked={layer.fit === 'cover'} onChange={(checked) => update({ fit: checked ? 'cover' : 'contain' })} />
      </div>}
      {(layer.type === 'product' || 'condition' in layer) && <LayerRule
        condition={layer.condition ?? null}
        visible={isLayerVisible(layer, product)} product={product} onChange={(condition) => update({ condition })} />}
    </>}
    {cropOpen && layer.type === 'image' && assetPreview && <TemplateImageCropDialog source={assetPreview}
      filename={layer.assetName || 'imagem.webp'} onCancel={() => setCropOpen(false)} onConfirm={async (file, crop) => {
        const applied = await onFile(file, { fit: 'contain', crop });
        if (applied === false) return false;
        setCropOpen(false);
        return true;
      }} />}
  </fieldset>;
}
