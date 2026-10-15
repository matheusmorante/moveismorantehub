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
  singleVariationParentIssue?: {
    tab: 'technical' | 'estoque' | 'fiscal' | 'geral';
    fieldKey: string;
    message: string;
  };
};

export function mapSingleVariationIssueToParent(
  issue: NonNullable<ReturnType<typeof getVariationRegistrationIssue>>
): {
  tab: 'technical' | 'estoque' | 'fiscal' | 'geral';
  fieldKey: string;
  message: string;
  errorKeys: string[];
} {
  const msg = issue.message.toLowerCase();

  if (
    msg.includes('dimensões') ||
    msg.includes('largura') ||
    msg.includes('altura') ||
    msg.includes('profundidade')
  ) {
    return {
      tab: 'technical',
      fieldKey: 'dimensions',
      message: issue.message,
      errorKeys: ['dimensions', 'technicalValues', 'height', 'width', 'depth'],
    };
  }

  if (msg.includes('características')) {
    return {
      tab: 'technical',
      fieldKey: 'technicalValues',
      message: issue.message,
      errorKeys: ['technicalValues'],
    };
  }

  if (msg.includes('preço') || msg.includes('valor')) {
    return {
      tab: 'estoque',
      fieldKey: 'unitPrice',
      message: issue.message,
      errorKeys: ['unitPrice'],
    };
  }

  if (msg.includes('fornecedor')) {
    return {
      tab: 'estoque',
      fieldKey: 'mainSupplierId',
      message: issue.message,
      errorKeys: ['mainSupplierId'],
    };
  }

  if (msg.includes('ncm') || msg.includes('tribut')) {
    return {
      tab: 'fiscal',
      fieldKey: 'ncm',
      message: issue.message,
      errorKeys: ['ncm'],
    };
  }

  if (msg.includes('categoria')) {
    return {
      tab: 'geral',
      fieldKey: 'categoryIds',
      message: issue.message,
      errorKeys: ['categoryIds'],
    };
  }

  if (msg.includes('descrição') || msg.includes('nome')) {
    return {
      tab: 'geral',
      fieldKey: 'name',
      message: issue.message,
      errorKeys: ['name'],
    };
  }

  if (issue.tab === 'tecnico') {
    return {
      tab: 'technical',
      fieldKey: 'technicalValues',
      message: issue.message,
      errorKeys: ['technicalValues', 'dimensions'],
    };
  }
  if (issue.tab === 'estoque') {
    return {
      tab: 'estoque',
      fieldKey: 'unitPrice',
      message: issue.message,
      errorKeys: ['unitPrice'],
    };
  }
  if (issue.tab === 'fiscal') {
    return {
      tab: 'fiscal',
      fieldKey: 'ncm',
      message: issue.message,
      errorKeys: ['ncm'],
    };
  }

  return {
    tab: 'geral',
    fieldKey: 'name',
    message: issue.message,
    errorKeys: ['name'],
  };
}

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

  const variations = formData.variations || [];
  const isSingleVariation = variations.length === 1;

  const invalidVariation = variations
    .map((variation) => ({ variation, issue: getVariationRegistrationIssue(formData, variation) }))
    .find(
      (entry): entry is NonNullable<ProductFormValidationResult['invalidVariation']> =>
        entry.issue !== null
    );

  if (invalidVariation) {
    if (isSingleVariation) {
      const parentIssue = mapSingleVariationIssueToParent(invalidVariation.issue);
      for (const key of parentIssue.errorKeys) {
        errors[key] = true;
      }
      return {
        errors,
        singleVariationParentIssue: {
          tab: parentIssue.tab,
          fieldKey: parentIssue.fieldKey,
          message: parentIssue.message,
        },
      };
    }

    errors.variationRegistration = true;
  }

  return { errors, invalidVariation };
};
