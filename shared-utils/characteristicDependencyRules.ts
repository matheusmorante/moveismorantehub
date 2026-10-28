import type {
  AttributeDataType,
  CharacteristicDependency,
  CharacteristicDependencyLogic,
  CharacteristicDependencyOperator,
} from '../erp/src/pages/types/variation.type';
import { normalizeAttributeDataType } from './attributeDataType';

const TEXT_OPERATORS: readonly CharacteristicDependencyOperator[] = [
  'contains',
  'not_contains',
  'equals',
  'not_equals',
];
const NUMBER_OPERATORS: readonly CharacteristicDependencyOperator[] = [
  'equals',
  'not_equals',
  'greater_than',
  'greater_or_equal',
  'less_than',
  'less_or_equal',
];

const normalizeDependencyType = (dataType?: AttributeDataType): AttributeDataType => {
  const normalized = normalizeAttributeDataType(dataType);
  if (normalized === 'measure' || normalized === 'weight' || normalized === 'percentage') return 'decimal';
  return normalized;
};

const normalizedText = (value: unknown) =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export const parseCharacteristicBoolean = (value: unknown): boolean | null => {
  const normalized = normalizedText(value);
  if (['true', '1', 'sim', 's', 'yes', 'ligado'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'n', 'no', 'desligado'].includes(normalized)) return false;
  return null;
};

export const getCharacteristicDependencyOperators = (
  dataType?: AttributeDataType,
  options?: readonly { value: string; active?: boolean }[]
): readonly CharacteristicDependencyOperator[] => {
  const normalized = normalizeDependencyType(dataType);
  if (normalized === 'radio') {
    const activeOptions = options?.filter((option) => option.active !== false) ?? [];
    return activeOptions.length && activeOptions.every((option) => /^\s*\d+(?:[.,]\d+)?/.test(option.value))
      ? ['equals', 'not_equals', 'greater_than']
      : ['equals', 'not_equals'];
  }
  if (normalized === 'multi_select') return ['contains', 'not_contains'];
  if (normalized === 'boolean') return ['equals', 'not_equals'];
  if (normalized === 'integer' || normalized === 'decimal' || normalized === 'weight') {
    return NUMBER_OPERATORS;
  }
  return TEXT_OPERATORS;
};

export const isCharacteristicDependencyOperator = (
  dataType: AttributeDataType | undefined,
  operator: string,
  options?: readonly { value: string; active?: boolean }[]
): operator is CharacteristicDependencyOperator =>
  getCharacteristicDependencyOperators(dataType, options).includes(
    operator as CharacteristicDependencyOperator
  );

export const getCharacteristicDependencyOperatorLabel = (
  operator: CharacteristicDependencyOperator
): string =>
  ({
    contains: 'Contém',
    not_contains: 'Não contém',
    equals: 'É igual',
    not_equals: 'Não é igual',
    greater_than: 'Maior que',
    greater_or_equal: 'Maior ou igual a',
    less_than: 'Menor que',
    less_or_equal: 'Menor ou igual a',
  })[operator];

const selectedValues = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.value ?? record.val ?? value];
  }
  return [value];
};

export function getCharacteristicDependencies<T extends CharacteristicDependency>(field: {
  dependency?: T | null;
  dependencyAlternatives?: readonly T[];
}): readonly T[] {
  return [
    ...(field.dependency ? [field.dependency] : []),
    ...(field.dependencyAlternatives ?? []),
  ];
}

export function evaluateCharacteristicDependencies<T>(
  dependencies: readonly T[],
  logic: CharacteristicDependencyLogic | undefined,
  evaluate: (dependency: T) => boolean
): boolean {
  if (dependencies.length === 0) return true;
  // Alternatives to a primary condition are OR conditions unless explicitly configured otherwise.
  return logic === 'all'
    ? dependencies.every(evaluate)
    : dependencies.some(evaluate);
}

/** Evaluates one configured condition; product forms can reuse this when they adopt group definitions. */
export const evaluateCharacteristicDependency = (
  dependency: CharacteristicDependency,
  referenceType: AttributeDataType | undefined,
  referenceValue: unknown
): boolean => {
  if (referenceValue === null || referenceValue === undefined || referenceValue === '') return false;

  const type = normalizeDependencyType(referenceType);
  if (type === 'radio' && dependency.operator === 'greater_than') {
    if (dependency.value.trim() !== '0') return false;
    const match = String(referenceValue).match(/^\s*(\d+(?:[.,]\d+)?)/);
    return Boolean(match && Number(match[1].replace(',', '.')) > 0);
  }
  if (type === 'boolean' || (type === 'radio' && typeof referenceValue === 'boolean')) {
    const actual = parseCharacteristicBoolean(referenceValue);
    const expected = parseCharacteristicBoolean(dependency.value);
    if (actual === null || expected === null) return false;
    return dependency.operator === 'equals'
      ? actual === expected
      : dependency.operator === 'not_equals'
        ? actual !== expected
        : false;
  }
  if (type === 'integer' || type === 'decimal') {
    const actual = Number(Array.isArray(referenceValue) ? referenceValue[0] : referenceValue);
    const expected = Number(dependency.value);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    switch (dependency.operator) {
      case 'equals': return actual === expected;
      case 'not_equals': return actual !== expected;
      case 'greater_than': return actual > expected;
      case 'greater_or_equal': return actual >= expected;
      case 'less_than': return actual < expected;
      case 'less_or_equal': return actual <= expected;
      default: return false;
    }
  }

  const expected = normalizedText(dependency.value);
  const values = selectedValues(referenceValue).map(normalizedText);
  if (type === 'multi_select') {
    const matches = values.includes(expected);
    return dependency.operator === 'contains'
      ? matches
      : dependency.operator === 'not_contains'
        ? !matches
        : false;
  }

  const actual = values[0] ?? '';
  switch (dependency.operator) {
    case 'contains': return actual.includes(expected);
    case 'not_contains': return !actual.includes(expected);
    case 'equals': return actual === expected;
    case 'not_equals': return actual !== expected;
    default: return false;
  }
};
