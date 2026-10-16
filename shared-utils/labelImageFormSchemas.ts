import { z } from 'zod';
import { imageFilesFormSchema } from './fileFormSchemas';
import { labelAssetFormSchema } from './labelDesignFormSchemas';

export const labelImageQueryFormSchema = z.object({ sort: z.enum(['newest', 'oldest']) });
export const labelImageUploadFormSchema = imageFilesFormSchema.extend({ name: labelAssetFormSchema.shape.name, category: z.enum(['identificacao', 'precos', 'logos', 'posts']) });
export const labelImageCreateFormSchema = labelAssetFormSchema.extend({ category: z.enum(['identificacao', 'precos', 'logos', 'posts']) });
const imageId = z.number().int().positive('Imagem não identificada.');
export const labelImageDeleteFormSchema = z.object({ id: imageId });
export const labelImageSelectionFormSchema = labelImageDeleteFormSchema.extend({ image: z.string().min(1, 'Imagem indisponível.') });
export const labelLocalImageUploadFormSchema = imageFilesFormSchema.extend({ category: labelImageCreateFormSchema.shape.category.nullable() });
export const labelQueueImageUploadFormSchema = imageFilesFormSchema.extend({ index: z.number().int().nonnegative('Etiqueta não identificada.'), blank: z.boolean() });
export const labelSampleImageFormSchema = z.discriminatedUnion('action', [
  imageFilesFormSchema.extend({ action: z.literal('upload') }),
  z.object({ action: z.literal('clear'), image: z.string().min(1, 'Não há amostra para limpar.') }),
]);
// Reading the historical library preserves older category names and metadata.
export const labelImageRecordSchema = labelAssetFormSchema.extend({ id: imageId, category: z.string().min(1) }).passthrough();

export class LabelImageUnconfirmedError extends Error {
  readonly uncertain = true;
  constructor() { super('Não foi possível confirmar a alteração. Recarregue a biblioteca antes de repetir.'); }
}
