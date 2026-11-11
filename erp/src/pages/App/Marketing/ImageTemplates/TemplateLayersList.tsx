import { useEffect, useRef, useState, type DragEvent } from 'react';
import { LAYER_TYPES, MAX_IMAGE_LAYERS, type ImageLayer, type ImageLayout } from '../../../../../../shared-utils/catalogImageTemplate';
import { templateGroupForLayer, templateStackItems } from '../../../../../../shared-utils/catalogImageTemplateGroups';
import type { LayerSelectionMode } from './TemplateGroupSettings';

interface Props {
  layout: ImageLayout; activeId: string; sources: ReadonlyMap<string, string>; disabled: boolean;
  selection: LayerSelectionMode | null;
  onSelect: (id: string) => void; onToggleSelection: (id: string) => void; onBeginSelection: (id: string) => void;
  onAddToGroup: (id: string) => void; onRemoveGroup: (id: string) => void; onUngroup: (id: string) => void;
  onDuplicateGroup: (id: string) => void;
  onRename: (id: string) => void; onRemove: (layer: ImageLayer) => void; onDuplicate: (layer: ImageLayer) => void;
  onCopyToFormat: (layerIds: string[]) => void;
  canRemove: (layer: ImageLayer) => boolean; onReorder: (id: string, targetId: string) => void;
}

export function TemplateLayersList({ layout, activeId, sources, disabled, selection, onSelect, onToggleSelection,
  onBeginSelection, onAddToGroup, onRemoveGroup, onDuplicateGroup, onUngroup, onRename, onRemove, onDuplicate, onCopyToFormat, canRemove, onReorder }: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const dragged = useRef('');
  const items = templateStackItems(layout);
  const targetGroup = layout.groups?.find((group) => group.id === selection?.groupId);
  useEffect(() => {
    if (!menuId) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === 'Escape') setMenuId(null); return; }
      if (!(event.target as Element | null)?.closest('.ct-layer-menu,.ct-layer-menu-toggle')) setMenuId(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menuId]);
  function act(action: () => void) { setMenuId(null); action(); }
  function drop(event: DragEvent, targetId: string) {
    if (!dragged.current || disabled || selection || event.dataTransfer.files.length) return;
    event.preventDefault();
    event.stopPropagation();
    onReorder(dragged.current, targetId);
    dragged.current = '';
  }
  function grip(id: string, name: string, locked = false) {
    if (locked) return <span className="ct-layer-grip-placeholder" aria-hidden="true"><i className="bi bi-lock" /></span>;
    if (selection) return <span className="ct-layer-grip-placeholder" />;
    return <button type="button" className="ct-layer-grip" draggable={!disabled} disabled={disabled}
      aria-label={`Mover posição de ${name}`} title="Arraste para mudar a ordem; use as setas para cima e para baixo"
      onDragStart={(event) => {
        dragged.current = id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
        event.stopPropagation();
      }} onDragEnd={() => { dragged.current = ''; }} onKeyDown={(event) => {
        const offset = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
        if (!offset) return;
        event.preventDefault();
        const target = items[items.findIndex((item) => item.id === id) + offset];
        if (target) onReorder(id, target.id);
      }}><i className="bi bi-grip-vertical" aria-hidden="true" /></button>;
  }
  function menuToggle(id: string, name: string, target: 'camada' | 'agrupamento' = 'camada') {
    return <button type="button" className="ct-layer-menu-toggle" aria-label={`Ações ${target === 'camada' ? 'da camada' : 'do agrupamento'} ${name}`}
      aria-expanded={menuId === id} aria-controls={menuId === id ? `ct-layer-menu-${id}` : undefined} disabled={disabled || !!selection}
      onClick={() => setMenuId(menuId === id ? null : id)}><i className="bi bi-three-dots" aria-hidden="true" /></button>;
  }
  function layerRow(layer: ImageLayer, grouped = false, groupId?: string) {
    const eligible = layer.type !== 'background' && !targetGroup?.layerIds.includes(layer.id);
    const selected = !!selection?.layerIds.includes(layer.id);
    return <li key={layer.id} className="ct-layer-row" data-active={layer.id === activeId || selected} data-grouped={grouped || undefined}>
      {selection && eligible ? <input className="ct-layer-select-checkbox" type="checkbox" checked={selected} disabled={disabled}
        aria-label={`Selecionar camada ${layer.name}`} onChange={() => onToggleSelection(layer.id)} />
        : grouped ? <span className="ct-layer-grip-placeholder" /> : grip(layer.id, layer.name, layer.type === 'background')}
      <button type="button" className="ct-select-layer" aria-pressed={selection ? selected : layer.id === activeId}
        title={layer.name} disabled={disabled || !!selection && !eligible} onClick={() => act(() => {
          if (selection) onToggleSelection(layer.id);
          else { setExpandedGroupId(groupId ?? null); onSelect(layer.id); }
        })}>
        {layer.type === 'image' && layer.assetId && sources.get(layer.assetId)
          ? <img className="ct-layer-thumb" src={sources.get(layer.assetId)} alt="" aria-hidden="true" />
          : <i className={`bi ${LAYER_TYPES[layer.type].icon}`} aria-hidden="true" />}
        <span><strong>{layer.name || 'Camada sem nome'}</strong><small>{LAYER_TYPES[layer.type].label}</small></span>
      </button>
      {menuToggle(layer.id, layer.name)}
      {menuId === layer.id && <div id={`ct-layer-menu-${layer.id}`} className="ct-layer-menu">
        <button type="button" disabled={layer.type === 'background'} onClick={() => act(() => onBeginSelection(layer.id))}>
          <i className="bi bi-ui-checks-grid" aria-hidden="true" />Selecionar vários</button>
        <button type="button" disabled={layer.type === 'background'} onClick={() => act(() => onRename(layer.id))}>
          <i className="bi bi-pencil" aria-hidden="true" />Alterar nome</button>
        <button type="button" disabled={layer.type === 'background' || layout.layers.length >= MAX_IMAGE_LAYERS}
          onClick={() => act(() => onDuplicate(layer))}><i className="bi bi-copy" aria-hidden="true" />Duplicar</button>
        <button type="button" disabled={layer.type === 'background'}
          onClick={() => act(() => onCopyToFormat([layer.id]))}>
          <i className="bi bi-aspect-ratio" aria-hidden="true" />Copiar para outra proporção</button>
        {templateGroupForLayer(layout, layer.id) && <button type="button" onClick={() => act(() => onUngroup(layer.id))}>
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />Desagrupar</button>}
        <button className="ct-layer-menu-danger" type="button" disabled={!canRemove(layer)} onClick={() => act(() => onRemove(layer))}>
          <i className="bi bi-trash3" aria-hidden="true" />Excluir</button>
      </div>}
    </li>;
  }
  return <ol className="ct-layer-list">
    {items.map((item) => item.group ? <li key={item.id} className="ct-layer-group" data-active={activeId === item.id}
      onDragOver={(event) => { if (dragged.current && !selection) event.preventDefault(); }} onDrop={(event) => drop(event, item.id)}>
      <div className="ct-layer-row ct-layer-group-header" data-active={activeId === item.id}>
        {grip(item.id, item.group.name)}
        <button type="button" className="ct-select-layer" aria-pressed={activeId === item.id}
          title={item.group.name} disabled={disabled || !!selection}
          onClick={() => act(() => {
            onSelect(item.id);
          })}><i className="bi bi-collection" aria-hidden="true" />
          <span><strong>{item.group.name}</strong><small className="ct-layer-group-count">{item.layers.length} camadas</small></span>
        </button>
        <div className="ct-layer-group-tools">
          <button type="button" className="ct-layer-group-expand" aria-label={`${expandedGroupId === item.id ? 'Recolher' : 'Expandir'} camadas de ${item.group.name}`}
            aria-expanded={expandedGroupId === item.id}
            aria-controls={expandedGroupId === item.id ? `ct-group-layer-list-${item.id}` : undefined}
            title={expandedGroupId === item.id ? 'Recolher camadas' : 'Expandir camadas'} disabled={disabled || !!selection}
            onClick={() => setExpandedGroupId((current) => current === item.id ? null : item.id)}>
            <i className={`bi ${expandedGroupId === item.id ? 'bi-chevron-down' : 'bi-chevron-right'}`} aria-hidden="true" />
          </button>
          {menuToggle(item.id, item.group.name, 'agrupamento')}
        </div>
        {menuId === item.id && <div id={`ct-layer-menu-${item.id}`} className="ct-layer-menu">
          <button type="button" disabled={layout.layers.length + item.layers.length > MAX_IMAGE_LAYERS}
            onClick={() => act(() => onDuplicateGroup(item.id))}><i className="bi bi-copy" aria-hidden="true" />Duplicar grupo</button>
          <button type="button" onClick={() => act(() => onAddToGroup(item.id))}>
            <i className="bi bi-plus-lg" aria-hidden="true" />Adicionar camada</button>
          <button className="ct-layer-menu-danger" type="button" onClick={() => act(() => onRemoveGroup(item.id))}>
            <i className="bi bi-trash3" aria-hidden="true" />Remover agrupamento</button>
        </div>}
      </div>
      {expandedGroupId === item.id && <ol id={`ct-group-layer-list-${item.id}`} className="ct-group-layer-list">
        {item.layers.map((layer) => layerRow(layer, true, item.id))}
      </ol>}
    </li> : <li key={item.id} className="ct-layer-stack-item"
      onDragOver={(event) => { if (dragged.current && !selection && item.layers[0].type !== 'background') event.preventDefault(); }}
      onDrop={(event) => drop(event, item.id)}><ol>{layerRow(item.layers[0])}</ol></li>)}
  </ol>;
}
