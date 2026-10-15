import { Product } from '../../../../../types/product.type';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

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

export const getToggledDepthLengthTarget = (
  currentFieldName: string,
  allTechnicalFields: TechnicalFieldDefinition[]
): TechnicalFieldDefinition | undefined => {
  const isProfundidade = currentFieldName.toLowerCase().includes('profundidade');
  const isTotal = currentFieldName.toLowerCase().includes('total');
  const targetName = isProfundidade
    ? (isTotal ? 'Comprimento total' : 'Comprimento')
    : (isTotal ? 'Profundidade total' : 'Profundidade');

  return (
    allTechnicalFields.find((f) => f.name.toLowerCase() === targetName.toLowerCase()) ||
    allTechnicalFields.find((f) =>
      isProfundidade
        ? f.name.toLowerCase().includes('comprimento')
        : f.name.toLowerCase().includes('profundidade')
    )
  );
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
  isDepthOrLengthField: boolean;
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
    } else if ((norm === 'largura' || norm === 'largura total') && formData.width) {
      rawValue = formData.width;
    } else if (
      (norm === 'profundidade' ||
        norm === 'profundidade total' ||
        norm === 'comprimento' ||
        norm === 'comprimento total') &&
      formData.depth
    ) {
      rawValue = formData.depth;
    }
  }

  const hasConfiguredValue =
    (formData.technicalValues?.[field.name] !== undefined &&
      formData.technicalValues?.[field.name] !== null) ||
    (/^marca$/i.test(field.name.trim()) && Boolean(formData.brand)) ||
    ((norm === 'altura' || norm === 'altura total') && Boolean(formData.height)) ||
    ((norm === 'largura' || norm === 'largura total') && Boolean(formData.width)) ||
    ((norm === 'profundidade' ||
      norm === 'profundidade total' ||
      norm === 'comprimento' ||
      norm === 'comprimento total') &&
      Boolean(formData.depth));

  const hasSelectedValue =
    rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';

  const isManual = manualFieldNames.includes(field.name);
  const isNotApplicable = rawValue === 'Não se aplica';
  const isAlwaysApplicable = Boolean(field.isRequired);
  const isApplicable = isAlwaysApplicable || (hasConfiguredValue && !isNotApplicable);
  const isFieldInvalid = Boolean(
    isApplicable && !hasSelectedValue && validationErrors?.technicalValues
  );
  const isColorField = norm === 'cor';
  const isDepthOrLengthField = norm.includes('profundidade') || norm.includes('comprimento');

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
    isDepthOrLengthField,
  };
};

export const isOptionalFieldSelected = (
  field: TechnicalFieldDefinition,
  formData: Partial<Product>,
  manualFieldNames: string[]
): boolean => {
  const hasConfiguredValue = Object.prototype.hasOwnProperty.call(
    formData.technicalValues || {},
    field.name
  );
  const normalizedValue = normalizeTechnicalName(
    String(formData.technicalValues?.[field.name] ?? '')
  );
  return (
    manualFieldNames.includes(field.name) ||
    (hasConfiguredValue && !['não se aplica', 'n/a'].includes(normalizedValue)) ||
    (/^marca$/i.test(field.name.trim()) && Boolean(formData.brand?.trim()))
  );
};
