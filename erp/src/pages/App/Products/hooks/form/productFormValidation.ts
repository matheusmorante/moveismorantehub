import { z } from 'zod';
import type Product from '@/pages/types/product.type';
import { getVariationRegistrationIssue } from '../../domain/variationRegistrationRules';

export type ProductFormValidationResult = {
  errors: Record<string, boolean>;
  invalidVariation?: {
    variation: NonNullable<Product['variations']>[number];
    issue: NonNullable<ReturnType<typeof getVariationRegistrationIssue>>;
  };
};

export interface ProductFormValidationOptions {
  isStockistOnly: boolean;
  saveAsDraft: boolean;
}

/**
 * Schema Zod usado pelo formulário real de produto.
 * Garante que produtos de teste e submissões reais obedeçam ao mesmo contrato estrito.
 */
export const createProductFormSchema = (options: ProductFormValidationOptions) => {
  return z
    .object({
      name: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
      marketplaceTitle: z.string().optional().nullable(),
      itemType: z.string().optional().nullable(),
      productKind: z.string().optional().nullable(),
      opportunityId: z.string().optional().nullable(),
      hasVariations: z.boolean().optional(),
      categoryIds: z.array(z.string()).optional().nullable(),
      fiscal: z
        .object({
          ncm: z.string().optional().nullable(),
          merchandiseOrigin: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
      merchandiseOrigin: z.string().optional().nullable(),
      isOwnProduction: z.boolean().optional().nullable(),
      mainSupplierId: z.string().optional().nullable(),
      supplierId: z.string().optional().nullable(),
      variations: z.array(z.any()).optional().nullable(),
    })
    .superRefine((data, ctx) => {
      const enteredName = (data.name || data.title || data.marketplaceTitle || '').trim();
      if (!enteredName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O nome do produto é obrigatório.',
          path: ['name'],
        });
      }

      if (options.saveAsDraft) {
        return;
      }

      const validProductKinds = ['normal', 'salvado', 'usado'];
      if (data.itemType !== 'service' && !validProductKinds.includes(data.productKind || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A origem do estoque (tipo de produto) é inválida.',
          path: ['productKind'],
        });
      }

      const isOpportunityRequired =
        !options.isStockistOnly && data.itemType !== 'service' && data.productKind === 'salvado';
      if (isOpportunityRequired && !data.opportunityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A oportunidade é obrigatória para produtos salvados.',
          path: ['opportunityId'],
        });
      }

      const hasVars =
        Boolean(data.hasVariations) && Array.isArray(data.variations) && data.variations.length > 0;
      if (!hasVars) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Adicione pelo menos uma variação ao produto.',
          path: ['variations'],
        });
      }

      if (!data.categoryIds || data.categoryIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione pelo menos uma categoria.',
          path: ['categoryIds'],
        });
      }

      const ncmDigits = String(data.fiscal?.ncm || '').replace(/\D/g, '');
      if (options.isStockistOnly && data.itemType !== 'service' && ncmDigits.length !== 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe um NCM válido com 8 dígitos.',
          path: ['ncm'],
        });
      }

      const isOwnProduction =
        data.merchandiseOrigin === 'own_production' ||
        data.isOwnProduction === true ||
        data.fiscal?.merchandiseOrigin === 'own_production';
      if (!isOwnProduction && !data.mainSupplierId && !data.supplierId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione um fornecedor para mercadoria de terceiros.',
          path: ['mainSupplierId'],
        });
      }
    });
};

/**
 * Validação do formulário de submissão do produto.
 * Utiliza o Zod schema como autoridade de campos básicos e executa a verificação
 * de regras contextuais de variações (dimensões, atributos duplicados, legibilidade).
 */
export const validateProductFormSubmission = (
  formData: Partial<Product>,
  options: ProductFormValidationOptions
): ProductFormValidationResult => {
  const errors: Record<string, boolean> = {};

  const schema = createProductFormSchema(options);
  const result = schema.safeParse(formData);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field) {
        errors[String(field)] = true;
      }
    }
  }

  if (options.saveAsDraft) {
    return { errors };
  }

  const invalidVariation = (formData.variations || [])
    .map((variation) => ({ variation, issue: getVariationRegistrationIssue(formData, variation) }))
    .find(
      (entry): entry is NonNullable<ProductFormValidationResult['invalidVariation']> =>
        entry.issue !== null
    );

  if (invalidVariation) {
    errors.variationRegistration = true;
  }

  return { errors, invalidVariation };
};
