import { useEffect, useRef, useState, type CSSProperties } from 'react';
import CurrencyInput from '@/components/CurrencyInput';
import { CATALOG_FIELDS, CONDITION_OPERATORS, IMAGE_TEMPLATE_FONTS, LAYER_TYPES, isLayerVisible, isPercentageField, isPriceField, parseCatalogPrice, templateFieldLabel,
  type CatalogField, type ImageLayer, type LayerCondition, type TemplateField, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { MAX_PARENT_PRODUCT_IMAGES } from '../../../../../../shared-utils/productImageLimits';

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

const EXCLUDED_DROPDOWN_FIELDS = new Set(['productType', 'salePrice']);
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
const styleButtons = [ ['bold', 'Negrito', 'bi-type-bold'], ['italic', 'Itálico', 'bi-type-italic'],
  ['underline', 'Sublinhado', 'bi-type-underline'], ['strike', 'Tachado', 'bi-type-strikethrough'],
  ['textShadow', 'Sombra do texto', 'bi-stars'] ] as const;
const alignButtons = [ ['left', 'Alinhar à esquerda', 'bi-text-left'], ['center', 'Centralizar', 'bi-text-center'], ['right', 'Alinhar à direita', 'bi-text-right'] ] as const;
const verticalAlignButtons = [['top', 'Alinhar no topo', '↥'], ['middle', 'Alinhar ao meio', '↕'], ['bottom', 'Alinhar em baixo', '↧']] as const;
const optionsForFont = (current: string) => IMAGE_TEMPLATE_FONTS.includes(current as typeof IMAGE_TEMPLATE_FONTS[number])
  ? IMAGE_TEMPLATE_FONTS : [current, ...IMAGE_TEMPLATE_FONTS];

function scaledDimensions(width: number, height: number, dimension: 'width' | 'height', value: number) {
  const minimumScale = Math.max(16 / width, 16 / height);
  const maximumScale = Math.min(3840 / width, 3840 / height);
  const requestedScale = value / (dimension === 'width' ? width : height);
  const scale = Math.max(minimumScale, Math.min(maximumScale, requestedScale));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function NumberField({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const number = draft.trim() ? Number(draft) : NaN;
    const precision = (String(step).split('.')[1] || '').length;
    const next = Number.isFinite(number)
      ? Number((Math.round(Math.min(max, Math.max(min, number)) / step) * step).toFixed(precision)) : value;
    setDraft(String(next));
    if (value !== next) onChange(next);
  }
  return <label className="ct-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={draft}
    onChange={(event) => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} /></label>;
}

function LayerSwitch({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return <label className="ct-switch"><span className="ct-switch-copy"><strong>{label}</strong><small>{description}</small></span>
    <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </label>;
}

function LayerRule({ condition, visible, product, onChange }: { condition: LayerCondition | null; visible: boolean;
  product: TemplatePreviewProduct | null; onChange: (rule: LayerCondition | null) => void }) {
  const isPrice = !!condition && isPriceField(condition.field);
  const isPercent = !!condition && (isPercentageField(condition.field) || condition.field === 'discount');
  const numeric = isPrice || isPercent;
  const operators = Object.entries(CONDITION_OPERATORS).filter(([operator]) => numeric
    ? operator !== 'contains' && operator !== 'notContains' : !['gt', 'gte', 'lt', 'lte'].includes(operator));
  return <div className="ct-panel-group">
    <h3>Apresentação condicional</h3>
    <LayerSwitch label="Mostrar apenas esta camada" description="quando a regra for atendida."
      checked={!!condition} onChange={(checked) =>
        onChange(checked ? { field: 'promoPrice', operator: 'exists', value: '' } : null)} />
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
  onChange: (layer: ImageLayer, amendHistory?: boolean) => void;
  onFile: (file: File) => void; uploading: boolean; disabled: boolean; uploadError: string;
}) {
  const angleDragChanged = useRef<boolean | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const [textError, setTextError] = useState('');
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);
  const swatches = palette?.length ? [...new Set([...DEFAULT_COLOR_SWATCHES, ...palette])] : DEFAULT_COLOR_SWATCHES;
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
  const endAngleDrag = () => { angleDragChanged.current = null; };
  const update = (patch: Partial<ImageLayer>, amendHistory = false) => onChange({ ...layer, ...patch } as ImageLayer, amendHistory);
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
    const start = textInput.current?.selectionStart ?? layer.text.length;
    const end = textInput.current?.selectionEnd ?? start;
    const token = `{{product.${field}}}`;
    const text = layer.text.slice(0, start) + token + layer.text.slice(end);
    if (text.length > 700) { setTextError('O texto pode ter até 700 caracteres.'); return; }
    setTextError('');
    update({ text });
    requestAnimationFrame(() => {
      textInput.current?.focus();
      textInput.current?.setSelectionRange(start + token.length, start + token.length);
    });
  }
  return <fieldset className="ct-layer-settings" disabled={disabled}>
    <h2>Camada de {LAYER_TYPES[layer.type].label.toLowerCase()}</h2>
    <label className="ct-field"><span>Nome da camada</span><input id="ct-layer-name" maxLength={80} value={layer.name}
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
            if (file) onFile(file);
            event.target.value = '';
          }} /></label>
        {uploading && <small role="status">Preparando imagem…</small>}
        {uploadError && <small className="ct-error" role="alert">{uploadError}</small>}
        {layer.assetId && <div className="ct-asset-card">
          {assetPreview ? <img src={assetPreview} alt="" /> : <span className="ct-asset-placeholder" aria-hidden="true"><i className="bi bi-image" /></span>}
          <span className="ct-asset-name" title={layer.assetName || 'Imagem carregada'}>{layer.assetName || 'Imagem carregada'}</span>
          <button type="button" className="ct-link" onClick={() => update({ assetId: null, assetName: undefined })}>Remover</button>
        </div>}
      </>}
      {layer.type === 'image' && <label className="ct-checkbox">
        <input type="checkbox" checked={layer.fit === 'cover'} onChange={(event) => update({ fit: event.target.checked ? 'cover' : 'contain' })} />Cortar para preencher
      </label>}
      {layer.type === 'catalog' && <label className="ct-field"><span>Campo do produto</span>
        <select value={layer.field} onChange={(event) => {
          const field = event.target.value as TemplateField;
          const currentLabel = templateFieldLabel(layer.field, product?.attributes);
          update({ field, name: layer.name === currentLabel || layer.name === LAYER_TYPES.catalog.label
            ? templateFieldLabel(field, product?.attributes) : layer.name });
        }}>{optionsFor(layer.field, product).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {(layer.type === 'text' || layer.type === 'sticker') && <div className="ct-panel-group">
        <h3>Entrada de texto e seleção de atributos</h3>
        <div className="ct-field"><label htmlFor="ct-layer-message">Mensagem</label>
          <div className="ct-message-entry"><textarea id="ct-layer-message" ref={textInput} rows={3} maxLength={700} value={layer.text}
            placeholder="Insere texto e/ou prime '+' para adicionar campos do produto" onChange={(event) => {
            setTextError(''); update({ text: event.target.value });
          }} /><button type="button" className="ct-button ct-add-field" aria-label="Adicionar campo do produto"
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
              title="Diminuir tamanho do elemento (−10%)" disabled={layer.width <= 16 || layer.height <= 16}
              onClick={() => scaleElement(1 / 1.1)}><i className="bi bi-dash-lg" aria-hidden="true" /></button>
            <button type="button" className="ct-button ct-icon-button" aria-label="Aumentar tamanho do elemento"
              title="Aumentar tamanho do elemento (+10%)" disabled={layer.width >= 3840 || layer.height >= 3840}
              onClick={() => scaleElement(1.1)}><i className="bi bi-plus-lg" aria-hidden="true" /></button>
          </div>
        </div>
        <div className="ct-field-grid">
          <NumberField label="X" min={-3840} max={3840} value={layer.x} onChange={(x) => update({ x })} />
          <NumberField label="Y" min={-3840} max={3840} value={layer.y} onChange={(y) => update({ y })} />
          <NumberField label="Largura" min={16} max={3840} value={layer.width} onChange={(width) => update(layer.type === 'sticker' && layer.lockAspectRatio
            ? scaledDimensions(layer.width, layer.height, 'width', width) : { width })} />
          <div className="ct-size-lock-row">
            <NumberField label="Altura" min={16} max={3840} value={layer.height} onChange={(height) => update(layer.type === 'sticker' && layer.lockAspectRatio
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
        <LayerSwitch label="Remoção do fundo" description="Remove fundos uniformes localmente; ainda não usa segmentação por IA."
          checked={layer.removeBackground} onChange={(removeBackground) => update({ removeBackground })} />
        <LayerSwitch label="Recortar para ajustar" description="Faz do teu produto o centro da atenção."
          checked={layer.fit === 'cover'} onChange={(checked) => update({ fit: checked ? 'cover' : 'contain' })} />
      </div>}
      {(layer.type === 'product' || 'condition' in layer) && <LayerRule
        condition={layer.condition ?? null}
        visible={isLayerVisible(layer, product)} product={product} onChange={(condition) => update({ condition })} />}
    </>}
  </fieldset>;
}
