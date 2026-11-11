import type { ImageLayer, ImageLayout, PositionedLayer, TemplateLayerGroup } from './catalogImageTemplate';

export type GroupSelection = TemplateLayerGroup & { type: 'group'; angle: 0 };
export type TemplateSelection = ImageLayer | GroupSelection;
export type PositionedSelection = PositionedLayer | GroupSelection;
export type TemplateStackItem = { id: string; group?: TemplateLayerGroup; layers: ImageLayer[] };
type Box = { x: number; y: number; width: number; height: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function templateLayerBounds(layer: Box & { angle?: number }): Box {
  const radians = (layer.angle ?? 0) * Math.PI / 180;
  const width = Math.abs(Math.cos(radians)) * layer.width + Math.abs(Math.sin(radians)) * layer.height;
  const height = Math.abs(Math.sin(radians)) * layer.width + Math.abs(Math.cos(radians)) * layer.height;
  return { x: layer.x + (layer.width - width) / 2, y: layer.y + (layer.height - height) / 2, width, height };
}

export function templateBoundsUnion(boxes: readonly Box[]): Box {
  const x = Math.floor(Math.min(...boxes.map((box) => box.x)) + .000001);
  const y = Math.floor(Math.min(...boxes.map((box) => box.y)) + .000001);
  return { x, y,
    width: Math.max(16, Math.ceil(Math.max(...boxes.map((box) => box.x + box.width)) - .000001) - x),
    height: Math.max(16, Math.ceil(Math.max(...boxes.map((box) => box.y + box.height)) - .000001) - y) };
}

export function templateGroupForLayer(layout: ImageLayout, layerId: string) {
  return layout.groups?.find((group) => group.layerIds.includes(layerId));
}

export function findTemplateSelection(layout: ImageLayout, id: string): TemplateSelection | undefined {
  const group = layout.groups?.find((entry) => entry.id === id);
  return group ? { ...group, type: 'group', angle: 0 } : layout.layers.find((layer) => layer.id === id);
}

export function templateStackItems(layout: ImageLayout): TemplateStackItem[] {
  const seen = new Set<string>();
  return layout.layers.flatMap((layer) => {
    const group = templateGroupForLayer(layout, layer.id);
    if (!group) return [{ id: layer.id, layers: [layer] }];
    if (seen.has(group.id)) return [];
    seen.add(group.id);
    return [{ id: group.id, group, layers: layout.layers.filter((entry) => group.layerIds.includes(entry.id)) }];
  });
}

export function templateGroupIssue(layers: readonly ImageLayer[], groups: readonly TemplateLayerGroup[] = []): string | null {
  const ids = new Set(layers.map((layer) => layer.id));
  const members = new Set<string>();
  for (const group of groups) {
    if (ids.has(group.id)) return 'Há identificadores de agrupamento repetidos.';
    ids.add(group.id);
    const indices: number[] = [];
    for (const id of group.layerIds) {
      const index = layers.findIndex((layer) => layer.id === id && layer.type !== 'background');
      if (index < 0 || members.has(id)) return 'Cada camada deve pertencer a apenas um agrupamento válido.';
      members.add(id);
      indices.push(index);
      const box = templateLayerBounds(layers[index] as PositionedLayer);
      if (box.x < group.x - .01 || box.y < group.y - .01 || box.x + box.width > group.x + group.width + .01
        || box.y + box.height > group.y + group.height + .01) return 'Há uma camada fora da área do agrupamento.';
    }
    indices.sort((a, b) => a - b);
    if (indices.some((index, offset) => index !== indices[0] + offset)) return 'Mantenha juntas as camadas do agrupamento.';
  }
  return null;
}

function assertGroupSize(box: Box) {
  if (box.width > 3840 || box.height > 3840 || box.x < -3840 || box.y < -3840 || box.x > 3840 || box.y > 3840) {
    throw new Error('O agrupamento deve caber em uma área de até 3840 × 3840 px. Aproxime as camadas antes de agrupar.');
  }
}

function nextTemplateGroupName(groups: readonly TemplateLayerGroup[] = []): string {
  const highest = groups.reduce((number, group) => Math.max(number, Number(/^Grupo (\d+)$/.exec(group.name)?.[1] ?? 0)), 0);
  return `Grupo ${highest + 1}`;
}

function withoutMembers(groups: readonly TemplateLayerGroup[], ids: ReadonlySet<string>) {
  return groups.map((group) => ({ ...group, layerIds: group.layerIds.filter((id) => !ids.has(id)) }))
    .filter((group) => group.layerIds.length > 0);
}

function packTemplateGroups(layout: ImageLayout): ImageLayout {
  return { ...layout, layers: templateStackItems(layout).flatMap((item) => item.layers) };
}

export function createTemplateGroup(layout: ImageLayout, ids: readonly string[]) {
  const chosen = new Set(ids);
  const members = layout.layers.filter((layer): layer is PositionedLayer => layer.type !== 'background' && chosen.has(layer.id));
  if (members.length < 2) throw new Error('Selecione pelo menos duas camadas para agrupar.');
  const memberIds = new Set(members.map((layer) => layer.id));
  const bounds = templateBoundsUnion(members.map(templateLayerBounds));
  assertGroupSize(bounds);
  const group: TemplateLayerGroup = { id: crypto.randomUUID(), name: nextTemplateGroupName(layout.groups), ...bounds,
    layerIds: members.map((layer) => layer.id) };
  const index = layout.layers.findIndex((layer) => memberIds.has(layer.id));
  const layers = layout.layers.filter((layer) => !memberIds.has(layer.id));
  layers.splice(index, 0, ...members);
  return { group, layout: packTemplateGroups({ ...layout, layers, groups: [...withoutMembers(layout.groups ?? [], memberIds), group] }) };
}

export function addTemplateGroupLayers(layout: ImageLayout, groupId: string, ids: readonly string[]): ImageLayout {
  const group = layout.groups?.find((entry) => entry.id === groupId);
  if (!group) throw new Error('Este agrupamento não está mais disponível.');
  const chosen = new Set(ids.filter((id) => !group.layerIds.includes(id)));
  const added = layout.layers.filter((layer): layer is PositionedLayer => layer.type !== 'background' && chosen.has(layer.id));
  if (!added.length) throw new Error('Selecione pelo menos uma camada para adicionar.');
  const allIds = new Set([...group.layerIds, ...added.map((layer) => layer.id)]);
  const members = layout.layers.filter((layer): layer is PositionedLayer => layer.type !== 'background' && allIds.has(layer.id));
  const bounds = templateBoundsUnion([group, ...members.map(templateLayerBounds)]);
  assertGroupSize(bounds);
  const start = layout.layers.findIndex((layer) => group.layerIds.includes(layer.id));
  const index = layout.layers.slice(0, start).filter((layer) => !allIds.has(layer.id)).length;
  const layers = layout.layers.filter((layer) => !allIds.has(layer.id));
  layers.splice(index, 0, ...members);
  const others = withoutMembers((layout.groups ?? []).filter((entry) => entry.id !== groupId), new Set(added.map((layer) => layer.id)));
  return packTemplateGroups({ ...layout, layers, groups: [...others, { ...group, ...bounds, layerIds: members.map((layer) => layer.id) }] });
}

export function releaseTemplateLayer(layout: ImageLayout, layerId: string): ImageLayout {
  const group = templateGroupForLayer(layout, layerId);
  if (!group) return layout;
  const released = layout.layers.find((layer) => layer.id === layerId)!;
  const remaining = group.layerIds.filter((id) => id !== layerId);
  const layers = layout.layers.filter((layer) => layer.id !== layerId);
  const last = layers.reduce((index, layer, current) => remaining.includes(layer.id) ? current : index, -1);
  layers.splice(last < 0 ? layout.layers.indexOf(released) : last + 1, 0, released);
  return { ...layout, layers, groups: withoutMembers(layout.groups ?? [], new Set([layerId])) };
}

export function removeTemplateGroup(layout: ImageLayout, groupId: string): ImageLayout {
  return { ...layout, groups: layout.groups?.filter((group) => group.id !== groupId) };
}

export function duplicateTemplateGroup(layout: ImageLayout, groupId: string) {
  const group = layout.groups?.find((entry) => entry.id === groupId);
  if (!group) throw new Error('Este agrupamento não está mais disponível.');
  const members = layout.layers.filter((layer): layer is PositionedLayer =>
    layer.type !== 'background' && group.layerIds.includes(layer.id));
  if (members.length !== group.layerIds.length) throw new Error('Não foi possível duplicar todas as camadas deste agrupamento.');

  const copies = members.map((layer): PositionedLayer => {
    const copy = { ...layer, id: crypto.randomUUID(), name: `${layer.name.slice(0, 72)} (cópia)` };
    if ('condition' in copy && copy.condition) copy.condition = { ...copy.condition };
    return copy;
  });
  const copyGroup: TemplateLayerGroup = { ...group, id: crypto.randomUUID(), name: nextTemplateGroupName(layout.groups),
    condition: group.condition ? { ...group.condition } : group.condition, layerIds: copies.map((layer) => layer.id) };
  const layers = [...layout.layers];
  layers.splice(layers.findIndex((layer) => group.layerIds.includes(layer.id)), 0, ...copies);
  const duplicated = packTemplateGroups({ ...layout, layers, groups: [...(layout.groups ?? []), copyGroup] });
  return { layout: duplicated, group: copyGroup };
}

export function deleteTemplateLayer(layout: ImageLayout, layerId: string): ImageLayout {
  return { ...layout, layers: layout.layers.filter((layer) => layer.id !== layerId),
    groups: withoutMembers(layout.groups ?? [], new Set([layerId])) };
}

export function reorderTemplateItem(layout: ImageLayout, id: string, targetId: string): ImageLayout {
  const items = templateStackItems(layout);
  const from = items.findIndex((item) => item.id === id);
  const target = items.findIndex((item) => item.id === targetId);
  if (from < 0 || target < 0 || from === target || items[from].layers[0].type === 'background'
    || items[target].layers[0].type === 'background') return layout;
  const [moving] = items.splice(from, 1);
  items.splice(target, 0, moving);
  return { ...layout, layers: items.flatMap((item) => item.layers) };
}

export function constrainTemplateSelection(layout: ImageLayout, selection: TemplateSelection): TemplateSelection {
  if (selection.type === 'background') return selection;
  if (selection.type === 'group') {
    const previous = layout.groups?.find((group) => group.id === selection.id);
    if (!previous) return selection;
    if (previous.width !== selection.width || previous.height !== selection.height) {
      const members = layout.layers.filter((layer): layer is PositionedLayer => layer.type !== 'background' && previous.layerIds.includes(layer.id));
      const bounds = templateBoundsUnion([selection, ...members.map(templateLayerBounds)]);
      assertGroupSize(bounds);
      return { ...selection, ...bounds };
    }
    const children = layout.layers.filter((layer): layer is PositionedLayer => layer.type !== 'background' && previous.layerIds.includes(layer.id));
    const dx = clamp(selection.x - previous.x, Math.max(-3840 - previous.x, ...children.map((layer) => -3840 - layer.x)),
      Math.min(3840 - previous.x, ...children.map((layer) => 3840 - layer.x)));
    const dy = clamp(selection.y - previous.y, Math.max(-3840 - previous.y, ...children.map((layer) => -3840 - layer.y)),
      Math.min(3840 - previous.y, ...children.map((layer) => 3840 - layer.y)));
    return { ...selection, x: previous.x + dx, y: previous.y + dy };
  }
  const group = templateGroupForLayer(layout, selection.id);
  if (!group) return selection;
  const box = templateLayerBounds(selection);
  const minX = Math.max(group.x, -3840 + box.x - selection.x);
  const maxX = Math.min(group.x + group.width - box.width, 3840 + box.x - selection.x);
  const minY = Math.max(group.y, -3840 + box.y - selection.y);
  const maxY = Math.min(group.y + group.height - box.height, 3840 + box.y - selection.y);
  if (box.width > group.width + .01 || box.height > group.height + .01 || minX > maxX + .01 || minY > maxY + .01) {
    throw new Error(`A camada “${selection.name}” não cabe no agrupamento. Aumente o tamanho do agrupamento primeiro.`);
  }
  const x = clamp(box.x, minX, maxX);
  const y = clamp(box.y, minY, maxY);
  return { ...selection, x: selection.x + x - box.x, y: selection.y + y - box.y };
}

export function applyTemplateSelection(layout: ImageLayout, candidate: TemplateSelection): ImageLayout {
  const next = constrainTemplateSelection(layout, candidate);
  if (next.type !== 'group') return { ...layout, layers: layout.layers.map((layer) => layer.id === next.id ? next : layer) };
  const previous = layout.groups?.find((group) => group.id === next.id);
  if (!previous || candidate.type !== 'group') return layout;
  const resized = previous.width !== candidate.width || previous.height !== candidate.height;
  const dx = resized ? 0 : next.x - previous.x;
  const dy = resized ? 0 : next.y - previous.y;
  const group: TemplateLayerGroup = { id: next.id, name: next.name, x: next.x, y: next.y, width: next.width, height: next.height,
    condition: next.condition, layerIds: next.layerIds };
  return { ...layout,
    groups: layout.groups?.map((entry) => entry.id === group.id ? group : entry),
    layers: layout.layers.map((layer) => layer.type !== 'background' && group.layerIds.includes(layer.id)
      ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer) };
}
