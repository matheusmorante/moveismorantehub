import { z } from 'zod';
import { labelGridModelDraftFormSchema, labelGridModelFormSchema } from './labelDesignFormSchemas';

const layoutId = z.string().trim().min(1, 'Selecione o modelo.');
const paperSize = z.string().pipe(z.enum(['A4', 'A3', 'A5', 'Letter', 'Custom'], { error: 'Selecione um papel válido.' }));
const checkPaper = (value: { paperSize: string; paperWidth?: number; paperHeight?: number }, context: z.RefinementCtx) => {
  if (value.paperSize !== 'Custom') return;
  for (const field of ['paperWidth', 'paperHeight'] as const) if (!(Number(value[field]) > 0)) context.addIssue({ code: 'custom', path: [field], message: 'Informe uma dimensão positiva para o papel personalizado.' });
};
export const labelGridModelSaveFormSchema = labelGridModelFormSchema.extend({ paperSize }).superRefine(checkPaper);
export const labelLayoutDeleteFormSchema = z.object({ id: layoutId });
export const labelLayoutPreferenceFormSchema = z.object({ roundId: layoutId, rectId: layoutId });
export const labelLayoutDefaultFormSchema = z.object({ modelId: layoutId, category: z.string().pipe(z.enum(['identificacao', 'precos', 'logos', 'posts'])), type: z.enum(['rect', 'round']) });
export const labelRemoteLayoutDraftSchema = labelGridModelDraftFormSchema.extend({ paperSize, category: labelGridModelDraftFormSchema.shape.category.unwrap() }).superRefine(checkPaper);
export const labelRemoteLayoutRecordSchema = labelGridModelFormSchema.extend({ id: layoutId });
export const labelLayoutDuplicateFormSchema = z.object({ model: labelRemoteLayoutRecordSchema });
export const labelLayoutCopyFormSchema = labelLayoutDuplicateFormSchema.extend({
  category: z.enum(['identificacao', 'precos', 'logos', 'posts']),
}).refine((value) => value.model.type !== 'round' || value.category === 'logos', {
  path: ['category'], message: 'Modelos redondos só podem ser copiados para Logos e Rótulos.',
});
export class LabelLayoutUnconfirmedError extends Error {
  readonly uncertain = true;
  constructor() { super('A alteração do modelo não foi confirmada. Recarregue e confira os modelos antes de repetir.'); }
}
