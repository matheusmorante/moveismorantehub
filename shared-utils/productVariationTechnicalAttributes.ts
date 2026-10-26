import { getProductTechnicalValueCandidateKeys } from './productTechnicalValueAliases';

export interface ProductVariationTechnicalAttribute {
  readonly name: string;
  readonly value: unknown;
  readonly showName?: boolean;
}

const normalizeName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const getCandidateNames = (name: string) =>
  new Set(getProductTechnicalValueCandidateKeys(name).map(normalizeName));

const isNotApplicableValue = (value: unknown) =>
  typeof value === 'string' &&
  ['nao se aplica', 'n/a', 'nao informar'].includes(normalizeName(value));

export const removeProductVariationTechnicalAttribute = <
  T extends ProductVariationTechnicalAttribute,
>(
  attributes: readonly T[],
  name: string
): T[] => {
  const candidates = getCandidateNames(name);
  return attributes.filter((attribute) => !candidates.has(normalizeName(attribute.name)));
};

/** Updates every stored legacy alias for the same field, preserving visibility metadata. */
export const syncProductVariationTechnicalAttribute = <
  T extends ProductVariationTechnicalAttribute,
>(
  attributes: readonly T[],
  name: string,
  value: unknown,
  defaultShowName = true
): T[] => {
  const stringValue = String(value ?? '');
  if (!stringValue.trim() || isNotApplicableValue(value)) {
    return removeProductVariationTechnicalAttribute(attributes, name);
  }

  const candidates = getCandidateNames(name);
  const matchingIndexes = attributes.flatMap((attribute, index) =>
    candidates.has(normalizeName(attribute.name)) ? [index] : []
  );
  if (matchingIndexes.length === 0) {
    return [...attributes, { name, value: stringValue, showName: defaultShowName } as T];
  }

  const matchingIndexSet = new Set(matchingIndexes);
  return attributes.map((attribute, index) =>
    matchingIndexSet.has(index) ? ({ ...attribute, value: stringValue } as T) : attribute
  );
};
