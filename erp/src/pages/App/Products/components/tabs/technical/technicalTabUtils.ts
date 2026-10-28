import { Product } from '../../../../../types/product.type';
import {
  TechnicalFieldDefinition,
  getCharacteristicDependencyState,
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  isFeetQuantityCharacteristic,
  isHasDoorsActive,
  isHasDrawersActive,
  isHasFeetActive,
  parseDoorQuantityValue,
  parseDrawerQuantityValue,
  parseFeetQuantityValue,
} from '@/pages/utils/technicalValuesService';
import { getProductTechnicalRootFallbackValue } from '../../../../../../../../shared-utils/productTechnicalRootPatch';

export const SYNCED_FIELDS = new Set<keyof Product>([
  'description',
  'width',
  'height',
  'depth',
  'weight',
]);

export const normalizeTechnicalName = (value: string): string =>
  value.trim().toLocaleLowerCase('pt-BR');

export const normalizeSearchTerm = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const parseNumericDimension = (val: unknown): number | undefined => {
  if (typeof val === 'number') return Number.isFinite(val) && val > 0 ? val : undefined;
  if (typeof val === 'string' && val.trim()) {
    const n = Number(val.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
};

export interface TechnicalFieldItemState {
  rawValue: unknown;
  hasConfiguredValue: boolean;
  hasSelectedValue: boolean;
  isManual: boolean;
  isNotApplicable: boolean;
  isAlwaysApplicable: boolean;
  isApplicable: boolean;
  isFieldInvalid: boolean;
  isColorField: boolean;
  isFieldDisabled: boolean;
  disabledReason?: string;
}

export const computeTechnicalFieldItemState = (
  field: TechnicalFieldDefinition,
  formData: Partial<Product>,
  manualFieldNames: string[],
  validationErrors?: Record<string, boolean>
): TechnicalFieldItemState => {
  const norm = normalizeTechnicalName(field.name);
  let rawValue =
    formData.technicalValues?.[field.name] ??
    (/^marca$/i.test(field.name.trim()) ? formData.brand : undefined);

  if (
    (rawValue === undefined || rawValue === '') &&
    !Object.prototype.hasOwnProperty.call(formData.technicalValues || {}, field.name)
  ) {
    if ((norm === 'altura' || norm === 'altura total') && formData.height) {
      rawValue = formData.height;
    } else if (norm === 'peso') {
      rawValue = getProductTechnicalRootFallbackValue(field.name, formData);
    } else if ((norm === 'largura' || norm === 'largura total') && formData.width) {
      rawValue = formData.width;
    } else if (
      (norm === 'profundidade' || norm === 'profundidade total') &&
      !formData.depthUseLength &&
      formData.depth
    ) {
      rawValue = formData.depth;
    } else if (norm === 'modelo/linha' || norm === 'linha/modelo') {
      rawValue =
        formData.technicalValues?.['Modelo'] ??
        formData.technicalValues?.['modelo'] ??
        formData.technicalValues?.['Linha'] ??
        formData.technicalValues?.['linha'] ??
        formData.line;
    }
  }

  const hasConfiguredValue =
    (formData.technicalValues?.[field.name] !== undefined &&
      formData.technicalValues?.[field.name] !== null) ||
    (/^marca$/i.test(field.name.trim()) && Boolean(formData.brand)) ||
    ((norm === 'altura' || norm === 'altura total') && Boolean(formData.height)) ||
    (norm === 'peso' && Boolean(getProductTechnicalRootFallbackValue(field.name, formData))) ||
    ((norm === 'largura' || norm === 'largura total') && Boolean(formData.width)) ||
    ((norm === 'profundidade' || norm === 'profundidade total') &&
      !formData.depthUseLength &&
      Boolean(formData.depth)) ||
    ((norm === 'modelo/linha' || norm === 'linha/modelo') &&
      Boolean(
        formData.technicalValues?.['Modelo'] ??
        formData.technicalValues?.['modelo'] ??
        formData.technicalValues?.['Linha'] ??
        formData.technicalValues?.['linha'] ??
        formData.line
      ));

  const hasSelectedValue =
    rawValue !== undefined &&
    rawValue !== null &&
    String(rawValue).trim() !== '' &&
    String(rawValue).trim().toLowerCase() !== 'não se aplica' &&
    String(rawValue).trim().toLowerCase() !== 'n/a';

  const isManual = manualFieldNames.includes(field.name);
  const isNotApplicable = rawValue === 'Não se aplica' || rawValue === 'N/A';
  const isAlwaysApplicable = Boolean(field.isRequired);
  const isApplicable = isAlwaysApplicable || hasSelectedValue;

  const dep = getCharacteristicDependencyState(field.name, formData.technicalValues || {});
  const isFieldDisabled = field.dependency ? field.dependencySatisfied === false : dep.isDisabled;

  const isDoorQtyReq = isDoorQuantityCharacteristic(field.name) &&
    (field.isRequired || isHasDoorsActive(formData.technicalValues || {}));
  const isDrawerQtyReq = isDrawerQuantityCharacteristic(field.name) &&
    (field.isRequired || isHasDrawersActive(formData.technicalValues || {}));
  const isFeetQtyReq = isFeetQuantityCharacteristic(field.name) && isHasFeetActive(formData.technicalValues || {});

  let isInvalidQty = false;
  if (isDoorQtyReq) {
    const qty = parseDoorQuantityValue({ [field.name]: rawValue });
    isInvalidQty = qty === null || qty < 0;
  } else if (isDrawerQtyReq) {
    const qty = parseDrawerQuantityValue({ [field.name]: rawValue });
    isInvalidQty = qty === null || qty < 0;
  } else if (isFeetQtyReq) {
    const qty = parseFeetQuantityValue({ [field.name]: rawValue });
    isInvalidQty = qty === null || qty <= 0;
  }

  const isFieldInvalid = Boolean(
    !isFieldDisabled &&
      isInvalidQty &&
      validationErrors?.technicalValues
  );
  const isColorField = norm === 'cor';
  return {
    rawValue,
    hasConfiguredValue,
    hasSelectedValue,
    isManual,
    isNotApplicable,
    isAlwaysApplicable,
    isApplicable,
    isFieldInvalid,
    isColorField,
    isFieldDisabled,
    disabledReason: field.dependency ? undefined : dep.disabledReason,
  };
};

export const hasCharacteristicValue = (
  field: TechnicalFieldDefinition,
  formData: Partial<Product>
): boolean => {
  const norm = normalizeTechnicalName(field.name);

  if (/^marca$/i.test(field.name.trim()) && Boolean(formData.brand?.trim())) {
    return true;
  }
  if (
    (norm === 'altura' || norm === 'altura total') &&
    formData.height !== undefined &&
    formData.height !== null &&
    formData.height > 0
  ) {
    return true;
  }
  if (
    (norm === 'largura' || norm === 'largura total') &&
    formData.width !== undefined &&
    formData.width !== null &&
    formData.width > 0
  ) {
    return true;
  }
  if (
    (norm === 'profundidade' || norm === 'profundidade total') &&
    !formData.depthUseLength &&
    formData.depth !== undefined &&
    formData.depth !== null &&
    formData.depth > 0
  ) {
    return true;
  }

  const rawVal = formData.technicalValues?.[field.name];
  if (rawVal === undefined || rawVal === null) {
    return false;
  }

  if (typeof rawVal === 'string') {
    const trimmed = rawVal.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (lower === 'não se aplica' || lower === 'nao se aplica' || lower === 'n/a') {
      return false;
    }
    return true;
  }

  if (typeof rawVal === 'number') {
    return !Number.isNaN(rawVal);
  }

  if (typeof rawVal === 'boolean') {
    return true;
  }

  if (Array.isArray(rawVal)) {
    return rawVal.length > 0;
  }

  return Boolean(rawVal);
};

export const isOptionalFieldSelected = (
  field: TechnicalFieldDefinition,
  formData: Partial<Product>,
  manualFieldNames: readonly string[]
): boolean => {
  return (
    manualFieldNames.includes(field.name) ||
    hasCharacteristicValue(field, formData)
  );
};
