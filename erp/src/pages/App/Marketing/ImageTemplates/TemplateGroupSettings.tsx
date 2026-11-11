import { isLayerVisible, type ImageLayout, type LayerCondition, type PositionedLayer, type TemplatePreviewProduct }
  from '../../../../../../shared-utils/catalogImageTemplate';
import { templateLayerBounds, type GroupSelection } from '../../../../../../shared-utils/catalogImageTemplateGroups';
import { LayerRule } from './TemplateLayerSettings';
import { NumberField } from './TemplateNumberField';

export type LayerSelectionMode = { groupId?: string; layerIds: string[] };

export function TemplateMultiSelectionSettings({ mode, groupName, disabled, onConfirm, onCancel, onCopyToFormat }: {
  mode: LayerSelectionMode; groupName?: string; disabled: boolean; onConfirm: () => void; onCancel: () => void;
  onCopyToFormat: () => void;
}) {
  const adding = !!mode.groupId;
  return <fieldset className="ct-layer-settings" disabled={disabled}>
    <h2>{adding ? 'Adicionar camadas' : 'Selecionar várias camadas'}</h2>
    <p className="ct-muted">{adding ? `Marque as camadas que deseja adicionar a “${groupName}”.`
      : 'Marque pelo menos duas camadas na lista para criar um agrupamento.'}</p>
    <p role="status">{mode.layerIds.length} camada(s) selecionada(s).</p>
    {!adding && <button type="button" className="ct-button" disabled={disabled || mode.layerIds.length < 1} onClick={onCopyToFormat}>
      <i className="bi bi-aspect-ratio" aria-hidden="true" />Copiar para outra proporção</button>}
    <button type="button" className="ct-button ct-primary" disabled={mode.layerIds.length < (adding ? 1 : 2)} onClick={onConfirm}>
      {adding ? 'Adicionar camadas selecionadas' : 'Agrupar'}
    </button>
    <button type="button" className="ct-button" onClick={onCancel}>Cancelar seleção</button>
  </fieldset>;
}

export function TemplateGroupSettings({ group, layout, product, disabled, onChange }: {
  group: GroupSelection; layout: ImageLayout; product: TemplatePreviewProduct | null; disabled: boolean;
  onChange: (group: GroupSelection) => boolean | void;
}) {
  const members = layout.layers.filter((layer): layer is PositionedLayer => layer.type !== 'background' && group.layerIds.includes(layer.id));
  const bounds = members.map(templateLayerBounds);
  const minimumWidth = Math.max(16, Math.ceil(Math.max(...bounds.map((box) => box.x + box.width)) - group.x - .000001));
  const minimumHeight = Math.max(16, Math.ceil(Math.max(...bounds.map((box) => box.y + box.height)) - group.y - .000001));
  return <fieldset className="ct-layer-settings" disabled={disabled}>
    <h2>Agrupamento</h2>
    <label className="ct-field"><span>Nome do agrupamento</span><input id="ct-group-name" maxLength={80} value={group.name}
      onChange={(event) => onChange({ ...group, name: event.target.value })} /></label>
    <p className="ct-muted">As {members.length} camadas se movem juntas. A área tracejada limita o movimento de cada camada dentro do agrupamento.</p>
    <div className="ct-panel-group"><h3>Tamanho e posição</h3>
      <div className="ct-field-grid">
        <NumberField label="X do agrupamento" value={group.x} min={-3840} max={3840} onChange={(x) => onChange({ ...group, x })} />
        <NumberField label="Y do agrupamento" value={group.y} min={-3840} max={3840} onChange={(y) => onChange({ ...group, y })} />
        <NumberField label="Largura do agrupamento" value={group.width} min={minimumWidth} max={3840} onChange={(width) => onChange({ ...group, width })} />
        <NumberField label="Altura do agrupamento" value={group.height} min={minimumHeight} max={3840} onChange={(height) => onChange({ ...group, height })} />
      </div>
    </div>
    <small className="ct-muted">Aumente a largura ou a altura para dar mais espaço às camadas. Na prévia, clique duas vezes em uma camada para editá-la individualmente.</small>
    <LayerRule condition={group.condition ?? null} visible={isLayerVisible(group, product)} product={product}
      subject="este agrupamento e suas camadas"
      onChange={(condition: LayerCondition | null) => onChange({ ...group, condition })} />
  </fieldset>;
}
