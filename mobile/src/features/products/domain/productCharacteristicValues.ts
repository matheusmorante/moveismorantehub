import {
  findProductTechnicalValueEntry,
  getProductTechnicalValueCandidateKeys,
} from '../../../../../shared-utils/productTechnicalValueAliases';
import {
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
} from '../../../../../shared-utils/productCharacteristicDependencies';
import {
  getProductCharacteristicAttributes,
  normalizeName,
  normalizeValues,
  toTechnicalValuesMap,
} from './productCharacteristicAttributes';

/** Valores do produto pai: características legadas e, depois, technicalValues como fonte prioritária. */
export const getEffectiveProductTechnicalValues = (product: any = {}) => {
  const legacyValues = Object.fromEntries(
    getProductCharacteristicAttributes(product?.attributes).map(({ name, value }) => [name, value])
  );
  const technicalValues = {
    ...toTechnicalValuesMap(product?.technical_specs?.technicalValues),
    ...toTechnicalValuesMap(product?.technicalValues),
  };

  return normalizeValues({ ...legacyValues, ...technicalValues });
};

const normalizeVariableFieldName = (value: unknown) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const variableFieldAliases = (value: unknown) => {
  return getProductTechnicalValueCandidateKeys(String(value || '')).map((candidate) =>
    normalizeVariableFieldName(candidate).replace(/\s/g, '')
  );
};

export const isMobileVariableTechnicalField = (
  fieldName: string,
  variableFieldNames: readonly string[] = []
) => {
  const candidates = new Set(variableFieldAliases(fieldName));
  return variableFieldNames.some((name) =>
    variableFieldAliases(name).some((candidate) => candidates.has(candidate))
  );
};

/** Dependentes variam junto da mestre, como no formulário ERP de variação. */
export const isMobileProductFormTechnicalFieldVariable = (
  fieldName: string,
  variableFieldNames: readonly string[] = []
): boolean =>
  isCharacteristicDependent(fieldName)
    ? isCharacteristicDependentOnVariableField(fieldName, variableFieldNames)
    : isMobileVariableTechnicalField(fieldName, variableFieldNames);

/** Uses the persisted scope list, or infers legacy variability from child overrides. */
export const resolveMobileVariableTechnicalFieldNames = (product: any = {}): string[] => {
  const configured =
    product.variableTechnicalFields ?? product.technical_specs?.variableTechnicalFields;
  if (Array.isArray(configured)) return configured.filter((name): name is string => typeof name === 'string');

  const names = new Map<string, string>();
  const addName = (rawName: unknown) => {
    const name = String(rawName || '').trim();
    const key = normalizeVariableFieldName(name);
    if (key && !names.has(key)) names.set(key, name);
  };
  for (const variation of product.variations || product.allVariations || []) {
    getProductCharacteristicAttributes(variation?.attributes).forEach(({ name }) => addName(name));
    Object.keys(toTechnicalValuesMap(variation?.technicalValues)).forEach(addName);
  }
  return [...names.values()];
};

/** Mescla fontes técnicas na ordem de prioridade sem alterar os rótulos salvos pelo ERP. */
export const getPersistableProductTechnicalValues = (
  product: any = {}
): Record<string, unknown> => {
  const legacyValues = Object.fromEntries(
    getProductCharacteristicAttributes(product?.attributes).map(({ name, value }) => [name, value])
  );
  const sources = [
    legacyValues,
    toTechnicalValuesMap(product?.technical_specs?.technicalValues),
    toTechnicalValuesMap(product?.technicalValues),
  ];
  const result: Record<string, unknown> = {};

  for (const source of sources) {
    for (const [name, value] of Object.entries(source)) {
      const previousName = Object.keys(result).find(
        (existingName) => normalizeName(existingName) === normalizeName(name)
      );
      if (previousName && previousName !== name) delete result[previousName];
      result[name] = value;
    }
  }

  // Consolidar Modelo e Linha legados em Modelo/Linha
  const legacyModelOrLine =
    result['Modelo/Linha'] ??
    result['Linha/Modelo'] ??
    result['Modelo'] ??
    result['modelo'] ??
    result['Linha'] ??
    result['linha'] ??
    product?.line;

  if (
    legacyModelOrLine !== undefined &&
    legacyModelOrLine !== null &&
    String(legacyModelOrLine).trim() !== ''
  ) {
    if (!result['Modelo/Linha'] || String(result['Modelo/Linha']).trim() === '') {
      result['Modelo/Linha'] = legacyModelOrLine;
    }
  }
  delete result['Modelo'];
  delete result['modelo'];
  delete result['Linha'];
  delete result['linha'];

  return result;
};

/**
 * Mescla pai, características de versões antigas e sobrescritas da variação.
 * A variação vence, inclusive quando a sobrescrita foi definida como vazia.
 */
export const getEffectiveVariationTechnicalValues = (
  parentValues: Record<string, unknown> = {},
  variation: any = {},
  variableFieldNames?: readonly string[]
): Record<string, unknown> => {
  const isAllowed = (name: string) =>
    variableFieldNames === undefined ||
    isMobileVariableTechnicalField(name, variableFieldNames) ||
    isCharacteristicDependentOnVariableField(name, variableFieldNames);
  const variationAttributes = Object.fromEntries(
    getProductCharacteristicAttributes(variation?.attributes)
      .filter(({ name }) => isAllowed(name))
      .map(({ name, value }) => [name, value])
  );
  const variationTechnicalValues = Object.fromEntries(
    Object.entries(toTechnicalValuesMap(variation?.technicalValues)).filter(([name]) => isAllowed(name))
  );

  const variationValues = normalizeValues({
    ...variationAttributes,
    ...variationTechnicalValues,
  });
  const effectiveValues = normalizeValues({
    ...parentValues,
    ...variationAttributes,
    ...variationTechnicalValues,
  });
  const variationModelLine = findProductTechnicalValueEntry(variationValues, 'Modelo/Linha');
  if (variationModelLine && variationModelLine.value !== undefined && variationModelLine.value !== null) {
    effectiveValues[normalizeName('Modelo/Linha')] = variationModelLine.value;
  }
  return effectiveValues;
};
