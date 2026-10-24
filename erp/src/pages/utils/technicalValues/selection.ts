/**
 * Seleção, filtragem e aplicabilidade de campos técnicos no formulário do produto e variações.
 */

import {
  normalizeCharacteristicName,
  isDepthCharacteristic,
  isLengthCharacteristic,
  isHeightCharacteristic,
  isWeightCharacteristicName,
  isExcludedCharacteristic,
  isMattressCategory,
  isSinkCategory,
  isStructureMaterialCharacteristic,
  isSinkMaterialCharacteristic,
  isConcretadaCharacteristic,
  isHasInoxBowlCharacteristic,
} from './predicates';
import type { TechnicalFieldDefinition, TechnicalValuesMap } from './types';

/**
 * Resolve a exclusividade mútua entre Profundidade (total) e Comprimento (total).
 * Determina qual das duas características deve permanecer ativa no formulário.
 */
export const resolveActiveDepthOrLengthField = (
  depthField: TechnicalFieldDefinition,
  lengthField: TechnicalFieldDefinition,
  technicalValues: TechnicalValuesMap,
  manualSet: ReadonlySet<string>
): string => {
  const valDepth = String(technicalValues[depthField.name] ?? '').trim();
  const valLength = String(technicalValues[lengthField.name] ?? '').trim();

  if (manualSet.has(lengthField.name) && !manualSet.has(depthField.name)) {
    return lengthField.name;
  }
  if (manualSet.has(depthField.name) && !manualSet.has(lengthField.name)) {
    return depthField.name;
  }
  if (valLength && !valDepth) {
    return lengthField.name;
  }
  if (valDepth && !valLength) {
    return depthField.name;
  }
  if (
    Object.prototype.hasOwnProperty.call(technicalValues, lengthField.name) &&
    !Object.prototype.hasOwnProperty.call(technicalValues, depthField.name)
  ) {
    return lengthField.name;
  }

  return depthField.name;
};

/**
 * Determina a lista de campos técnicos que devem ser exibidos no formulário do produto.
 *
 * Regras:
 * 1. Requisitos obrigatórios do sistema e campos vinculados às categorias atuais são incluídos automaticamente.
 * 2. Qualquer campo que já tenha valor cadastrado/ativo no produto (mesmo vazio intencional ou manual)
 *    é preservado e incluído, garantindo que dados nunca se percam ao mudar categorias.
 * 3. Campos adicionados manualmente pelo usuário no produto atual são incluídos.
 * 4. Por padrão, NENHUM campo que não pertença às categorias do produto entra automaticamente.
 */
export const getApplicableTechnicalFields = (
  allFields: readonly TechnicalFieldDefinition[] = [],
  productCategoryIds: readonly string[] = [],
  productTechnicalValues: TechnicalValuesMap = {},
  manuallyAddedFieldNames: readonly string[] = []
): TechnicalFieldDefinition[] => {
  const safeFields = Array.isArray(allFields) ? allFields : [];
  const activeCategorySet = new Set(productCategoryIds);
  const manualSet = new Set(manuallyAddedFieldNames);
  const isMattress = isMattressCategory(productCategoryIds, safeFields);
  const isSink = isSinkCategory(productCategoryIds, safeFields);

  const isRequiredForProduct = (field: TechnicalFieldDefinition): boolean => {
    if (isWeightCharacteristicName(field.name)) return false;
    const normalizedName = normalizeCharacteristicName(field.name);

    // Para colchões, a altura não é obrigatória nem solicitada; usa-se espessura do colchão
    if (isMattress && isHeightCharacteristic(field.name)) {
      return false;
    }
    if (isMattress && normalizedName === 'espessura do colchão') {
      return true;
    }
    return Boolean(field.isRequired);
  };

  const isRequiredForCatalog = (field: TechnicalFieldDefinition): boolean =>
    Boolean(
      field.requiredCategoryIds?.some((categoryId) => activeCategorySet.has(String(categoryId)))
    );

  let applicable = safeFields.filter((field) => {
    if (isExcludedCharacteristic(field.name)) return false;

    // Para a categoria Pias, "Material da estrutura" não se aplica (usa-se estritamente "Material da pia")
    if (isSink && isStructureMaterialCharacteristic(field.name)) {
      return false;
    }

    // "Material da pia", "Concretada?" e "Possui cuba de inox?" são exclusivos da categoria Pias
    if (
      !isSink &&
      (isSinkMaterialCharacteristic(field.name) ||
        isConcretadaCharacteristic(field.name) ||
        isHasInoxBowlCharacteristic(field.name))
    ) {
      return manualSet.has(field.name);
    }

    const normName = normalizeCharacteristicName(field.name);
    const hasExistingValue =
      Object.prototype.hasOwnProperty.call(productTechnicalValues, field.name) ||
      ((normName === 'modelo/linha' || normName === 'linha/modelo') &&
        Boolean(
          productTechnicalValues['Modelo'] !== undefined ||
          productTechnicalValues['modelo'] !== undefined ||
          productTechnicalValues['Linha'] !== undefined ||
          productTechnicalValues['linha'] !== undefined
        ));

    // A característica precisa continuar disponível quando a categoria a exige para publicação.
    if (isRequiredForCatalog(field)) return true;

    // Se for colchão, "Altura / Altura total" não deve ser oferecida automaticamente (apenas Espessura do colchão)
    if (isMattress && isHeightCharacteristic(field.name)) {
      return hasExistingValue || manualSet.has(field.name);
    }

    // Campos inativos deixam de ser oferecidos em novos produtos, mas continuam visíveis
    // quando já possuem um valor no cadastro em edição para preservar o dado existente.
    if (field.active === false) {
      return hasExistingValue || manualSet.has(field.name);
    }

    // Requisitos obrigatórios do sistema continuam visíveis, independentemente da categoria.
    if (isRequiredForProduct(field)) return true;

    // Se já está ativo ou preenchido no produto atual, SEMPRE inclui para preservar dados
    if (hasExistingValue) {
      return true;
    }

    // Se foi adicionado manualmente nesta sessão do formulário, inclui
    if (manualSet.has(field.name)) {
      return true;
    }

    // Se o campo tem categorias vinculadas, inclui se coincide com qualquer categoria do produto
    if (field.categoryIds && field.categoryIds.length > 0) {
      return field.categoryIds.some((catId: string) => activeCategorySet.has(catId));
    }

    // Por padrão, se não possui categoria vinculada, NÃO entra automaticamente na lista
    return false;
  });

  // Exclusividade Profundidade vs Comprimento
  const depthField = applicable.find((f) => isDepthCharacteristic(f.name));
  const lengthField = applicable.find((f) => isLengthCharacteristic(f.name));

  if (depthField && lengthField) {
    const activeName = resolveActiveDepthOrLengthField(
      depthField,
      lengthField,
      productTechnicalValues,
      manualSet
    );

    applicable = applicable.filter((f) => {
      if (isDepthCharacteristic(f.name) || isLengthCharacteristic(f.name)) {
        return f.name === activeName;
      }
      return true;
    });
  }

  return applicable.map((field) => {
    const isWeight = isWeightCharacteristicName(field.name) || field.dataType === 'weight';
    return {
      ...field,
      isRequired: isRequiredForProduct(field),
      isRequiredForCatalog: isRequiredForCatalog(field),
      decimalPlaces: isWeight ? 1 : field.decimalPlaces,
    };
  });
};

/**
 * Retorna as Especificações Técnicas que ainda NÃO foram adicionadas ao produto atual,
 * permitindo que sejam listadas no botão '+ Adicionar Especificação Técnica'.
 */
export const getAvailableAdditionalFields = (
  allFields: readonly TechnicalFieldDefinition[] = [],
  currentlyVisibleFields: readonly TechnicalFieldDefinition[] = []
): TechnicalFieldDefinition[] => {
  const safeAll = Array.isArray(allFields) ? allFields : [];
  const safeVisible = Array.isArray(currentlyVisibleFields) ? currentlyVisibleFields : [];
  const visibleNames = new Set(safeVisible.map((f) => f.name.toLowerCase().trim()));
  return safeAll.filter(
    (f) =>
      f.active !== false &&
      !visibleNames.has(f.name.toLowerCase().trim()) &&
      !isExcludedCharacteristic(f.name)
  );
};
