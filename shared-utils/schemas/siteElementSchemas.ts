import { z } from 'zod';
import { CAROUSEL_BANNER_IMAGES, CAROUSEL_BANNER_VARIANTS, LEGACY_CAROUSEL_IMAGE } from '../siteElementDimensions';

export const SITE_ELEMENT_KINDS = ['carousel', 'top_bar'] as const;
export type SiteElementKind = (typeof SITE_ELEMENT_KINDS)[number];
export const SITE_ELEMENT_CONFIG = {
  carousel: {
    label: 'Carrossel de imagens',
    description: 'Modelos para o carrossel principal do catálogo digital.',
    width: CAROUSEL_BANNER_IMAGES.desktop.width,
    height: CAROUSEL_BANNER_IMAGES.desktop.height,
    icon: 'bi-images',
  },
  top_bar: {
    label: 'Barra de avisos',
    description: 'Avisos em texto, responsivos e com estilo configurável.',
    icon: 'bi-view-stacked',
  },
} as const;

export const SITE_ANNOUNCEMENT_FONT_WEIGHTS = ['400', '500', '600', '700'] as const;
export const SITE_ANNOUNCEMENT_FONT_SIZES = ['12', '14', '16', '18', '20'] as const;
export const SITE_ANNOUNCEMENT_MAX_LENGTH = 240;
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

export const SITE_ELEMENT_LINK_MAX_LENGTH = 2048;
export const siteElementLinkSchema = z.string().trim()
  .max(SITE_ELEMENT_LINK_MAX_LENGTH, 'Use no máximo 2048 caracteres no link.')
  .refine((link) => {
    if (!link) return true;
    if (/[\s\\\p{Cc}]/u.test(link)) return false;
    if (/^\/(?!\/)/.test(link)) return true;
    if (!/^https?:\/\/[^/?#@]+([/?#]|$)/i.test(link)) return false;
    try {
      const url = new URL(link);
      return !!url.hostname && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Informe um caminho que comece com / ou um endereço HTTP ou HTTPS válido.');

export const siteElementCarouselFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do modelo.').max(100, 'Use no máximo 100 caracteres no nome.'),
  kind: z.literal('carousel'),
  linkUrl: siteElementLinkSchema.optional(),
  file: siteElementImageFileSchema.nullable(),
  existingImagePath: z.string().nullable(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  mobile: optionalImageVariantSchema.default({ file: null, existingImagePath: null, width: 0, height: 0 }),
  tablet: optionalImageVariantSchema.default({ file: null, existingImagePath: null, width: 0, height: 0 }),
}).superRefine((value, context) => {
  const legacy = !value.file && !!value.existingImagePath
    && value.width === LEGACY_CAROUSEL_IMAGE.width && value.height === LEGACY_CAROUSEL_IMAGE.height
    && !value.mobile.file && !value.mobile.existingImagePath && !value.tablet.file && !value.tablet.existingImagePath;
  if (legacy) return;

  for (const variant of CAROUSEL_BANNER_VARIANTS) {
    const image = variant === 'desktop' ? value : value[variant];
    const target = CAROUSEL_BANNER_IMAGES[variant];
    const path = variant === 'desktop' ? ['file'] : [variant, 'file'];
    const label = target.label.toLowerCase();
    if (!image.file && !image.existingImagePath) {
      context.addIssue({ code: 'custom', path, message: `Selecione a imagem para ${label}.` });
    } else if (image.width !== target.width || image.height !== target.height) {
      context.addIssue({ code: 'custom', path, message: `A imagem para ${label} deve ter ${target.width} × ${target.height} px.` });
    }
  }
});

const localDateTimeSchema = z.string().refine((value) => {
  if (!value) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === Number(match[1])
    && date.getMonth() + 1 === Number(match[2])
    && date.getDate() === Number(match[3])
    && date.getHours() === Number(match[4])
    && date.getMinutes() === Number(match[5]);
}, 'Informe uma data e hora válidas.');

export const siteElementAnnouncementFormSchema = z.object({
  kind: z.literal('top_bar'),
  message: z.string().trim().min(1, 'Informe o texto do aviso.')
    .max(SITE_ANNOUNCEMENT_MAX_LENGTH, `Use no máximo ${SITE_ANNOUNCEMENT_MAX_LENGTH} caracteres.`),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Informe uma cor hexadecimal válida.'),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Informe uma cor hexadecimal válida.'),
  fontWeight: z.enum(SITE_ANNOUNCEMENT_FONT_WEIGHTS),
  fontSizePx: z.enum(SITE_ANNOUNCEMENT_FONT_SIZES),
  startsAt: localDateTimeSchema,
  endsAt: localDateTimeSchema,
}).superRefine((value, context) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
    context.addIssue({ code: 'custom', path: ['endsAt'], message: 'O fim deve ser posterior ao início.' });
  }
});

export const siteElementModelFormSchema = z.discriminatedUnion('kind', [
  siteElementCarouselFormSchema,
  siteElementAnnouncementFormSchema,
]);

export const siteElementDeleteFormSchema = z.object({
  id: z.uuid('Modelo não identificado.'),
  kind: z.enum(SITE_ELEMENT_KINDS),
});

export const siteElementActivationFormSchema = siteElementDeleteFormSchema.pick({ id: true, kind: true }).extend({
  active: z.boolean(),
  updated_at: z.iso.datetime({ offset: true, error: 'Atualize a lista antes de alterar o status do modelo.' }),
});

export type SiteElementModelFormValues = z.output<typeof siteElementModelFormSchema>;
export type SiteElementCarouselFormValues = z.output<typeof siteElementCarouselFormSchema>;
export type SiteElementAnnouncementFormValues = z.output<typeof siteElementAnnouncementFormSchema>;
export type SiteElementActivationFormValues = z.output<typeof siteElementActivationFormSchema>;
