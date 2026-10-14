import { createProductFormSchema, type ProductFormValidationOptions } from '../../../../../../../shared-utils/productDomainValidation';
export { createProductFormSchema, type ProductFormValidationOptions } from '../../../../../../../shared-utils/productDomainValidation';
import type Product from '@/pages/types/product.type';
import { getVariationRegistrationIssue } from '../../domain/variationRegistrationRules';

export type ProductFormValidationResult = {
  errors: Record<string, boolean>;
  invalidVariation?: {
    variation: NonNullable<Product['variations']>[number];
    issue: NonNullable<ReturnType<typeof getVariationRegistrationIssue>>;
  };
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
