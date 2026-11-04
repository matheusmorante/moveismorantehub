import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { normalizeSearchTerm } from '../technicalTabUtils';
import {
  isSofaRecliningCharacteristic,
  isSofaRetractableCharacteristic,
} from '../../../../../../../../../shared-utils/productTechnicalFieldScope';

export const SOFA_ONLY_DIMENSION_NAMES = new Set([
  'profundidade aberto',
  'profundidade fechado',
  'altura do assento ao chao',
  'altura do chao ate o assento',
]);

export const SOFA_RETRACTABLE_FIELD: TechnicalFieldDefinition = {
  id: 'sofa-retractable-characteristic',
  name: 'É retrátil?',
  dataType: 'boolean',
  options: [],
  isRequired: true,
  active: true,
};

export const SOFA_RECLINING_FIELD: TechnicalFieldDefinition = {
  id: 'sofa-reclining-characteristic',
  name: 'É reclinável?',
  dataType: 'boolean',
  options: [],
  isRequired: true,
  active: true,
};

const SOFA_REQUIRED_FIELD_DEFINITIONS = [
  { fallback: SOFA_RETRACTABLE_FIELD, matches: isSofaRetractableCharacteristic },
  { fallback: SOFA_RECLINING_FIELD, matches: isSofaRecliningCharacteristic },
] as const;

/** Canonical sofa form fields, reusing persisted definitions while keeping their old aliases. */
export const getSofaRequiredTechnicalFields = (
  allFields: readonly TechnicalFieldDefinition[],
  categoryIds: readonly string[] = []
): TechnicalFieldDefinition[] =>
  SOFA_REQUIRED_FIELD_DEFINITIONS.map(({ fallback, matches }) => {
    const existing = allFields.find((field) => matches(field.name));
    return {
      ...fallback,
      ...existing,
      id: existing?.id || fallback.id,
      name: fallback.name,
      dataType: 'boolean',
      options: existing?.options || [],
      isRequired: true,
      isRequiredForProductEntry: true,
      active: true,
      categoryApplications: undefined,
      categoryIds: existing?.categoryIds || [...categoryIds],
    };
  });

export const SOFA_ONLY_DIMENSION_DEFAULTS: TechnicalFieldDefinition[] = [
  {
    id: 'sofa-open-depth-characteristic',
    name: 'Profundidade aberto',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
  {
    id: 'sofa-closed-depth-characteristic',
    name: 'Profundidade fechado',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
  {
    id: 'sofa-seat-height-characteristic',
    name: 'Altura do assento ao chão',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
  {
    id: 'sofa-seat-height-alternative-characteristic',
    name: 'Altura do chão até o assento',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
];

export const isRetractableCharacteristic = (name: string): boolean => {
  return isSofaRetractableCharacteristic(name);
};

export const isRecliningCharacteristic = (name: string): boolean =>
  isSofaRecliningCharacteristic(name);

export const isOpenClosedSofaDepth = (name: string): boolean =>
  ['profundidade aberto', 'profundidade fechado'].includes(normalizeSearchTerm(name));

export const isMissingTechnicalValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'number') return value <= 0;
  if (typeof value !== 'string') return false;
  const normalizedValue = normalizeSearchTerm(value);
  if (/^0+(?:[.,]0+)?$/.test(normalizedValue)) return true;
  return ['', 'nao se aplica', 'n/a', 'nao informado'].includes(normalizeSearchTerm(value));
};
