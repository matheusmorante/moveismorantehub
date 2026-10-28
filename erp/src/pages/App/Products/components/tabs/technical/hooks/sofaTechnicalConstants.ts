import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { normalizeSearchTerm } from '../technicalTabUtils';

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
  const normalizedName = normalizeSearchTerm(name).replace(/[?¿!.,:;]/g, '').trim();
  return ['retratil', 'possui retratil', 'e retratil'].includes(normalizedName);
};

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
