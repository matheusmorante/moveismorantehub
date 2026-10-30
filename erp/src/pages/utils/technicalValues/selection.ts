/**
 * Seleção, filtragem e aplicabilidade de campos técnicos no formulário do produto e variações.
 */

import {
  normalizeCharacteristicName,
  isWeightCharacteristicName,
  isExcludedCharacteristic,
  isSinkCategory,
  isStructureMaterialCharacteristic,
  isSinkMaterialCharacteristic,
  isConcretadaCharacteristic,
  isHasInoxBowlCharacteristic,
  isCharacteristicDependent,
  isShelfWeightCapacityCharacteristic,
  isWeightCapacityCharacteristic,
} from './predicates';
import type { TechnicalFieldDefinition, TechnicalValuesMap } from './types';
import { deduplicateProductTechnicalValueAliasFields } from '../../../../../shared-utils/productTechnicalValueAliases';
import { isProductTechnicalAttributeRequiredByCategories } from '../../../../../shared-utils/productCategoryRequiredAttributes';
import { isTechnicalFieldAllowedForCategories } from '../../../../../shared-utils/productTechnicalFieldScope';
import { resolveProductCharacteristicApplication } from '../../../../../shared-utils/productCharacteristicApplications';
import { isCatalogCoreRequiredCharacteristicName } from '../../../../../shared-utils/catalogPublication/characteristicValues';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';

/**
 * Determina a lista de campos técnicos que devem ser exibidos no formulário do produto.
 *
 * Regras:
 * 1. Requisitos obrigatórios do sistema e campos vinculados às categorias atuais são incluídos automaticamente.
 * 2. Qualquer campo que já tenha valor cadastrado/ativo no produto (mesmo vazio intencional ou manual)
 *    é preservado e incluído, garantindo que dados nunca se percam ao mudar categorias.
 * 3. Campos adicionados manualmente pelo usuário no produto atual são incluídos.
 * 4. Campos dependentes também aparecem desativados até que o campo mestre tenha um valor válido.
 */
export const getApplicableTechnicalFields = (
  allFields: readonly TechnicalFieldDefinition[] = [],
  productCategoryIds: readonly string[] = [],
  productTechnicalValues: TechnicalValuesMap = {},
  manuallyAddedFieldNames: readonly string[] = [],
  productCategoryNames: readonly string[] = []
): TechnicalFieldDefinition[] => {
  const safeFields: readonly TechnicalFieldDefinition[] = Array.isArray(allFields) ? allFields : [];
  const activeCategorySet = new Set(productCategoryIds);
  const manualSet = new Set(manuallyAddedFieldNames);
  const isSink = isSinkCategory(productCategoryIds, safeFields);
  const hasCategoryApplication = (field: TechnicalFieldDefinition) =>
    field.categoryApplications?.some((application) =>
      activeCategorySet.has(String(application.categoryId))
    ) ?? false;

  const isRequiredForProduct = (field: TechnicalFieldDefinition): boolean => {
    if (isCatalogNeverRequiredCharacteristicName(field.name)) return false;
    if (Array.isArray(field.categoryApplications)) {
      return resolveProductCharacteristicApplication(field, productCategoryIds) === 'required';
    }
    if (isWeightCapacityCharacteristic(field.name)) return false;
    return Boolean(field.isRequired) || Boolean(
      field.requiredProductCategoryIds?.some((categoryId) => activeCategorySet.has(String(categoryId)))
    );
  };

  const isRequiredForCatalog = (field: TechnicalFieldDefinition): boolean => {
    if (isCatalogNeverRequiredCharacteristicName(field.name)) return false;
    const isLegacyModelAlias = isExcludedCharacteristic(field.name);
    return (isCatalogCoreRequiredCharacteristicName(field.name) && !isLegacyModelAlias) ||
      isProductTechnicalAttributeRequiredByCategories(
        field.requiredCategoryIds,
        productCategoryIds
      );
  };

  const applicable = safeFields.filter((field) => {
    const isCatalogCoreRequired =
      isCatalogCoreRequiredCharacteristicName(field.name) && !isExcludedCharacteristic(field.name);
    const hasCatalogCategoryRequirement =
      !isCatalogNeverRequiredCharacteristicName(field.name) &&
      isProductTechnicalAttributeRequiredByCategories(field.requiredCategoryIds, productCategoryIds);
    const configuredApplications = field.categoryApplications?.filter((application) =>
      activeCategorySet.has(String(application.categoryId))
    ) ?? [];
    if (
      Array.isArray(field.categoryApplications) &&
      configuredApplications.length > 0 &&
      configuredApplications.every((application) => application.application === 'unavailable')
    ) return isCatalogCoreRequired || hasCatalogCategoryRequirement;

    // An explicit Catalog requirement takes precedence over category-specific
    // editor exclusions; otherwise the required value could not be entered.
    if (hasCatalogCategoryRequirement) return true;
    if (isExcludedCharacteristic(field.name)) return false;
    if (isRequiredForCatalog(field)) return true;

    if (!isTechnicalFieldAllowedForCategories(
      field.name, productCategoryNames, field.categoryApplications, productCategoryIds
    ) && !isCatalogCoreRequired) return false;
    if (isExcludedCharacteristic(field.name) && !isCatalogCoreRequired) return false;

    // Para a categoria Pias, "Material da estrutura" não se aplica (usa-se estritamente "Material da pia")
    if (!hasCategoryApplication(field) && isSink && isStructureMaterialCharacteristic(field.name)) {
      return false;
    }

    // "Material da pia", "É concretada?" e "Possui cuba de inox?" são exclusivos da categoria Pias
    if (
      !hasCategoryApplication(field) && !isSink &&
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

    // O peso por prateleira pode ser informado sem depender da quantidade de prateleiras.
    if (isShelfWeightCapacityCharacteristic(field.name)) return true;

    // O peso do produto é uma medida padrão, independente da categoria ou dos vínculos.
    if (isWeightCharacteristicName(field.name)) return true;

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

    if (isCharacteristicDependent(field.name)) {
      return true;
    }

    // Se o campo tem categorias vinculadas, inclui se coincide com qualquer categoria do produto
    if (field.categoryIds && field.categoryIds.length > 0) {
      return field.categoryIds.some((catId: string) => activeCategorySet.has(catId));
    }

    // Por padrão, se não possui categoria vinculada, NÃO entra automaticamente na lista
    return false;
  });

  return deduplicateProductTechnicalValueAliasFields(applicable.map((field) => {
    const isWeight =
      isWeightCharacteristicName(field.name) ||
      isWeightCapacityCharacteristic(field.name) ||
      field.dataType === 'weight';
    return {
      ...field,
      isRequired: isRequiredForProduct(field),
      isRequiredForCatalog: isRequiredForCatalog(field),
      decimalPlaces: isWeight ? 1 : field.decimalPlaces,
    };
  }));
};

/**
 * Retorna as Especificações Técnicas que ainda NÃO foram adicionadas ao produto atual,
 * permitindo que sejam listadas no botão '+ Adicionar Especificação Técnica'.
 */
export const getAvailableAdditionalFields = (
  allFields: readonly TechnicalFieldDefinition[] = [],
  currentlyVisibleFields: readonly TechnicalFieldDefinition[] = [],
  productCategoryNames: readonly string[] = [],
  productCategoryIds: readonly string[] = []
): TechnicalFieldDefinition[] => {
  const safeAll: readonly TechnicalFieldDefinition[] = Array.isArray(allFields) ? allFields : [];
  const safeVisible: readonly TechnicalFieldDefinition[] = Array.isArray(currentlyVisibleFields)
    ? currentlyVisibleFields
    : [];
  const visibleNames = new Set(safeVisible.map((f) => f.name.toLowerCase().trim()));
  const isAvailableForSelectedCategories = (field: TechnicalFieldDefinition): boolean => {
    if (!Array.isArray(field.categoryApplications)) return true;
    if (productCategoryIds.length === 0) return false;
    const applications = field.categoryApplications.filter((application) =>
      productCategoryIds.includes(String(application.categoryId))
    );
    return applications.length === 0 || applications.some((application) => application.application !== 'unavailable');
  };
  return safeAll.filter(
    (f) =>
      f.active !== false &&
      isTechnicalFieldAllowedForCategories(
        f.name, productCategoryNames, f.categoryApplications, productCategoryIds
      ) &&
      isAvailableForSelectedCategories(f) &&
      !visibleNames.has(f.name.toLowerCase().trim()) &&
      !isExcludedCharacteristic(f.name)
  );
};
