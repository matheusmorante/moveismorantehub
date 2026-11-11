import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent } from 'react';
import CurrencyInput from '@/components/CurrencyInput';
import { CATALOG_FIELDS, CONDITION_OPERATORS, IMAGE_TEMPLATE_FONTS, LAYER_TYPES, isLayerVisible, isPercentageField, isPriceField, isTemplateField, parseCatalogPrice, templateFieldLabel,
  type CatalogField, type ImageLayer, type ImageTextEffect, type LayerCondition, type TemplateField, type TemplatePreviewProduct,
  type Text3dDirection } from '../../../../../../shared-utils/catalogImageTemplate';
import { MAX_PARENT_PRODUCT_IMAGES } from '../../../../../../shared-utils/productImageLimits';
import { TemplateImageCropDialog } from './TemplateImageCropDialog';
import type { TemplateImageCrop } from './templateImageCrop';
import { NumberField } from './TemplateNumberField';
import { interpolateTemplateFields, measureTextLayerSafetyBounds } from './renderImageTemplate';

const DEFAULT_COLOR_SWATCHES = ['#ffffff', '#111827', '#2457da', '#e3be02', '#dc2626', '#16a34a', '#f97316', '#7c3aed'] as const;

function normalizeHexColor(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned.split('').map((ch) => ch + ch).join('').toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`;
  }
  return null;
}

function ColorField({ label, value, swatches = DEFAULT_COLOR_SWATCHES, onChange }: {
  label: string; value: string; swatches?: readonly string[]; onChange: (color: string) => void;
}) {
  const [draft, setDraft] = useState(value.toUpperCase());
  useEffect(() => setDraft(value.toUpperCase()), [value]);
  const uniqueSwatches = Array.from(new Set([value.toLowerCase(), ...swatches.map((color) => color.toLowerCase())])).slice(0, 8);
  function commitHex() {
    const normalized = normalizeHexColor(draft);
    if (normalized) {
      setDraft(normalized.toUpperCase());
      if (normalized !== value.toLowerCase()) onChange(normalized);
    } else {
      setDraft(value.toUpperCase());
    }
  }
  return <div className="ct-field ct-color-field">
    <span>{label}</span>
    <div className="ct-color-control">
      <input type="color" className="ct-color-picker" aria-label={label} value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())} />
      <input type="text" className="ct-color-hex" aria-label={`Código hexadecimal de ${label.toLowerCase()}`}
        maxLength={7} spellCheck={false} value={draft}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const cleaned = raw.trim().replace(/^#/, '');
          if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
            const next = `#${cleaned.toLowerCase()}`;
            if (next !== value.toLowerCase()) onChange(next);
          }
        }}
        onBlur={commitHex}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
    </div>
    <div className="ct-color-swatches" role="group" aria-label={`Seleção de cores para ${label.toLowerCase()}`}>
      {uniqueSwatches.map((swatch) => <button type="button" key={swatch} className="ct-color-swatch"
        style={{ '--ct-swatch': swatch } as CSSProperties}
        aria-label={`Selecionar cor ${swatch.toUpperCase()} para ${label.toLowerCase()}`}
        aria-pressed={value.toLowerCase() === swatch}
        title={swatch.toUpperCase()}
        onClick={() => onChange(swatch)} />)}
    </div>
  </div>;
}

const EXCLUDED_DROPDOWN_FIELDS = new Set(['productType', 'promoPrice', 'salePrice']);
const fieldOptions = Object.entries(CATALOG_FIELDS).filter(([field]) => !EXCLUDED_DROPDOWN_FIELDS.has(field)) as [CatalogField, string][];
function optionsFor(current: TemplateField, product: TemplatePreviewProduct | null): [TemplateField, string][] {
  const dynamicFields = Object.entries(product?.attributes ?? {}).reduce<[TemplateField, string][]>((fields, [field, attribute]) => {
    if (attribute && field !== 'attribute_cor') fields.push([field as TemplateField, attribute.name]);
    return fields;
  }, []);
  const options: [TemplateField, string][] = [...fieldOptions, ...dynamicFields];
  if (!options.some(([field]) => field === current)) options.push([current, templateFieldLabel(current, product?.attributes)]);
  return options;
}

function messageAttributeSignature(attributes: TemplatePreviewProduct['attributes']) {
  return JSON.stringify(Object.entries(attributes ?? {}).map(([field, attribute]) => [field, attribute?.name]));
}

function createMessageToken(rawField: string, label: string) {
  const token = document.createElement('span');
  token.className = 'ct-message-token';
  token.contentEditable = 'false';
  token.dataset.templateField = rawField;
  token.title = `Parâmetro: ${label}`;
  token.append(document.createTextNode(label));
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'ct-message-token-remove';
  remove.dataset.removeTemplateField = 'true';
  remove.setAttribute('aria-label', `Remover parâmetro ${label}`);
  remove.textContent = '×';
  token.append(remove);
  return token;
}

function renderMessageEditor(root: HTMLDivElement, value: string, product: TemplatePreviewProduct | null, labels: string) {
  root.replaceChildren();
  const appendText = (text: string) => { if (text) root.append(document.createTextNode(text)); };
  const tokenPattern = /\{\{product\.([a-zA-Z0-9_]+)\}\}/g;
  let cursor = 0;
  for (const match of value.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    appendText(value.slice(cursor, start));
    const rawField = match[1];
    root.append(isTemplateField(rawField)
      ? createMessageToken(rawField, templateFieldLabel(rawField as TemplateField, product?.attributes))
      : document.createTextNode(match[0]));
    cursor = start + match[0].length;
  }
  appendText(value.slice(cursor));
  root.dataset.messageValue = value;
  root.dataset.attributeLabels = labels;
}

function serializeMessageNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.dataset.templateField) return `{{product.${node.dataset.templateField}}}`;
  if (node.tagName === 'BR') return '\n';
  const value = Array.from(node.childNodes).map(serializeMessageNode).join('');
  return ['DIV', 'P'].includes(node.tagName) && node.textContent ? `${value}\n` : value;
}

function serializeMessageEditor(root: HTMLDivElement) {
  if (root.childNodes.length === 1 && root.firstChild instanceof HTMLBRElement) return '';
  return Array.from(root.childNodes).map(serializeMessageNode).join('');
}

function messageEditorRange(root: HTMLDivElement) {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  if (range && root.contains(range.commonAncestorContainer)) return range;
  const end = document.createRange();
  end.selectNodeContents(root);
  end.collapse(false);
  return end;
}

function setMessageEditorCaret(range: Range) {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const styleButtons = [ ['bold', 'Negrito', 'bi-type-bold'], ['italic', 'Itálico', 'bi-type-italic'],
  ['underline', 'Sublinhado', 'bi-type-underline'], ['strike', 'Tachado', 'bi-type-strikethrough'] ] as const;
const alignButtons = [ ['left', 'Alinhar à esquerda', 'bi-text-left'], ['center', 'Centralizar', 'bi-text-center'], ['right', 'Alinhar à direita', 'bi-text-right'] ] as const;
const verticalAlignButtons = [['top', 'Alinhar no topo', '↥'], ['middle', 'Alinhar ao meio', '↕'], ['bottom', 'Alinhar em baixo', '↧']] as const;
const textEffectSizeLabels: Record<Exclude<ImageTextEffect, 'none'>, string> = {
  shadow: 'Desfoque da sombra', outline: 'Espessura do contorno', '3d': 'Profundidade 3D', neon: 'Brilho do neon',
};
const text3dDirectionLabels: Record<Text3dDirection, string> = {
  'down-right': 'Inferior direita', down: 'Inferior', 'down-left': 'Inferior esquerda', left: 'Esquerda',
  'up-left': 'Superior esquerda', up: 'Superior', 'up-right': 'Superior direita', right: 'Direita',
};
const TEXT_3D_ORBIT_DIRECTIONS: readonly Text3dDirection[] = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
const text3dDirectionAngles: Record<Text3dDirection, number> = {
  'down-right': 45, down: 90, 'down-left': 135, left: 180, 'up-left': 225, up: 270, 'up-right': 315, right: 0,
};
const optionsForFont = (current: string) => IMAGE_TEMPLATE_FONTS.includes(current as typeof IMAGE_TEMPLATE_FONTS[number])
  ? IMAGE_TEMPLATE_FONTS : [current, ...IMAGE_TEMPLATE_FONTS];

function Text3dDirectionPicker({ angle, onChange, disabled }: {
  angle: number; onChange: (angle: number) => void; disabled: boolean;
}) {
  const dragging = useRef(false);
  const currentAngle = ((Math.round(angle) % 360) + 360) % 360;
  const directionIndex = Math.round(currentAngle / 45) % TEXT_3D_ORBIT_DIRECTIONS.length;
  const nearestDirection = TEXT_3D_ORBIT_DIRECTIONS[directionIndex] ?? 'right';
  const directionLabel = text3dDirectionLabels[nearestDirection];
  const radians = currentAngle * Math.PI / 180;
  const satellitePosition = {
    left: `${50 + Math.cos(radians) * 38}%`,
    top: `${50 + Math.sin(radians) * 38}%`,
  };
  const chooseFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    if (Math.hypot(dx, dy) < bounds.width * .08) return;
    const radians = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    onChange(Math.round(radians * 180 / Math.PI) % 360);
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let nextAngle: number | null = null;
    const step = event.shiftKey ? 15 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextAngle = currentAngle + step;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextAngle = currentAngle - step;
    if (event.key === 'Home') nextAngle = 45;
    if (event.key === 'End') nextAngle = 359;
    if (nextAngle === null) return;
    event.preventDefault();
    onChange((nextAngle + 360) % 360);
  };
  return <div className="ct-3d-direction-control">
    <div className="ct-3d-direction-orbit" role="slider" tabIndex={disabled ? -1 : 0}
      aria-label="Direção do efeito 3D" aria-roledescription="seletor circular"
      aria-valuemin={0} aria-valuemax={359} aria-valuenow={currentAngle}
      aria-valuetext={`${currentAngle} graus, ${directionLabel}`} aria-disabled={disabled}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (disabled) return;
        event.preventDefault();
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        chooseFromPointer(event);
      }}
      onPointerMove={(event) => { if (dragging.current && !disabled) chooseFromPointer(event); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onLostPointerCapture={() => { dragging.current = false; }}>
      <span className="ct-3d-orbit-ring" aria-hidden="true" />
      <span className="ct-3d-orbit-center" aria-hidden="true" />
      <span className="ct-3d-orbit-satellite" style={satellitePosition} aria-hidden="true" />
    </div>
    <span className="ct-3d-direction-value">{currentAngle}° · {directionLabel}</span>
  </div>;
}

function scaledDimensions(width: number, height: number, dimension: 'width' | 'height', value: number) {
  const minimumScale = Math.max(16 / width, 16 / height);
  const maximumScale = Math.min(3840 / width, 3840 / height);
  const requestedScale = value / (dimension === 'width' ? width : height);
  const scale = Math.max(minimumScale, Math.min(maximumScale, requestedScale));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

type EditableTextLayer = Extract<ImageLayer, { type: 'text' }>;
function resizeTextSelection(layer: EditableTextLayer, width: number, height: number): EditableTextLayer {
  const horizontalAnchor = layer.align === 'center' ? .5 : layer.align === 'right' ? 1 : 0;
  const verticalAlign = layer.verticalAlign ?? 'middle';
  const verticalAnchor = verticalAlign === 'middle' ? .5 : verticalAlign === 'bottom' ? 1 : 0;
  return { ...layer,
    x: Math.max(-3840, Math.min(3840, Math.round(layer.x - (width - layer.width) * horizontalAnchor))),
    y: Math.max(-3840, Math.min(3840, Math.round(layer.y - (height - layer.height) * verticalAnchor))),
    width, height,
  };
}

function LayerSwitch({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return <label className="ct-switch"><span className="ct-switch-copy"><strong>{label}</strong><small>{description}</small></span>
    <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </label>;
}

export function LayerRule({ condition, visible, product, onChange, subject = 'esta camada' }: { condition: LayerCondition | null; visible: boolean;
  product: TemplatePreviewProduct | null; onChange: (rule: LayerCondition | null) => void; subject?: string }) {
  const isPrice = !!condition && isPriceField(condition.field);
  const isPercent = !!condition && (isPercentageField(condition.field) || condition.field === 'discount');
  const numeric = isPrice || isPercent;
  const operators = Object.entries(CONDITION_OPERATORS).filter(([operator]) => numeric
    ? operator !== 'contains' && operator !== 'notContains' : !['gt', 'gte', 'lt', 'lte'].includes(operator));
  return <div className="ct-panel-group">
    <h3>Apresentação condicional</h3>
    <LayerSwitch label={`Mostrar apenas ${subject}`} description="quando a regra for atendida."
      checked={!!condition} onChange={(checked) =>
        onChange(checked ? { field: 'price', operator: 'exists', value: '' } : null)} />
    {condition && <>
      <label className="ct-field"><span>Campo da regra</span><select value={condition.field} onChange={(event) =>
        onChange({ field: event.target.value as TemplateField, operator: 'exists', value: '' })}>
        {optionsFor(condition.field, product).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      <label className="ct-field"><span>Condição</span><select value={condition.operator} onChange={(event) =>
        onChange({ ...condition, operator: event.target.value as LayerCondition['operator'] })}>
        {operators.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      {condition.operator !== 'exists' && condition.operator !== 'empty' && <label className="ct-field"><span>Valor da regra</span>
        {isPrice ? <CurrencyInput showBadge={false} value={parseCatalogPrice(condition.value)}
          onChange={(value) => onChange({ ...condition, value: String(value) })} />
          : isPercent ? <input type="number" min={0} max={100} value={condition.value.replace(/%/g, '')}
            onChange={(event) => onChange({ ...condition, value: event.target.value })} />
          : <input value={condition.value} maxLength={160}
            onChange={(event) => onChange({ ...condition, value: event.target.value })} />}</label>}
      <small className="ct-muted">{visible ? 'Visível para este produto.' : 'Oculta para este produto.'}</small>
    </>}
  </div>;
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
  useLayoutEffect(() => {
    const editor = textInput.current;
    if (!editor || editor.dataset.messageValue === layer.text && editor.dataset.attributeLabels === messageLabels) return;
    renderMessageEditor(editor, layer.text, product, messageLabels);
  }, [layer.text, messageLabels, product]);
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
  const textSafetyBounds = layer.type === 'text'
    ? measureTextLayerSafetyBounds(layer, product) : null;
  const textEffect = 'font' in layer ? layer.textShadow ? 'shadow' : layer.textEffect ?? 'none' : 'none';
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
      if (layer.type === 'text' && 'fontSize' in patch && typeof patch.fontSize === 'number'
        && patch.fontSize > layer.fontSize) {
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
      <ColorField label="Cor do fundo" value={layer.color} swatches={swatches}
        onChange={(color) => update({ color })} />
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
            onInput={(event) => { if (!commitMessageEditor(event.currentTarget)) restoreMessageEditor(event.currentTarget); }} onKeyDown={handleMessageKeyDown}
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
      {'font' in layer && <div className="ct-panel-group">
        <h3>Tipografia e aspeto</h3>
        <label className="ct-field"><span>Fonte</span><select value={layer.font} style={{ fontFamily: layer.font }}
          onChange={(event) => update({ font: event.target.value as typeof layer.font })}>
          {optionsForFont(layer.font).map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
        </select></label>
        <div className="ct-field-grid">
          <NumberField label="Tamanho do tipo de letra" min={8} max={240} value={layer.fontSize} onChange={(fontSize) => update({ fontSize })} />
          <NumberField label="Opacidade do texto (%)" min={0} max={100} value={layer.textOpacity ?? 100} onChange={(textOpacity) => update({ textOpacity })} />
          <ColorField label="Cor do texto" value={layer.color} swatches={swatches} onChange={(color) => update({ color })} />
        </div>
        <label className="ct-field"><span>Efeito do texto</span><select value={textEffect}
          onChange={(event) => update({ textEffect: event.target.value as ImageTextEffect })}>
          <option value="none">Nenhum</option><option value="shadow">Sombra</option><option value="outline">Contorno</option>
          <option value="3d">3D</option><option value="neon">Neon</option>
        </select></label>
        {textEffect === 'shadow' && <ColorField label="Cor da sombra" value={layer.textShadowColor ?? '#000000'}
          swatches={swatches} onChange={(textShadowColor) => update({ textShadowColor })} />}
        {textEffect === 'shadow' && <NumberField label="Opacidade da sombra (%)" min={0} max={100}
          value={layer.textShadowOpacity ?? 56} onChange={(textShadowOpacity) => update({ textShadowOpacity })} />}
        {textEffect === 'outline' && <ColorField label="Cor do contorno" value={layer.textOutlineColor ?? '#ffffff'}
          swatches={swatches} onChange={(textOutlineColor) => update({ textOutlineColor })} />}
        {textEffect === '3d' && <ColorField label="Cor do efeito 3D" value={layer.text3dColor ?? '#172033'}
          swatches={swatches} onChange={(text3dColor) => update({ text3dColor })} />}
        {textEffect === '3d' && <div className="ct-field"><span>Direção do efeito 3D</span>
          <Text3dDirectionPicker angle={layer.text3dAngle ?? text3dDirectionAngles[layer.text3dDirection ?? 'down-right']} disabled={disabled}
            onChange={(text3dAngle) => update({ text3dAngle })} />
        </div>}
        {textEffect === 'neon' && <ColorField label="Cor do neon" value={layer.textNeonColor ?? '#00e5ff'}
          swatches={swatches} onChange={(textNeonColor) => update({ textNeonColor })} />}
        {textEffect !== 'none' && <NumberField label={textEffectSizeLabels[textEffect]} min={1} max={32}
          value={layer.textEffectSize ?? 6} onChange={(textEffectSize) => update({ textEffectSize })} />}
        <h3>Estilo do texto</h3>
        <div className="ct-tools" aria-label="Estilo do texto">
          {styleButtons.map(([key, title, icon]) => <button type="button" className="ct-button ct-icon-button" key={key} title={title} aria-label={title}
            aria-pressed={!!layer[key]} onClick={() => update({ [key]: !layer[key] })}><i className={`bi ${icon}`} aria-hidden="true" /></button>)}
        </div>
        <h3>Alinhamento do texto</h3>
        <div className="ct-tools" aria-label="Alinhamento do texto">
          {alignButtons.map(([align, title, icon]) => <button type="button" className="ct-button ct-icon-button" key={align} title={title} aria-label={title}
            aria-pressed={layer.align === align} onClick={() => update({ align })}><i className={`bi ${icon}`} aria-hidden="true" /></button>)}
        </div>
        <h3>Alinhamento vertical</h3>
        <div className="ct-tools" aria-label="Alinhamento vertical">
          {verticalAlignButtons.map(([verticalAlign, title, icon]) => <button type="button" className="ct-button ct-icon-button" key={verticalAlign}
            title={title} aria-label={title} aria-pressed={(layer.verticalAlign ?? 'middle') === verticalAlign}
            onClick={() => update({ verticalAlign })}>{icon}</button>)}
        </div>
        <div className="ct-field-grid">
          <NumberField label="Espaçamento entre linhas" min={0.5} max={3} step={0.1} value={layer.lineSpacing ?? 1.16}
            onChange={(lineSpacing) => update({ lineSpacing })} />
          <NumberField label="Espaçamento entre letras" min={-20} max={100} value={layer.letterSpacing ?? 0}
            onChange={(letterSpacing) => update({ letterSpacing })} />
        </div>
      </div>}
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
          <NumberField label="Largura" min={textSafetyBounds?.minimumWidth ?? 16} max={3840} value={layer.width} onChange={(width) => update(layer.type === 'image' || (layer.type === 'sticker' && layer.lockAspectRatio)
            ? scaledDimensions(layer.width, layer.height, 'width', width) : { width })} />
          <div className="ct-size-lock-row">
            <NumberField label="Altura" min={textSafetyBounds?.minimumHeight ?? 16} max={3840} value={layer.height} onChange={(height) => update(layer.type === 'image' || (layer.type === 'sticker' && layer.lockAspectRatio)
              ? scaledDimensions(layer.width, layer.height, 'height', height) : { height })} />
            {layer.type === 'sticker' && <button type="button" className="ct-button ct-icon-button ct-lock-aspect"
              aria-label="Bloquear proporção de imagem" title="Bloquear proporção de imagem" aria-pressed={!!layer.lockAspectRatio}
              onClick={() => update({ lockAspectRatio: !layer.lockAspectRatio })}>
              <i className={`bi ${layer.lockAspectRatio ? 'bi-lock-fill' : 'bi-unlock'}`} aria-hidden="true" />
            </button>}
          </div>
        </div>
      </div>
      {layer.type === 'product' && <div className="ct-panel-group">
        <h3>Melhorar com a IA</h3>
        <LayerSwitch label="Remoção do fundo" description="A IA detecta a silhueta no navegador; na primeira vez, o modelo é baixado."
          checked={layer.removeBackground} onChange={(removeBackground) => update({ removeBackground })} />
        <LayerSwitch label="Enquadrar com margem mínima" description="Recorta o espaço ao redor do móvel para preencher melhor a camada, mantendo margem."
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
