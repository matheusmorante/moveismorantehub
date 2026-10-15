import { z } from 'zod';

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
