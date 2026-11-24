import { z } from 'zod';

export const SITE_ELEMENT_KINDS = ['carousel', 'top_bar'] as const;
export type SiteElementKind = (typeof SITE_ELEMENT_KINDS)[number];
export const SITE_ELEMENT_CONFIG = {
  carousel: {
    label: 'Carrossel de imagens',
    description: 'Modelos para o carrossel principal do catálogo digital.',
    width: 1920,
    height: 620,
    icon: 'bi-images',
  },
  top_bar: {
    label: 'Barra de destaque do topo',
    description: 'Modelo exibido somente em telas desktop.',
    width: 2880,
    height: 720,
    responsive: {
      mobile: { label: 'Celular', width: 900, height: 600, maxViewport: 639 },
      tablet: { label: 'Tablet', width: 1600, height: 600, minViewport: 640, maxViewport: 1023 },
      desktop: { label: 'Desktop', width: 2880, height: 720, minViewport: 1024 },
    },
    icon: 'bi-view-stacked',
  },
} as const;

export const SITE_ELEMENT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const SITE_ELEMENT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const siteElementImageFileSchema = z.custom<File>(
  (value) => typeof File !== 'undefined' && value instanceof File,
  'Selecione um arquivo de imagem.',
).refine((file) => SITE_ELEMENT_IMAGE_TYPES.includes(file.type as typeof SITE_ELEMENT_IMAGE_TYPES[number]),
  'Use uma imagem PNG, JPG ou WebP.')
  .refine((file) => file.size > 0 && file.size <= SITE_ELEMENT_MAX_FILE_BYTES,
    'A imagem deve ter conteúdo e no máximo 5 MB.')
  .refine((file) => file.name.length <= 255, 'O nome do arquivo deve ter no máximo 255 caracteres.');

const optionalImageVariantSchema = z.object({
  file: siteElementImageFileSchema.nullable().default(null),
  existingImagePath: z.string().nullable().default(null),
  width: z.number().int().nonnegative().default(0),
  height: z.number().int().nonnegative().default(0),
});

export const siteElementModelFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do modelo.').max(100, 'Use no máximo 100 caracteres no nome.'),
  kind: z.enum(SITE_ELEMENT_KINDS),
  file: siteElementImageFileSchema.nullable(),
  existingImagePath: z.string().nullable(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  mobile: optionalImageVariantSchema.default({ file: null, existingImagePath: null, width: 0, height: 0 }),
  tablet: optionalImageVariantSchema.default({ file: null, existingImagePath: null, width: 0, height: 0 }),
}).superRefine((value, context) => {
  if (!value.file && !value.existingImagePath) {
    context.addIssue({ code: 'custom', path: ['file'], message: 'Selecione a imagem do modelo.' });
  }
  const config = SITE_ELEMENT_CONFIG[value.kind];
  if (value.width !== config.width || value.height !== config.height) {
    context.addIssue({
      code: 'custom', path: ['file'],
      message: `A imagem deve ter exatamente ${config.width} × ${config.height} px.`,
    });
  }
  if (value.kind === 'top_bar') {
    for (const variant of ['mobile', 'tablet'] as const) {
      const target = SITE_ELEMENT_CONFIG.top_bar.responsive[variant];
      const image = value[variant];
      const hasImage = !!image.file || !!image.existingImagePath;
      if (hasImage && (image.width !== target.width || image.height !== target.height)) {
        context.addIssue({ code: 'custom', path: [variant, 'file'], message: `A imagem para ${target.label.toLowerCase()} deve ter ${target.width} × ${target.height} px.` });
      }
    }
  } else if (value.mobile.file || value.mobile.existingImagePath || value.tablet.file || value.tablet.existingImagePath) {
    context.addIssue({ code: 'custom', path: ['kind'], message: 'As imagens responsivas são exclusivas da barra de destaque.' });
  }
});

export const siteElementDeleteFormSchema = z.object({
  id: z.uuid('Modelo não identificado.'),
  kind: z.enum(SITE_ELEMENT_KINDS),
});

export type SiteElementModelFormValues = z.output<typeof siteElementModelFormSchema>;
