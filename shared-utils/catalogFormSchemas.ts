import { z } from 'zod';

export const catalogNameFormSchema = z.object({
  name: z.string().refine((value) => Boolean(value.trim()), 'Informe o nome.'),
});

export const productReferenceFormSchema = z.object({
  masterName: z.string().refine((value) => Boolean(value.trim()), 'Selecione o produto principal.'),
  referenceName: z.string().refine((value) => Boolean(value.trim()), 'Informe a referência.'),
});
