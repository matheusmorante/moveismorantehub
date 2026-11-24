import { z } from 'zod';
import { imageFilesFormSchema } from './fileFormSchemas';

export const productImageCropUploadFormSchema = z.object({ file: imageFilesFormSchema.shape.files.element, oldUrl: z.string().min(1, 'A foto de origem não foi identificada.') });
export const createProductImageCropSourceFormSchema = (availableImageUrls: readonly string[]) =>
  z.object({ oldUrl: productImageCropUploadFormSchema.shape.oldUrl })
    .superRefine(({ oldUrl }, context) => {
      if (!availableImageUrls.includes(oldUrl)) {
        context.addIssue({
          code: 'custom',
          path: ['oldUrl'],
          message: 'A foto de origem mudou. Reabra o recorte.',
        });
      }
    });
export const productImageReplacementFormSchema = productImageCropUploadFormSchema.pick({ oldUrl: true }).extend({ newUrl: z.url('A imagem enviada não foi confirmada.').refine((url) => url.startsWith('https://'), 'A imagem enviada precisa de endereço HTTPS.') });

export const mobileProductPhotoUploadFormSchema = z.object({
  photos: z.array(z.object({
    file: z.custom<Blob>((file) => typeof Blob !== 'undefined' && file instanceof Blob && file.size > 0, 'Selecione uma imagem válida.'),
    name: z.string().min(1, 'Informe o nome da imagem.'),
    contentType: z.string().startsWith('image/', 'Selecione um arquivo de imagem.'),
    sourceUri: z.string()
      .regex(
        /^(?:https?:\/\/|file:\/\/|content:\/\/|ph:\/\/|assets-library:\/\/|blob:|data:image\/)/i,
        'A origem temporária da imagem é inválida.'
      )
      .optional(),
  })).min(1, 'Selecione ao menos uma imagem.'),
});

export const mobileProductPhotoUrlsFormSchema = z.object({
  urls: z.array(z.url('O serviço não retornou um endereço de imagem válido.')
    .refine((url) => url.startsWith('https://'), 'As fotos do produto precisam de endereço HTTPS.'))
    .min(1, 'O serviço não confirmou o envio de nenhuma foto.'),
});

export const createVariationImageSelectionFormSchema = (parentImages: readonly string[], maxSelection: number) =>
  z.object({
    images: z.array(z.string().min(1, 'Selecione uma foto válida.'))
      .max(maxSelection, `Selecione no máximo ${maxSelection} fotos.`),
  }).superRefine(({ images }, context) => {
    if (images.some((image) => !parentImages.includes(image))) {
      context.addIssue({ code: 'custom', path: ['images'], message: 'Selecione apenas fotos disponíveis no produto pai.' });
    }
    if (new Set(images).size !== images.length) {
      context.addIssue({ code: 'custom', path: ['images'], message: 'Uma foto não pode ser vinculada duas vezes.' });
    }
  });

/** Validates edits to an existing gallery without requiring legacy URLs to remain in the parent gallery. */
export const createVariationImageListEditFormSchema = (maxSelection: number) =>
  z.object({
    images: z.array(z.string().min(1, 'Selecione uma foto válida.'))
      .max(maxSelection, `Selecione no máximo ${maxSelection} fotos.`),
  }).superRefine(({ images }, context) => {
    if (new Set(images).size !== images.length) {
      context.addIssue({ code: 'custom', path: ['images'], message: 'Uma foto não pode ser vinculada duas vezes.' });
    }
  });
