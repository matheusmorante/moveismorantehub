import { createProductFormSchema, type ProductFormValidationOptions } from '../../../../../../../shared-utils/productDomainValidation';
export { createProductFormSchema, type ProductFormValidationOptions } from '../../../../../../../shared-utils/productDomainValidation';
import type Product from '@/pages/types/product.type';
import { getVariationRegistrationIssue } from '../../domain/variationRegistrationRules';

export type ProductFormValidationResult = {
  errors: Record<string, boolean>;
  errorMessage?: string;
  invalidVariation?: {
    variation: NonNullable<Product['variations']>[number];
    issue: {
      message: string;
      tab: string;
    };
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

  let schemaErrorMessage: string | undefined;

  if (!result.success) {
    schemaErrorMessage = result.error.issues[0]?.message;
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field) {
        errors[String(field)] = true;
      }
    }
  }

  if (options.saveAsDraft) {
    return { errors, errorMessage: schemaErrorMessage };
  }

  const variations = formData.variations || [];
  const isMultiVariationMode = Boolean(formData.hasVariations) || variations.length > 1;
  const isSingleVariation = variations.length === 1 && !isMultiVariationMode;
  const parentImages = Array.isArray(formData.images) ? formData.images.filter(Boolean) : [];

  // Validação de conformidade: cada variação deve ter pelo menos 1 foto vinculada para concluir o cadastro
  const variationMissingImage = variations.find((v) => {
    if (!v || typeof v !== 'object') return false;
    const imgs = Array.isArray(v.images)
      ? v.images.filter(Boolean)
      : typeof (v as any).image_url === 'string' && (v as any).image_url.trim()
        ? (v as any).image_url.split(',').filter(Boolean)
        : [];
    return imgs.length === 0 && (isMultiVariationMode || parentImages.length === 0);
  });

  if (variationMissingImage) {
    errors.variations = true;
    errors.variationRegistration = true;
    const message = `A variação "${variationMissingImage.name || variationMissingImage.sku || 'sem nome'}" deve ter pelo menos 1 foto vinculada para concluir o cadastro.`;
    return {
      errors,
      errorMessage: message,
      invalidVariation: {
        variation: variationMissingImage,
        issue: {
          message,
          tab: 'fotos',
        },
      },
    };
  }

  const invalidEntry = variations
    .map((variation) => ({ variation, issue: getVariationRegistrationIssue(formData, variation) }))
    .find((entry) => entry.issue !== null);
  const invalidVariation = invalidEntry?.issue
    ? { variation: invalidEntry.variation, issue: invalidEntry.issue }
    : undefined;

  if (invalidVariation) {
    if (isSingleVariation) {
      const parentIssue = mapSingleVariationIssueToParent(invalidVariation.issue);
      for (const key of parentIssue.errorKeys) {
        errors[key] = true;
      }
      return {
        errors,
        errorMessage: invalidVariation.issue.message,
        singleVariationParentIssue: {
          tab: parentIssue.tab,
          fieldKey: parentIssue.fieldKey,
          message: parentIssue.message,
        },
      };
    }

    errors.variationRegistration = true;
  }

  return { errors, invalidVariation, errorMessage: schemaErrorMessage };
};
