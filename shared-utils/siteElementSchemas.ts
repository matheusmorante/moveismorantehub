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
    description: 'Modelos para a faixa de destaque no topo do catálogo digital.',
    width: 1920,
    height: 80,
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

export const siteElementModelFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do modelo.').max(100, 'Use no máximo 100 caracteres no nome.'),
  kind: z.enum(SITE_ELEMENT_KINDS),
  file: siteElementImageFileSchema.nullable(),
  existingImagePath: z.string().nullable(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
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
});

export const siteElementDeleteFormSchema = z.object({
  id: z.uuid('Modelo não identificado.'),
  kind: z.enum(SITE_ELEMENT_KINDS),
});

export type SiteElementModelFormValues = z.output<typeof siteElementModelFormSchema>;
