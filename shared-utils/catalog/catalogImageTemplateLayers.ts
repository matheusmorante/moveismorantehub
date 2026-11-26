import { z } from 'zod';
import { MAX_PARENT_PRODUCT_IMAGES } from '../products/images/productImageLimits';
import { conditionSchema } from './catalogImageTemplateFields';

export const IMAGE_TEMPLATE_FONTS = [
  'Bowlby One',
  'Noto Sans',
  'Noto Serif',
  'Open Sans',
  'Optimistic',
  'Optimistic Condensed',
  'Optimistic Dark Mode',
  'Oswald',
  'Playfair Display',
  'Poppins',
  'Quicksand',
  'Raleway',
  'Roboto',
  'Verdana',
  'Work Sans',
] as const;
const legacyImageTemplateFonts = [
  'Arial',
  'Georgia',
  'Tahoma',
  'Trebuchet MS',
  'Times New Roman',
  'Courier New',
] as const;
const imageTemplateFontSchema = z.enum([...IMAGE_TEMPLATE_FONTS, ...legacyImageTemplateFonts]);
const color = z.string().regex(/^#[\da-f]{6}$/i);
export const IMAGE_TEXT_EFFECTS = ['none', 'shadow', 'outline', '3d', 'neon'] as const;
export type ImageTextEffect = (typeof IMAGE_TEXT_EFFECTS)[number];
export const TEXT_3D_DIRECTIONS = [
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
] as const;
export type Text3dDirection = (typeof TEXT_3D_DIRECTIONS)[number];
export const layerName = { id: z.uuid(), name: z.string().trim().min(1).max(80) };
const position = {
  ...layerName,
  x: z.number().min(-3840).max(3840),
  y: z.number().min(-3840).max(3840),
  width: z.number().min(16).max(3840),
  height: z.number().min(16).max(3840),
  angle: z.number().min(-180).max(180),
  opacity: z.number().min(0).max(100),
};
const typography = {
  font: imageTemplateFontSchema,
  fontSize: z.number().int().min(8).max(240),
  color,
  bold: z.boolean(),
  italic: z.boolean(),
  strike: z.boolean(),
  align: z.enum(['left', 'center', 'right']),
  underline: z.boolean().optional(),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  lineSpacing: z.number().min(0.5).max(3).optional(),
  letterSpacing: z.number().min(-20).max(100).optional(),
  textOpacity: z.number().min(0).max(100).optional(),
  textEffect: z.enum(IMAGE_TEXT_EFFECTS).optional(),
  textEffectSize: z.number().int().min(1).max(32).optional(),
  textShadowColor: color.optional(),
  textShadowOpacity: z.number().int().min(0).max(100).optional(),
  textOutlineColor: color.optional(),
  text3dColor: color.optional(),
  textNeonColor: color.optional(),
  text3dDirection: z.enum(TEXT_3D_DIRECTIONS).optional(),
  text3dAngle: z.number().int().min(0).max(359).optional(),
  textShadow: z.boolean().optional(),
};
const condition = { condition: conditionSchema.nullable() };
export const TEMPLATE_ASSET_ID = /^[a-f0-9]{64}$/;
const maskStrokeSchema = z.object({
  mode: z.enum(['erase', 'restore']),
  size: z.number().int().min(1).max(100),
  points: z
    .array(z.tuple([z.number().int().min(0).max(1000), z.number().int().min(0).max(1000)]))
    .min(1)
    .max(160),
});
const maskStrokesSchema = z.array(maskStrokeSchema).min(1).max(30);
export const imageMaskEditSchema = z.object({ strokes: z.array(maskStrokeSchema).max(30) });
const imageMaskSchema = z.object({
  photoKey: z.string().regex(TEMPLATE_ASSET_ID),
  strokes: maskStrokesSchema,
});
export type ImageMaskStroke = z.infer<typeof maskStrokeSchema>;
export type ImageMaskCorrection = z.infer<typeof imageMaskSchema>;
export const imageLayerSchema = z.discriminatedUnion('type', [
  z.object({
    ...position,
    type: z.literal('product'),
    condition: conditionSchema.nullable().optional(),
    imageIndex: z.number().int().min(0).max(MAX_PARENT_PRODUCT_IMAGES - 1),
    fallback: z.enum(['main', 'none']),
    fit: z.enum(['contain', 'cover']),
    removeBackground: z.boolean(),
    imageMask: imageMaskSchema.optional(),
  }),
  z.object({
    ...position,
    ...typography,
    ...condition,
    type: z.literal('text'),
    text: z.string().max(700),
  }),
  z.object({
    ...position,
    ...condition,
    type: z.literal('image'),
    assetId: z.string().regex(TEMPLATE_ASSET_ID).nullable(),
    assetName: z.string().trim().max(120).optional(),
    fit: z.enum(['contain', 'cover']),
    removeBackground: z.boolean().optional(),
    imageMask: imageMaskSchema.optional(),
  }),
  z.object({
    ...position,
    ...typography,
    condition: conditionSchema.nullable().optional(),
    type: z.literal('sticker'),
    text: z.string().max(700),
    fill: color,
    fillOpacity: z.number().min(0).max(100).optional(),
    lockAspectRatio: z.boolean().optional(),
    shape: z.enum(['rectangle', 'square', 'circle']),
  }),
  z.object({
    ...layerName,
    type: z.literal('background'),
    color,
    opacity: z.number().min(0).max(100).default(100),
  }),
]);
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type PositionedLayer = Exclude<ImageLayer, { type: 'background' }>;
export type ImageLayerType = ImageLayer['type'];
export const LAYER_TYPES: Record<ImageLayerType, { label: string; icon: string }> = {
  product: { label: 'Produto', icon: 'bi-tag' },
  text: { label: 'Texto', icon: 'bi-type' },
  image: { label: 'Imagem importada', icon: 'bi-image' },
  sticker: { label: 'Forma', icon: 'bi-sticky' },
  background: { label: 'Fundo', icon: 'bi-palette' },
};
export const MAX_IMAGE_LAYERS = 21;
