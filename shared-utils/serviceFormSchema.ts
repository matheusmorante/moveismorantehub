import { z } from 'zod';

const unitPrice = z.number().nonnegative('O preço de venda não pode ser negativo.');
const costPrice = z.number().nonnegative('O preço de custo não pode ser negativo.');
const fiscalTreatment = z.object({
  nfeComposition: z.enum(['not_reviewed', 'include_with_merchandise', 'separate_document']).default('not_reviewed'),
  incorporationConfirmed: z.boolean().default(false),
  validationReference: z.string().trim().max(500, 'A referência da validação deve ter até 500 caracteres.').default(''),
  validatedAt: z.string().optional(),
  validatedBy: z.string().optional(),
}).superRefine((value, context) => {
  if (value.nfeComposition !== 'include_with_merchandise') return;
  if (!value.incorporationConfirmed) {
    context.addIssue({ code: 'custom', path: ['incorporationConfirmed'], message: 'Confirme que a validação fiscal permite incorporar este serviço ao valor da mercadoria.' });
  }
  if (value.validationReference.length < 10) {
    context.addIssue({ code: 'custom', path: ['validationReference'], message: 'Informe a referência da validação fiscal (mínimo de 10 caracteres).' });
  }
});
const fiscalTreatmentDraft = z.object({
  nfeComposition: z.enum(['not_reviewed', 'include_with_merchandise', 'separate_document']).optional(),
  incorporationConfirmed: z.boolean().optional(),
  validationReference: z.string().max(500).optional(),
  validatedAt: z.string().optional(),
  validatedBy: z.string().optional(),
});

export const serviceFormSchema = z.object({
  description: z.string().trim().min(1, 'A descrição é obrigatória.'),
  unitPrice: unitPrice.default(0),
  costPrice: costPrice.optional(),
  active: z.boolean().default(true),
  fiscalTreatment: fiscalTreatment.default({ nfeComposition: 'not_reviewed', incorporationConfirmed: false, validationReference: '' }),
});

// An incomplete service draft is different from finalizing a catalog service.
export const serviceDraftSchema = z.object({
  description: z.string().optional(),
  unitPrice: unitPrice.optional(), costPrice: costPrice.optional(), active: z.boolean().optional(),
  fiscalTreatment: fiscalTreatmentDraft.optional(),
});
export const servicePatchSchema = serviceDraftSchema.extend({
  isDraft: z.boolean().optional(), deleted: z.boolean().optional(),
});
