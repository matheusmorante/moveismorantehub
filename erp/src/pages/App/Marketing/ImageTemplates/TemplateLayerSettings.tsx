import { useEffect, useRef, useState } from 'react';
import { CATALOG_FIELDS, CONDITION_OPERATORS, IMAGE_TEMPLATE_FONTS, LAYER_TYPES, PRICE_FIELDS, isLayerVisible,
  type CatalogField, type ImageLayer, type LayerCondition, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';

const fieldOptions = Object.entries(CATALOG_FIELDS).filter(([field]) => !field.startsWith('custom_label_'));
const optionsFor = (current: string) => current.startsWith('custom_label_')
  ? [...fieldOptions, [current, CATALOG_FIELDS[current as CatalogField]] as [string, string]] : fieldOptions;
const styleButtons = [ ['bold', 'Negrito', 'bi-type-bold'], ['italic', 'Itálico', 'bi-type-italic'],
  ['underline', 'Sublinhado', 'bi-type-underline'], ['strike', 'Tachado', 'bi-type-strikethrough'] ] as const;
const alignButtons = [ ['left', 'Alinhar à esquerda', 'bi-text-left'], ['center', 'Centralizar', 'bi-text-center'], ['right', 'Alinhar à direita', 'bi-text-right'] ] as const;
const verticalAlignButtons = [['top', 'Alinhar no topo', '↥'], ['middle', 'Alinhar ao meio', '↕'], ['bottom', 'Alinhar em baixo', '↧']] as const;

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

function LayerRule({ condition, visible, onChange }: { condition: LayerCondition | null; visible: boolean; onChange: (rule: LayerCondition | null) => void }) {
  const numeric = !!condition && PRICE_FIELDS.includes(condition.field);
  const operators = Object.entries(CONDITION_OPERATORS).filter(([operator]) => numeric
    ? operator !== 'contains' && operator !== 'notContains' : !['gt', 'gte', 'lt', 'lte'].includes(operator));
  return <div className="ct-panel-group">
    <h3>Apresentação condicional</h3>
    <LayerSwitch label="Mostrar apenas esta camada" description="quando a regra for atendida."
      checked={!!condition} onChange={(checked) =>
        onChange(checked ? { field: 'salePrice', operator: 'exists', value: '' } : null)} />
    {condition && <>
      <label className="ct-field"><span>Campo da regra</span><select value={condition.field} onChange={(event) =>
        onChange({ field: event.target.value as CatalogField, operator: 'exists', value: '' })}>
        {optionsFor(condition.field).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      <label className="ct-field"><span>Condição</span><select value={condition.operator} onChange={(event) =>
        onChange({ ...condition, operator: event.target.value as LayerCondition['operator'] })}>
        {operators.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      {condition.operator !== 'exists' && condition.operator !== 'empty' && <label className="ct-field"><span>Valor da regra</span>
        <input value={condition.value} inputMode={numeric ? 'decimal' : 'text'} maxLength={160}
          placeholder={numeric ? 'Ex. 999,90' : undefined} onChange={(event) => onChange({ ...condition, value: event.target.value })} /></label>}
      <small className="ct-muted">{visible ? 'Visível para este produto.' : 'Oculta para este produto.'}</small>
    </>}
  </div>;
}

export function TemplateLayerSettings({ layer, product, assetPreview, onChange, onFile, uploading, disabled, uploadError }: {
  layer: ImageLayer; product: TemplatePreviewProduct | null; assetPreview?: string; onChange: (layer: ImageLayer, amendHistory?: boolean) => void;
  onFile: (file: File) => void; uploading: boolean; disabled: boolean; uploadError: string;
}) {
  const angleDragChanged = useRef<boolean | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const [textError, setTextError] = useState('');
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);
  const endAngleDrag = () => { angleDragChanged.current = null; };
  const update = (patch: Partial<ImageLayer>, amendHistory = false) => onChange({ ...layer, ...patch } as ImageLayer, amendHistory);
  function insertField(field: CatalogField) {
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
    {layer.type === 'background' ? <label className="ct-field"><span>Cor do fundo</span>
      <input type="color" value={layer.color} onChange={(event) => update({ color: event.target.value })} /></label> : <>
      {layer.type === 'product' && <>
        <NumberField label="Número da imagem" value={layer.imageIndex} min={0} max={3} onChange={(imageIndex) => update({ imageIndex })} />
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
          const field = event.target.value as CatalogField;
          update({ field, name: layer.name === CATALOG_FIELDS[layer.field] || layer.name === LAYER_TYPES.catalog.label ? CATALOG_FIELDS[field] : layer.name });
        }}>{optionsFor(layer.field).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {(layer.type === 'text' || layer.type === 'sticker') && <div className="ct-panel-group">
        <h3>Entrada de texto e seleção de atributos</h3>
        <div className="ct-field"><label htmlFor="ct-layer-message">Mensagem</label>
          <div className="ct-message-entry"><textarea id="ct-layer-message" ref={textInput} rows={3} maxLength={700} value={layer.text}
            placeholder="Insere texto e/ou prime '+' para adicionar campos do produto" onChange={(event) => {
            setTextError(''); update({ text: event.target.value });
          }} /><button type="button" className="ct-button ct-add-field" aria-label="Adicionar campo do produto"
            aria-expanded={fieldMenuOpen} onClick={() => setFieldMenuOpen((open) => !open)}>+</button>
            {fieldMenuOpen && <div className="ct-field-menu" aria-label="Campos do produto">
              {fieldOptions.map(([value, label]) => <button type="button" key={value}
                onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  insertField(value as CatalogField); setFieldMenuOpen(false);
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
        <label className="ct-field"><span>Cor da forma</span><input type="color" value={layer.fill} onChange={(event) => update({ fill: event.target.value })} /></label>
      </div>}
      {'font' in layer && <div className="ct-panel-group">
        <h3>Tipografia e aspeto</h3>
        <label className="ct-field"><span>Fonte</span><select value={layer.font}
          onChange={(event) => update({ font: event.target.value as typeof layer.font })}>
          {IMAGE_TEMPLATE_FONTS.map((font) => <option key={font}>{font}</option>)}
        </select></label>
        <div className="ct-field-grid">
          <NumberField label="Tamanho do tipo de letra" min={8} max={240} value={layer.fontSize} onChange={(fontSize) => update({ fontSize })} />
          <label className="ct-field"><span>Cor do texto</span><input type="color" value={layer.color} onChange={(event) => update({ color: event.target.value })} /></label>
          <NumberField label="Opacidade do texto (%)" min={0} max={100} value={layer.textOpacity ?? 100} onChange={(textOpacity) => update({ textOpacity })} />
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
        <h3>Tamanho e posição</h3>
        <div className="ct-field-grid">
          <NumberField label="X" min={-3840} max={3840} value={layer.x} onChange={(x) => update({ x })} />
          <NumberField label="Y" min={-3840} max={3840} value={layer.y} onChange={(y) => update({ y })} />
          <NumberField label="Largura" min={16} max={3840} value={layer.width} onChange={(width) => update({ width })} />
          <NumberField label="Altura" min={16} max={3840} value={layer.height} onChange={(height) => update({ height })} />
        </div>
      </div>
      {layer.type === 'product' && <div className="ct-panel-group">
        <h3>Melhorar imagem</h3>
        <LayerSwitch label="Remoção de fundo" description="Torna transparente um fundo uniforme."
          checked={layer.removeBackground} onChange={(removeBackground) => update({ removeBackground })} />
        <LayerSwitch label="Recortar para ajustar" description="Preenche a área, centralizando o produto."
          checked={layer.fit === 'cover'} onChange={(checked) => update({ fit: checked ? 'cover' : 'contain' })} />
      </div>}
      {(layer.type === 'product' || 'condition' in layer) && <LayerRule
        condition={layer.type === 'product' ? layer.condition ?? null : layer.condition}
        visible={isLayerVisible(layer, product)} onChange={(condition) => update({ condition })} />}
    </>}
  </fieldset>;
}
