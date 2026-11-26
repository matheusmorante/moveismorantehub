import { z } from 'zod';
import {
  templateBoundsUnion,
  templateGroupIssue,
  templateLayerBounds,
} from './catalogImageTemplateGroups';
import {
  conditionSchema,
  fieldSchema,
  FORMAT_DIMENSIONS,
  IMAGE_FORMATS,
  templateFieldLabel,
  type ImageFormat,
} from './catalogImageTemplateFields';
import {
  imageLayerSchema,
  LAYER_TYPES,
  layerName,
  MAX_IMAGE_LAYERS,
  type ImageLayer,
  type ImageLayerType,
  type PositionedLayer,
} from './catalogImageTemplateLayers';
import {
  isLayerVisible,
  isTemplateLayerVisible,
  normalizeNamedPriceLayer,
  priceLayerMigration,
} from './catalogImageTemplateVisibility';

export * from './catalogImageTemplateFields';
export * from './catalogImageTemplateLayers';
export { isLayerVisible, isTemplateLayerVisible };
const templateLayerGroupSchema = z.object({
  ...layerName,
  name: z.string().trim().min(1, 'Informe o nome do agrupamento.').max(80),
  x: z.number().min(-3840).max(3840),
  y: z.number().min(-3840).max(3840),
  width: z.number().min(16).max(3840),
  height: z.number().min(16).max(3840),
  condition: conditionSchema.nullable().optional(),
  layerIds: z.array(z.uuid()).min(1).max(MAX_IMAGE_LAYERS - 1),
});
export type TemplateLayerGroup = z.infer<typeof templateLayerGroupSchema>;
const layoutSchema = z
  .object({
    layers: z.array(imageLayerSchema).min(1).max(MAX_IMAGE_LAYERS),
    groups: z.array(templateLayerGroupSchema).max(MAX_IMAGE_LAYERS - 1).optional(),
  })
  .refine(
    ({ layers }) => layers.some((layer) => layer.type === 'product'),
    'Mantenha pelo menos uma camada de produto.'
  )
  .refine(
    ({ layers }) => layers.at(-1)?.type === 'background',
    'Mantenha a camada de fundo fixa no final.'
  )
  .refine(
    ({ layers }) => layers.slice(0, -1).every((layer) => layer.type !== 'background'),
    'O fundo deve ficar por último.'
  )
  .refine(
    ({ layers }) => new Set(layers.map(({ id }) => id)).size === layers.length,
    'Há camadas repetidas.'
  )
  .superRefine(({ layers, groups }, context) => {
    const issue = templateGroupIssue(layers, groups);
    if (issue) context.addIssue({ code: 'custom', message: issue, path: ['groups'] });
  });
export type ImageLayout = z.infer<typeof layoutSchema>;
export const IMAGE_TEMPLATE_TEST_SCENARIO = 'image_template_crud' as const;
export const imageTemplateTestArtifactSchema = z
  .object({
    is_test: z.literal(true),
    runId: z.uuid(),
    ownerId: z.uuid(),
    scenarioKey: z.literal(IMAGE_TEMPLATE_TEST_SCENARIO),
  })
  .strict();
export type ImageTemplateTestArtifact = z.infer<typeof imageTemplateTestArtifactSchema>;
export const imageTemplateDesignSchema = z
  .object({
    version: z.literal(1),
    formats: z.object({
      '1:1': layoutSchema,
      '4:5': layoutSchema.optional(),
      '9:16': layoutSchema.optional(),
    }),
    testArtifact: imageTemplateTestArtifactSchema.optional(),
  })
  .refine((design) => templateAssetIds(design).length <= 12, 'Use até 12 imagens diferentes por modelo.')
  .refine(
    (design) =>
      Object.values(design.formats)
        .flatMap((layout) => layout?.layers ?? [])
        .reduce(
          (total, layer) =>
            total + ('imageMask' in layer && layer.imageMask ? JSON.stringify(layer.imageMask).length : 0),
          0
        ) <= 60_000,
    'Há muitos ajustes de máscara neste modelo.'
  );
export type ImageTemplateDesign = z.infer<typeof imageTemplateDesignSchema>;

export function normalizeLegacyCatalogLayers(design: unknown): unknown {
  if (typeof design !== 'object' || design === null) return design;
  const designRecord = design as Record<string, unknown>;
  if (typeof designRecord.formats !== 'object' || designRecord.formats === null) return design;
  const formats = Object.fromEntries(
    Object.entries(designRecord.formats as Record<string, unknown>).map(([format, layout]) => {
      if (typeof layout !== 'object' || layout === null) return [format, layout];
      const layoutRecord = layout as Record<string, unknown>;
      if (!Array.isArray(layoutRecord.layers)) return [format, layout];
      const layers = layoutRecord.layers.map((layer) => {
        if (typeof layer !== 'object' || layer === null || !('type' in layer)) return layer;
        if (layer.type === 'text' || layer.type === 'sticker') {
          return normalizeNamedPriceLayer({ ...layer } as Record<string, unknown>);
        }
        if (layer.type !== 'catalog' || !('field' in layer)) return layer;
        const field = fieldSchema.safeParse(layer.field);
        if (!field.success) return layer;
        const textLayer = { ...layer } as Record<string, unknown>;
        delete textLayer.field;
        const migration = priceLayerMigration(textLayer.name);
        const targetField = migration?.field ?? field.data;
        const name =
          migration?.name ??
          (textLayer.name === 'Campo do produto' ? templateFieldLabel(field.data) : textLayer.name);
        return normalizeNamedPriceLayer(
          { ...textLayer, name, type: 'text', text: `{{product.${targetField}}}` },
          migration
        );
      });
      const imageFormat = IMAGE_FORMATS.includes(format as ImageFormat) ? (format as ImageFormat) : '1:1';
      return [
        format,
        { ...layoutRecord, layers: pinBackgroundToBottom(layers as ImageLayer[], imageFormat) },
      ];
    })
  );
  return { ...designRecord, formats };
}
export const imageTemplateMetadataSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do modelo.').max(100),
  description: z.string().trim().max(400, 'Use até 400 caracteres.'),
});
export const deleteImageTemplateSchema = z.object({
  id: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
  test_artifact: imageTemplateTestArtifactSchema.optional(),
});
export type DeleteImageTemplateValues = z.infer<typeof deleteImageTemplateSchema>;
export const imageTemplateFormSchema = imageTemplateMetadataSchema.extend({
  design: imageTemplateDesignSchema,
});
export type ImageTemplateFormValues = z.infer<typeof imageTemplateFormSchema>;

export const IMAGE_TEMPLATE_STARTERS = [
  'blank',
  'showcase',
  'frame',
  'offer',
  'banner',
  'details',
] as const;
export type ImageTemplateStarter = (typeof IMAGE_TEMPLATE_STARTERS)[number];
export const imageTemplateStartSchema = imageTemplateMetadataSchema.extend({
  starter: z.enum(IMAGE_TEMPLATE_STARTERS),
});

export function createImageLayer(type: ImageLayerType, format: ImageFormat): ImageLayer {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const identity = { id: crypto.randomUUID(), name: LAYER_TYPES[type].label };
  const box = {
    ...identity,
    x: 54,
    y: Math.round(height * 0.1),
    width: width - 108,
    height: 140,
    angle: 0,
    opacity: 100,
  };
  const text = {
    font: 'Verdana',
    fontSize: 54,
    color: '#172033',
    bold: true,
    italic: false,
    underline: false,
    strike: false,
    textEffect: 'none',
    textEffectSize: 6,
    textShadowColor: '#000000',
    textShadowOpacity: 56,
    textOutlineColor: '#ffffff',
    text3dColor: '#172033',
    text3dDirection: 'down-right',
    textNeonColor: '#00e5ff',
    align: 'center',
    verticalAlign: 'middle',
    lineSpacing: 1.16,
    letterSpacing: 0,
    textOpacity: 100,
  } as const;
  switch (type) {
    case 'product':
      return {
        ...box,
        type,
        x: 0,
        y: 0,
        width,
        height,
        condition: null,
        imageIndex: 0,
        fallback: 'main',
        fit: 'contain',
        removeBackground: false,
      };
    case 'text':
      return { ...box, ...text, type, text: 'Seu texto', condition: null };
    case 'image':
      return { ...box, type, width: 324, height: 250, assetId: null, fit: 'contain', condition: null };
    case 'sticker':
      return {
        ...box,
        ...text,
        type,
        x: 758,
        width: 260,
        height: 260,
        fontSize: 44,
        angle: 0,
        opacity: 100,
        condition: null,
        text: 'Oferta',
        color: '#ffffff',
        fill: '#2457da',
        fillOpacity: 100,
        lockAspectRatio: false,
        shape: 'circle',
      };
    case 'background':
      return { ...identity, type, color: '#ffffff', opacity: 100 };
  }
}

function isBackgroundLayer(
  layer: unknown
): layer is Extract<ImageLayer, { type: 'background' }> {
  return typeof layer === 'object' && layer !== null && 'type' in layer && layer.type === 'background';
}

function pinBackgroundToBottom(layers: ImageLayer[], format: ImageFormat): ImageLayer[] {
  const background =
    [...layers].reverse().find(isBackgroundLayer) ?? createImageLayer('background', format);
  return [...layers.filter((layer) => !isBackgroundLayer(layer)), background];
}

export function startImageTemplate(starter: ImageTemplateStarter): ImageTemplateDesign {
  const product = createImageLayer('product', '1:1') as Extract<ImageLayer, { type: 'product' }>;
  const background = createImageLayer('background', '1:1') as Extract<
    ImageLayer,
    { type: 'background' }
  >;
  const title = {
    ...(createImageLayer('text', '1:1') as Extract<ImageLayer, { type: 'text' }>),
    name: 'Nome do produto',
    text: '{{product.name}}',
    y: 835,
    height: 110,
    fontSize: 48,
  };
  const price = {
    ...title,
    id: crypto.randomUUID(),
    name: 'Preço Atual',
    text: '{{product.currentPrice}}',
    y: 952,
    height: 78,
    color: '#1b5bcb',
  };
  let layers: ImageLayer[] = [product];
  switch (starter) {
    case 'showcase':
      layers = [
        title,
        { ...product, x: 90, y: 70, width: 900, height: 740 },
        { ...background, color: '#e7efff' },
      ];
      break;
    case 'frame':
      layers = [{ ...product, x: 60, y: 60, width: 960, height: 960 }, { ...background, color: '#dbebfe' }];
      break;
    case 'offer':
      layers = [
        createImageLayer('sticker', '1:1'),
        price,
        { ...product, x: 55, y: 125, width: 970, height: 780 },
        { ...background, color: '#fff6e5' },
      ];
      break;
    case 'banner': {
      const banner = createImageLayer('sticker', '1:1') as Extract<ImageLayer, { type: 'sticker' }>;
      layers = [
        {
          ...banner,
          x: 0,
          y: 878,
          width: 1080,
          height: 202,
          fontSize: 54,
          shape: 'rectangle',
          text: 'Móveis Morante',
        },
        { ...product, height: 865 },
      ];
      break;
    }
    case 'details':
      layers = [
        { ...title, x: 48, y: 275, width: 428, height: 235, align: 'left' },
        { ...price, x: 48, y: 538, width: 428, align: 'left' },
        { ...product, x: 498, y: 75, width: 550, height: 930 },
        { ...background, color: '#ecf6ee' },
      ];
      break;
  }
  layers = pinBackgroundToBottom(layers, '1:1');
  return { version: 1, formats: { '1:1': { layers } } };
}

export function copyImageLayerToFormat(
  layer: ImageLayer,
  source: ImageFormat,
  target: ImageFormat
): ImageLayer {
  const ratio = FORMAT_DIMENSIONS[target].height / FORMAT_DIMENSIONS[source].height;
  if (layer.type === 'background') return { ...layer };
  const keepBoxHeight =
    layer.type === 'image' ||
    (layer.type === 'sticker' && (layer.shape !== 'rectangle' || !!layer.lockAspectRatio));
  return {
    ...layer,
    y: Math.max(-3840, Math.min(3840, Math.round(layer.y * ratio))),
    height: keepBoxHeight ? layer.height : Math.max(16, Math.min(3840, Math.round(layer.height * ratio))),
  };
}

export function copyImageLayout(
  layout: ImageLayout,
  source: ImageFormat,
  target: ImageFormat
): ImageLayout {
  const ratio = FORMAT_DIMENSIONS[target].height / FORMAT_DIMENSIONS[source].height;
  const layers = layout.layers.map((layer) => copyImageLayerToFormat(layer, source, target));
  const groups = layout.groups?.map((group) => {
    const scaled = {
      ...group,
      y: Math.max(-3840, Math.min(3840, Math.round(group.y * ratio))),
      height: Math.max(16, Math.min(3840, Math.round(group.height * ratio))),
    };
    const members = layers.filter(
      (layer): layer is PositionedLayer => layer.type !== 'background' && group.layerIds.includes(layer.id)
    );
    return { ...scaled, ...templateBoundsUnion([scaled, ...members.map(templateLayerBounds)]) };
  });
  return { ...layout, layers: pinBackgroundToBottom(layers, target), ...(groups ? { groups } : {}) };
}

export function templateAssetIds(design: {
  formats: Partial<Record<ImageFormat, ImageLayout>>;
}): string[] {
  return [
    ...new Set(
      Object.values(design.formats).flatMap(
        (layout) =>
          layout?.layers.flatMap((layer) => (layer.type === 'image' && layer.assetId ? [layer.assetId] : [])) ??
          []
      )
    ),
  ];
}
