import {
  IMAGE_TEMPLATE_FONTS,
  type ImageLayer,
  type ImageTextEffect,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import { NumberField } from '../TemplateNumberField';
import { ColorField } from './TemplateColorField';
import { Text3dDirectionPicker, text3dDirectionAngles } from './Text3dDirectionPicker';

export type TypographyLayer = Extract<ImageLayer, { type: 'text' | 'sticker' }>;

const styleButtons = [
  ['bold', 'Negrito', 'bi-type-bold'],
  ['italic', 'Itálico', 'bi-type-italic'],
  ['underline', 'Sublinhado', 'bi-type-underline'],
  ['strike', 'Tachado', 'bi-type-strikethrough'],
] as const;
const alignButtons = [
  ['left', 'Alinhar à esquerda', 'bi-text-left'],
  ['center', 'Centralizar', 'bi-text-center'],
  ['right', 'Alinhar à direita', 'bi-text-right'],
] as const;
const verticalAlignButtons = [
  ['top', 'Alinhar no topo', '↥'],
  ['middle', 'Alinhar ao meio', '↕'],
  ['bottom', 'Alinhar em baixo', '↧'],
] as const;
const textEffectSizeLabels: Record<Exclude<ImageTextEffect, 'none'>, string> = {
  shadow: 'Desfoque da sombra',
  outline: 'Espessura do contorno',
  '3d': 'Profundidade 3D',
  neon: 'Brilho do neon',
};

const optionsForFont = (current: string) => (IMAGE_TEMPLATE_FONTS.includes(current as typeof IMAGE_TEMPLATE_FONTS[number])
  ? IMAGE_TEMPLATE_FONTS
  : [current, ...IMAGE_TEMPLATE_FONTS]);

export function TemplateTypographySection({
  layer,
  swatches,
  disabled,
  onUpdate,
}: {
  layer: TypographyLayer;
  swatches: readonly string[];
  disabled: boolean;
  onUpdate: (patch: Partial<TypographyLayer>) => void;
}) {
  const textEffect = layer.textShadow ? 'shadow' : layer.textEffect ?? 'none';

  return <div className="ct-panel-group">
    <h3>Tipografia e aspeto</h3>
    <label className="ct-field"><span>Fonte</span><select value={layer.font} style={{ fontFamily: layer.font }}
      onChange={(event) => onUpdate({ font: event.target.value as typeof layer.font })}>
      {optionsForFont(layer.font).map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
    </select></label>
    <div className="ct-field-grid">
      <NumberField label="Tamanho do tipo de letra" min={8} max={240} value={layer.fontSize} onChange={(fontSize) => onUpdate({ fontSize })} />
      <NumberField label="Opacidade do texto (%)" min={0} max={100} value={layer.textOpacity ?? 100} onChange={(textOpacity) => onUpdate({ textOpacity })} />
      <ColorField label="Cor do texto" value={layer.color} swatches={swatches} onChange={(color) => onUpdate({ color })} />
    </div>
    <label className="ct-field"><span>Efeito do texto</span><select value={textEffect}
      onChange={(event) => onUpdate({ textEffect: event.target.value as ImageTextEffect })}>
      <option value="none">Nenhum</option><option value="shadow">Sombra</option><option value="outline">Contorno</option>
      <option value="3d">3D</option><option value="neon">Neon</option>
    </select></label>
    {textEffect === 'shadow' && <ColorField label="Cor da sombra" value={layer.textShadowColor ?? '#000000'}
      swatches={swatches} onChange={(textShadowColor) => onUpdate({ textShadowColor })} />}
    {textEffect === 'shadow' && <NumberField label="Opacidade da sombra (%)" min={0} max={100}
      value={layer.textShadowOpacity ?? 56} onChange={(textShadowOpacity) => onUpdate({ textShadowOpacity })} />}
    {textEffect === 'outline' && <ColorField label="Cor do contorno" value={layer.textOutlineColor ?? '#ffffff'}
      swatches={swatches} onChange={(textOutlineColor) => onUpdate({ textOutlineColor })} />}
    {textEffect === '3d' && <ColorField label="Cor do efeito 3D" value={layer.text3dColor ?? '#172033'}
      swatches={swatches} onChange={(text3dColor) => onUpdate({ text3dColor })} />}
    {textEffect === '3d' && <div className="ct-field"><span>Direção do efeito 3D</span>
      <Text3dDirectionPicker angle={layer.text3dAngle ?? text3dDirectionAngles[layer.text3dDirection ?? 'down-right']} disabled={disabled}
        onChange={(text3dAngle) => onUpdate({ text3dAngle })} />
    </div>}
    {textEffect === 'neon' && <ColorField label="Cor do neon" value={layer.textNeonColor ?? '#00e5ff'}
      swatches={swatches} onChange={(textNeonColor) => onUpdate({ textNeonColor })} />}
    {textEffect !== 'none' && <NumberField label={textEffectSizeLabels[textEffect]} min={1} max={32}
      value={layer.textEffectSize ?? 6} onChange={(textEffectSize) => onUpdate({ textEffectSize })} />}
    <h3>Estilo do texto</h3>
    <div className="ct-tools" aria-label="Estilo do texto">
      {styleButtons.map(([key, title, icon]) => <button type="button" className="ct-button ct-icon-button" key={key} title={title} aria-label={title}
        aria-pressed={!!layer[key]} onClick={() => onUpdate({ [key]: !layer[key] })}><i className={`bi ${icon}`} aria-hidden="true" /></button>)}
    </div>
    <h3>Alinhamento do texto</h3>
    <div className="ct-tools" aria-label="Alinhamento do texto">
      {alignButtons.map(([align, title, icon]) => <button type="button" className="ct-button ct-icon-button" key={align} title={title} aria-label={title}
        aria-pressed={layer.align === align} onClick={() => onUpdate({ align })}><i className={`bi ${icon}`} aria-hidden="true" /></button>)}
    </div>
    <h3>Alinhamento vertical</h3>
    <div className="ct-tools" aria-label="Alinhamento vertical">
      {verticalAlignButtons.map(([verticalAlign, title, icon]) => <button type="button" className="ct-button ct-icon-button" key={verticalAlign}
        title={title} aria-label={title} aria-pressed={(layer.verticalAlign ?? 'middle') === verticalAlign}
        onClick={() => onUpdate({ verticalAlign })}>{icon}</button>)}
    </div>
    <div className="ct-field-grid">
      <NumberField label="Espaçamento entre linhas" min={0.5} max={3} step={0.1} value={layer.lineSpacing ?? 1.16}
        onChange={(lineSpacing) => onUpdate({ lineSpacing })} />
      <NumberField label="Espaçamento entre letras" min={-20} max={100} value={layer.letterSpacing ?? 0}
        onChange={(letterSpacing) => onUpdate({ letterSpacing })} />
    </div>
  </div>;
}
