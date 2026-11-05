import {
  evaluateCharacteristicDependency,
  evaluateCharacteristicDependencies,
  getCharacteristicDependencies,
} from '../../../../../shared-utils/characteristicDependencyRules';
import { removeProductTechnicalValueAliases } from '../../../../../shared-utils/productTechnicalValueAliases';
import type { ProductTechnicalField } from './productCharacteristicDefinitions';
import { getTechnicalValue } from './productCharacteristicValidation';
import { normalizeName } from './productCharacteristicAttributes';
import {
  getEffectiveVariationTechnicalValues,
  isMobileVariableTechnicalField,
} from './productCharacteristicValues';

/** Avalia as condições configuradas no cadastro de Características do ERP. */
export const isConfiguredProductTechnicalDependencySatisfied = (
  field: ProductTechnicalField,
  allFields: readonly ProductTechnicalField[],
  technicalValues: Record<string, unknown>,
  visited = new Set<string>()
): boolean => {
  const fieldKey = field.id || normalizeName(field.name);
  if (visited.has(fieldKey)) return false;
  const nextVisited = new Set(visited).add(fieldKey);
  const dependencies = getCharacteristicDependencies(field);
  if (!dependencies.length) return true;

  return evaluateCharacteristicDependencies(dependencies, field.dependencyLogic, (dependency) => {
    const reference = allFields.find(
      (candidate) => candidate.id === dependency.referenceAttributeId
    );
    const referenceKey = reference?.id || (reference ? normalizeName(reference.name) : '');
    if (!reference || !referenceKey || nextVisited.has(referenceKey)) return false;
    if (
      !isConfiguredProductTechnicalDependencySatisfied(
        reference,
        allFields,
        technicalValues,
        nextVisited
      )
    ) return false;

    return evaluateCharacteristicDependency(
      dependency,
      reference.data_type as Parameters<typeof evaluateCharacteristicDependency>[1],
      getTechnicalValue(technicalValues, reference.name)
    );
  });
};

/**
 * Avalia dependências do Produto Pai como no ERP: referências variáveis usam
 * somente o valor de cada variação ativa; as demais referências usam o valor
 * próprio do Produto. Sem variações ativas, conserva o contexto do Produto.
 */
export const isConfiguredFamilyProductTechnicalDependencySatisfied = (
  field: ProductTechnicalField,
  allFields: readonly ProductTechnicalField[],
  productTechnicalValues: Record<string, unknown>,
  variations: readonly {
    active?: boolean | null;
    attributes?: unknown;
    technicalValues?: Record<string, unknown> | null;
  }[],
  variableFieldNames: readonly string[]
): boolean => {
  const hasVariableReference = getCharacteristicDependencies(field).some((dependency) => {
    const reference = allFields.find(
      (candidate) => candidate.id === dependency.referenceAttributeId
    );
    return Boolean(
      reference && isMobileVariableTechnicalField(reference.name, variableFieldNames)
    );
  });

  if (!hasVariableReference) {
    return isConfiguredProductTechnicalDependencySatisfied(
      field,
      allFields,
      productTechnicalValues
    );
  }

  const activeVariations = variations.filter((variation) => variation.active !== false);
  if (activeVariations.length === 0) {
    return isConfiguredProductTechnicalDependencySatisfied(
      field,
      allFields,
      productTechnicalValues
    );
  }

  return activeVariations.some((variation) => {
    const parentValuesWithoutVariableFields = variableFieldNames.reduce(
      (values, name) => removeProductTechnicalValueAliases(values, name),
      { ...productTechnicalValues }
    );
    const variationValues = getEffectiveVariationTechnicalValues({}, variation);
    const variableOverrides = Object.fromEntries(
      Object.entries(variationValues).filter(([name]) =>
        isMobileVariableTechnicalField(name, variableFieldNames)
      )
    );

    return isConfiguredProductTechnicalDependencySatisfied(
      field,
      allFields,
      { ...parentValuesWithoutVariableFields, ...variableOverrides }
    );
  });
};

/** Retorna o campo e a cadeia de referências que o formulário deve ativar junto dele. */
export const getProductTechnicalDependencyChain = <T extends ProductTechnicalField>(
  field: T,
  allFields: readonly T[]
): T[] => {
  const chain = new Map<string, T>();
  const visit = (candidate: T) => {
    const key = candidate.id || normalizeName(candidate.name);
    if (chain.has(key)) return;
    chain.set(key, candidate);
    getCharacteristicDependencies(candidate).forEach((dependency) => {
      const reference = allFields.find(
        (item) => item.id === dependency.referenceAttributeId
      );
      if (reference) visit(reference);
    });
  };
  visit(field);
  return [...chain.values()];
};
