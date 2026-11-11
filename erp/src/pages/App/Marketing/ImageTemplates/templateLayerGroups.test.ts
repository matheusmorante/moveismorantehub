import { describe, expect, it } from 'vitest';
import { copyImageLayout, createImageLayer, imageTemplateFormSchema, startImageTemplate, type ImageLayout, type PositionedLayer } from '../../../../../../shared-utils/catalogImageTemplate';
import { addTemplateGroupLayers, applyTemplateSelection, constrainTemplateSelection, createTemplateGroup, deleteTemplateLayer,
  findTemplateSelection, releaseTemplateLayer, removeTemplateGroup, reorderTemplateItem, templateGroupIssue, templateLayerBounds,
  templateStackItems, type GroupSelection } from '../../../../../../shared-utils/catalogImageTemplateGroups';

function fixture() {
  const base = startImageTemplate('blank').formats['1:1'];
  const image = (name: string, x: number, y: number) => ({ ...createImageLayer('image', '1:1'), name, x, y, width: 100, height: 60 }) as PositionedLayer;
  const a = image('A', 20, 30), b = image('B', 200, 120), c = image('C', 400, 50);
  const layout: ImageLayout = { layers: [a, c, b, ...base.layers] };
  return { layout, a, b, c };
}
const selection = (layout: ImageLayout, id: string) => findTemplateSelection(layout, id) as GroupSelection;
const parse = (layout: ImageLayout) => imageTemplateFormSchema.safeParse({ name: 'Modelo', description: '', design: { version: 1, formats: { '1:1': layout } } });

describe('agrupamentos de camadas', () => {
  it('agrupa no lugar da camada mais alta, preserva a ordem interna e as posições da composição', () => {
    const { layout, a, b, c } = fixture();
    const grouped = createTemplateGroup(layout, [b.id, a.id]);
    expect(grouped.layout.layers.map((layer) => layer.id)).toEqual([a.id, b.id, c.id, ...layout.layers.slice(3).map((layer) => layer.id)]);
    expect(grouped.group).toMatchObject({ x: 20, y: 30, width: 280, height: 150, layerIds: [a.id, b.id] });
    expect(grouped.layout.layers[0]).toEqual(a);
    expect(grouped.layout.layers[1]).toEqual(b);
    expect(templateStackItems(grouped.layout)[0].id).toBe(grouped.group.id);
    expect(layout.groups).toBeUndefined();
    expect(parse(grouped.layout).success).toBe(true);
  });

  it('move o agrupamento mantendo as posições relativas e deixa as outras camadas no lugar', () => {
    const { layout, a, b, c } = fixture();
    const grouped = createTemplateGroup(layout, [a.id, b.id]);
    const moved = applyTemplateSelection(grouped.layout, { ...selection(grouped.layout, grouped.group.id), x: 61, y: 10 });
    expect(moved.layers.find((layer) => layer.id === a.id)).toMatchObject({ x: 61, y: 10 });
    expect(moved.layers.find((layer) => layer.id === b.id)).toMatchObject({ x: 241, y: 100 });
    expect(moved.layers.find((layer) => layer.id === c.id)).toEqual(c);
    expect(templateGroupIssue(moved.layers, moved.groups)).toBeNull();
  });

  it('limita o movimento individual à área do grupo e libera mais espaço ao aumentar a área', () => {
    const { layout, a, b } = fixture();
    const grouped = createTemplateGroup(layout, [a.id, b.id]);
    const limited = constrainTemplateSelection(grouped.layout, { ...a, x: 1000, y: -1000 });
    expect(limited).toMatchObject({ x: 200, y: 30 });
    const expanded = applyTemplateSelection(grouped.layout, { ...selection(grouped.layout, grouped.group.id), width: 500, height: 300 });
    expect(expanded.layers).toEqual(grouped.layout.layers);
    expect(constrainTemplateSelection(expanded, { ...a, x: 1000, y: -1000 })).toMatchObject({ x: 420, y: 30 });
    const shrinking = applyTemplateSelection(grouped.layout, { ...selection(grouped.layout, grouped.group.id), width: 16, height: 16 });
    expect(shrinking.groups?.[0]).toMatchObject({ width: 280, height: 150 });
  });

  it('contém também a silhueta de camadas giradas e recusa uma camada maior que o grupo', () => {
    const { layout, a, b } = fixture();
    const rotated = { ...a, angle: 35 };
    const grouped = createTemplateGroup({ ...layout, layers: layout.layers.map((layer) => layer.id === a.id ? rotated : layer) }, [a.id, b.id]);
    const next = constrainTemplateSelection(grouped.layout, { ...rotated, x: -1000, y: 1000 }) as PositionedLayer;
    const box = templateLayerBounds(next);
    expect(box.x).toBeGreaterThanOrEqual(grouped.group.x - .01);
    expect(box.y + box.height).toBeLessThanOrEqual(grouped.group.y + grouped.group.height + .01);
    expect(() => constrainTemplateSelection(grouped.layout, { ...a, width: 1000 })).toThrow('Aumente o tamanho do agrupamento');
    const edgeA = { ...a, x: -3840, y: 0 }, edgeB = { ...b, x: -3840, y: 200 };
    const edge = createTemplateGroup({ ...layout, layers: [edgeA, edgeB, ...layout.layers.slice(3)] }, [a.id, b.id]);
    expect(() => constrainTemplateSelection(edge.layout, { ...edgeA, width: 200, height: 20, angle: 90 })).toThrow('Aumente o tamanho do agrupamento');
  });

  it('adiciona novas camadas no grupo existente sem mover a composição', () => {
    const { layout, a, b, c } = fixture();
    const grouped = createTemplateGroup(layout, [a.id, b.id]);
    const next = addTemplateGroupLayers(grouped.layout, grouped.group.id, [c.id, c.id, a.id]);
    expect(next.groups?.[0].layerIds).toEqual([a.id, b.id, c.id]);
    expect(next.groups?.[0]).toMatchObject({ x: 20, y: 30, width: 480, height: 150 });
    expect(next.layers.find((layer) => layer.id === c.id)).toEqual(c);
    expect(templateGroupIssue(next.layers, next.groups)).toBeNull();
  });

  it('transfere camadas de outro grupo sem duplicar membros ou separar os grupos restantes', () => {
    const { layout, a, b, c } = fixture();
    const d = { ...a, id: crypto.randomUUID(), name: 'D', x: 550 };
    const first = createTemplateGroup({ ...layout, layers: [a, b, c, d, ...layout.layers.slice(3)] }, [a.id, b.id, c.id]);
    const second = createTemplateGroup(first.layout, [b.id, d.id]);
    expect(templateGroupIssue(second.layout.layers, second.layout.groups)).toBeNull();
    const added = addTemplateGroupLayers(second.layout, second.group.id, [c.id]);
    expect(templateGroupIssue(added.layers, added.groups)).toBeNull();
    expect(added.groups?.find((group) => group.id === first.group.id)?.layerIds).toEqual([a.id]);
  });

  it('retira uma camada e remove o container mantendo as camadas e suas posições', () => {
    const { layout, a, b } = fixture();
    const grouped = createTemplateGroup(layout, [a.id, b.id]);
    const released = releaseTemplateLayer(grouped.layout, a.id);
    expect(released.groups?.[0].layerIds).toEqual([b.id]);
    expect(released.layers.find((layer) => layer.id === a.id)).toEqual(a);
    const removed = removeTemplateGroup(released, grouped.group.id);
    expect(removed.groups).toEqual([]);
    expect(removed.layers).toEqual(released.layers);
    expect(deleteTemplateLayer(released, b.id).groups).toEqual([]);
  });

  it('reordena o bloco inteiro com o mesmo controle e protege o fundo', () => {
    const { layout, a, b, c } = fixture();
    const grouped = createTemplateGroup(layout, [a.id, b.id]);
    const moved = reorderTemplateItem(grouped.layout, grouped.group.id, c.id);
    expect(moved.layers.slice(0, 3).map((layer) => layer.id)).toEqual([c.id, a.id, b.id]);
    expect(reorderTemplateItem(moved, a.id, c.id)).toBe(moved);
    expect(reorderTemplateItem(moved, grouped.group.id, moved.layers.at(-1)!.id)).toBe(moved);
  });

  it('preserva os grupos ao copiar formatos, inclusive formas que mantêm a altura', () => {
    const { layout, a } = fixture();
    const sticker = { ...createImageLayer('sticker', '1:1'), x: 200, y: 100, width: 260, height: 260 };
    const grouped = createTemplateGroup({ ...layout, layers: [a, sticker, ...layout.layers.slice(1)] }, [a.id, sticker.id]);
    const tall = copyImageLayout(grouped.layout, '1:1', '9:16');
    const square = copyImageLayout(tall, '9:16', '1:1');
    expect(square.groups?.[0].id).toBe(grouped.group.id);
    expect(square.groups?.[0].layerIds).toEqual(grouped.group.layerIds);
    expect(templateGroupIssue(tall.layers, tall.groups)).toBeNull();
    expect(templateGroupIssue(square.layers, square.groups)).toBeNull();
    expect(parse(square).success).toBe(true);
  });

  it('valida membros, limites e compatibilidade antes de salvar pelo schema do formulário', () => {
    const { layout, a, b } = fixture();
    const { layout: grouped, group } = createTemplateGroup(layout, [a.id, b.id]);
    expect(parse(layout).success).toBe(true);
    const saved = parse(grouped);
    expect(saved.success && saved.data.design.formats['1:1'].groups?.[0]).toEqual(group);
    for (const invalid of [
      { ...group, layerIds: [a.id, a.id] },
      { ...group, layerIds: [crypto.randomUUID()] },
      { ...group, layerIds: [layout.layers.at(-1)!.id] },
      { ...group, width: 16 },
    ]) expect(parse({ ...grouped, groups: [invalid] }).success).toBe(false);
    expect(() => createTemplateGroup(layout, [a.id])).toThrow('pelo menos duas');
  });
});
