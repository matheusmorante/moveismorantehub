import { PRODUCT_SUPPLIER_REQUIRED_MESSAGE } from '../../../../../shared-utils/productSupplierRequirement';
import { PRODUCT_NAME_REQUIRED_MESSAGE } from '../../../../../shared-utils/productNameRequirement';
import { PRODUCT_CATEGORY_REQUIRED_MESSAGE } from '../../../../../shared-utils/productCategoryRequirement';

export type MobileProductFormTabId =
  | 'geral'
  | 'fotos'
  | 'technical'
  | 'description'
  | 'estoque'
  | 'variacoes'
  | 'fiscal';

export interface MobileProductFormErrorNavigation {
  tab: MobileProductFormTabId;
  variationIndex?: number;
  variationPanel?: 'estoque' | 'fotos';
}

export const hasMobileProductDescriptionTechnicalValidationError = (
  messages: Record<string, string>
): boolean => Boolean(messages.technical || messages.technicalValues);

export const isMobileProductDescriptionTabDisabled = (input: {
  hasCategory: boolean;
  hasProductName: boolean;
  hasTechnicalValidationError: boolean;
}): boolean =>
  !input.hasCategory || !input.hasProductName || input.hasTechnicalValidationError;

const PRODUCT_UNIT_PRICE_ERROR_MESSAGE =
  'Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.';
const PRODUCT_MIN_STOCK_MOBILE_ERROR_MESSAGE =
  'Informe um número finito maior ou igual a zero.';
const PRODUCT_MIN_STOCK_SCHEMA_ERROR_MESSAGE =
  'Informe um valor finito maior ou igual a zero.';
const PRODUCT_FORM_REQUIRED_FIELDS_ERROR_MESSAGE = 'Preencha todos os campos obrigatórios.';

const PRODUCT_FORM_TABS = new Set<MobileProductFormTabId>([
  'geral',
  'fotos',
  'technical',
  'description',
  'estoque',
  'variacoes',
  'fiscal',
]);

const VARIATION_PRICING_FIELDS = new Set([
  'price',
  'unitPrice',
  'promoPrice',
  'discountPercent',
  'discountFixed',
  'costPrice',
  'finalPurchasePrice',
]);
const VARIATION_PHOTO_FIELDS = new Set(['images', 'image_url']);

export const resolveMobileProductFormErrorNavigation = (
  fieldPath: string
): MobileProductFormErrorNavigation | undefined => {
  const variationMatch = /^variacoes_(\d+)(?:_(.*))?$/.exec(fieldPath);

  if (variationMatch) {
    const variationField = variationMatch[2];
    const variationPanel = variationField && VARIATION_PRICING_FIELDS.has(variationField)
      ? 'estoque'
      : variationField && VARIATION_PHOTO_FIELDS.has(variationField)
        ? 'fotos'
        : undefined;
    return {
      tab: 'variacoes',
      variationIndex: Number(variationMatch[1]),
      ...(variationPanel ? { variationPanel } : {}),
    };
  }

  if (fieldPath === 'unitPrice' || fieldPath === 'costPrice') {
    return { tab: 'estoque' };
  }

  if (fieldPath === 'name') {
    return { tab: 'geral' };
  }

  if (fieldPath === 'categoryIds') {
    return { tab: 'geral' };
  }

  if (PRODUCT_FORM_TABS.has(fieldPath as MobileProductFormTabId)) {
    return { tab: fieldPath as MobileProductFormTabId };
  }

  return undefined;
};

/** Resolve para uma aba visível do app a navegação dos requisitos do cabeçalho. */
export const resolveMobileProductReadinessTab = (
  requirementId: string,
  preferredTab: MobileProductFormTabId | undefined,
  enabledTabs: readonly MobileProductFormTabId[]
): MobileProductFormTabId | undefined => {
  let targetTab = preferredTab;
  if (requirementId === 'variationPhotos' && !enabledTabs.includes('variacoes')) {
    targetTab = 'fotos';
  }

  return targetTab && enabledTabs.includes(targetTab) ? targetTab : undefined;
};

export const isMobileProductUnitPriceError = (
  fieldPath: string,
  messages: Record<string, string>
): boolean => {
  const message = messages[fieldPath] || Object.values(messages)[0];
  return (
    fieldPath === 'unitPrice' ||
    (fieldPath === 'estoque' && message === 'Informe o preço de venda do produto.')
  );
};

export const isMobileProductCostPriceError = (
  fieldPath: string,
  messages: Record<string, string>
): boolean => fieldPath === 'costPrice' && Boolean(messages.costPrice);

export const isMobileProductSupplierError = (
  fieldPath: string,
  messages: Record<string, string>
): boolean => {
  const message = messages[fieldPath] || Object.values(messages)[0];
  return (
    (fieldPath === 'mainSupplierId' || fieldPath === 'estoque') &&
    message === PRODUCT_SUPPLIER_REQUIRED_MESSAGE
  );
};

export const isMobileProductNameError = (
  fieldPath: string,
  messages: Record<string, string>
): boolean =>
  fieldPath === 'name' && messages.name === PRODUCT_NAME_REQUIRED_MESSAGE;

export const isMobileProductCategoryError = (
  fieldPath: string,
  messages: Record<string, string>
): boolean =>
  fieldPath === 'categoryIds' && messages.categoryIds === PRODUCT_CATEGORY_REQUIRED_MESSAGE;

export const resolveMobileProductFormErrorMessage = (
  fieldPath: string,
  messages: Record<string, string>,
  isDraft = false
): string => {
  const message = messages[fieldPath] || Object.values(messages)[0];
  if (isMobileProductUnitPriceError(fieldPath, messages)) {
    return PRODUCT_UNIT_PRICE_ERROR_MESSAGE;
  }
  if (isMobileProductNameError(fieldPath, messages)) {
    return isDraft ? PRODUCT_NAME_REQUIRED_MESSAGE : PRODUCT_FORM_REQUIRED_FIELDS_ERROR_MESSAGE;
  }
  if (isMobileProductCategoryError(fieldPath, messages)) {
    return PRODUCT_FORM_REQUIRED_FIELDS_ERROR_MESSAGE;
  }
  if (fieldPath === 'minStock' && message === PRODUCT_MIN_STOCK_MOBILE_ERROR_MESSAGE) {
    return isDraft
      ? PRODUCT_MIN_STOCK_SCHEMA_ERROR_MESSAGE
      : PRODUCT_FORM_REQUIRED_FIELDS_ERROR_MESSAGE;
  }
  return message || 'Revise os campos informados.';
};
