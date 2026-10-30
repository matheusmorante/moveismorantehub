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
      fieldKey?: string;
    };
  };
  singleVariationParentIssue?: {
    tab: 'technical' | 'estoque' | 'fiscal' | 'geral';
    fieldKey: string;
    message: string;
  };
};

const variationFieldLabels: Record<string, string> = {
  active: 'Status',
  attributes: 'Características',
  avgMonthlySales: 'Média de vendas mensais',
  comboItems: 'Componentes',
  costPrice: 'Custo unitário',
  depth: 'Profundidade',
  description: 'Descrição do componente',
  finalPurchasePrice: 'Preço final de compra',
  freightCost: 'Frete',
  height: 'Altura',
  images: 'Fotos da variação',
  ipiPercent: 'IPI',
  leadTime: 'Prazo de reposição',
  minStock: 'Estoque mínimo',
  name: 'Nome da variação',
  pkgDepth: 'Profundidade da embalagem',
  pkgHeight: 'Altura da embalagem',
  pkgWidth: 'Largura da embalagem',
  productId: 'Produto componente',
  promoPrice: 'Preço promocional',
  quantity: 'Quantidade do componente',
  sku: 'SKU',
  stock: 'Estoque',
  unitPrice: 'Preço de venda',
  variationId: 'Variação do componente',
  weight: 'Peso',
  width: 'Largura',
};

const productFieldLabels: Record<string, string> = {
  avgMonthlySales: 'Média de vendas mensais',
  categoryIds: 'Categoria(s)',
  costPrice: 'Custo unitário',
  depth: 'Profundidade',
  finalPurchasePrice: 'Preço final de compra',
  freightCost: 'Frete',
  height: 'Altura',
  initialStock: 'Estoque inicial',
  ipiPercent: 'IPI',
  leadTime: 'Prazo de reposição',
  mainSupplierId: 'Fornecedor',
  minStock: 'Estoque mínimo',
  name: 'Nome do produto',
  ncm: 'NCM',
  opportunityId: 'Oportunidade',
  pkgDepth: 'Profundidade da embalagem',
  pkgHeight: 'Altura da embalagem',
  pkgWidth: 'Largura da embalagem',
  productKind: 'Origem do estoque',
  promoPrice: 'Preço promocional',
  stock: 'Estoque',
  unitPrice: 'Preço de venda',
  weight: 'Peso',
  width: 'Largura',
};

const formatProductSchemaIssue = (issue: { path: (string | number)[]; message: string }) => {
  const field = [...issue.path].reverse().find((part): part is string => typeof part === 'string');
  const label = field ? productFieldLabels[field] : undefined;
  return label ? `Campo "${label}": ${issue.message}` : issue.message;
};

const getVariationIssueDetails = (path: (string | number)[]) => {
  const field = [...path].reverse().find((part): part is string => typeof part === 'string');
  const fieldLabel = field
    ? variationFieldLabels[field] || field.replace(/([a-z])([A-Z])/g, '$1 $2')
    : 'dados da variação';
  const tab = path.includes('images')
    ? 'fotos'
    : path.includes('technicalValues') || ['width', 'height', 'depth', 'weight', 'pkgWidth', 'pkgHeight', 'pkgDepth'].some((key) => path.includes(key))
      ? 'tecnico'
      : path.includes('comboItems')
        ? 'compostos'
        : path.includes('attributes') || path.includes('name') || path.includes('sku')
          ? 'identificacao'
          : 'estoque';

  return { fieldLabel, tab, fieldKey: field };
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
 * de regras contextuais de variações (dimensões, características duplicadas, legibilidade).
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
    const firstIssue = result.error.issues[0];
    schemaErrorMessage = firstIssue ? formatProductSchemaIssue(firstIssue) : undefined;
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
  const schemaVariationIssues = result.success
    ? []
    : result.error.issues.flatMap((issue) => {
        const [root, index, ...path] = issue.path;
        if (root !== 'variations' || typeof index !== 'number' || !variations[index]) return [];
        const { fieldLabel, tab, fieldKey } = getVariationIssueDetails(path);
        const variation = variations[index];
        const variationLabel = variation.name || variation.sku || `Variação ${index + 1}`;
        return [{
          index,
          source: 'schema' as const,
          variation,
          issue: {
            message: `A variação "${variationLabel}" tem um erro no campo "${fieldLabel}": ${issue.message}`,
            tab,
            fieldKey,
          },
        }];
      });

  const registrationVariationIssue = variations.flatMap((variation, index) => {
    const issue = getVariationRegistrationIssue(formData, variation);
    return issue
      ? [{
          index,
          source: 'registration' as const,
          variation,
          issue: { ...issue, fieldKey: issue.tab === 'identificacao' ? 'attributes' : undefined },
        }]
      : [];
  })[0];

  const issueSourcePriority = { schema: 0, registration: 1 };
  const invalidCandidate = [
    ...schemaVariationIssues,
    ...(registrationVariationIssue ? [registrationVariationIssue] : []),
  ].sort((left, right) =>
    left.index - right.index || issueSourcePriority[left.source] - issueSourcePriority[right.source]
  )[0];

  if (invalidCandidate) {
    const invalidVariation = { variation: invalidCandidate.variation, issue: invalidCandidate.issue };
    if (invalidCandidate.source === 'registration' && isSingleVariation) {
      const parentIssue = mapSingleVariationIssueToParent(invalidCandidate.issue);
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

    errors.variations = true;
    errors.variationRegistration = true;
    return { errors, invalidVariation, errorMessage: invalidVariation.issue.message };
  }

  return { errors, errorMessage: schemaErrorMessage };
};
