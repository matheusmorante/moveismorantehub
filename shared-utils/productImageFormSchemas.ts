import { z } from 'zod';
import { imageFilesFormSchema } from './fileFormSchemas';

export const productImageCropUploadFormSchema = z.object({ file: imageFilesFormSchema.shape.files.element, oldUrl: z.string().min(1, 'A foto de origem não foi identificada.') });
export const productImageReplacementFormSchema = productImageCropUploadFormSchema.pick({ oldUrl: true }).extend({ newUrl: z.url('A imagem enviada não foi confirmada.').refine((url) => url.startsWith('https://'), 'A imagem enviada precisa de endereço HTTPS.') });

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
