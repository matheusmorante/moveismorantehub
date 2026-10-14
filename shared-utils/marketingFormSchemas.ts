import { z } from 'zod';

const requiredText = z.string().refine((value) => Boolean(value.trim()), 'Preencha este campo.');
export const marketingAssetFormSchema = z.object({ name: requiredText, url: z.url('Informe uma URL válida.') });
export const postModelFormSchema = z.object({ name: requiredText, prompt: requiredText, format: z.enum(['4:5', '9:16']) });
export const postElementModelFormSchema = z.object({
  name: requiredText, prompt: z.string(), elementType: z.string(), opportunityId: z.string(),
}).superRefine((value, ctx) => {
  if (value.elementType === 'BADGE' && !value.opportunityId) {
    ctx.addIssue({ code: 'custom', path: ['opportunityId'], message: 'Selecione a oportunidade.' });
  }
});
