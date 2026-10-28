import { supabase } from '../../../services/supabaseClient';
import {
  isExcludedProductTechnicalField,
  isRequiredCharacteristicName,
  isWeightCharacteristicName,
} from '../domain/productCharacteristics';
import { isWeightCapacityCharacteristic } from '../../../../../shared-utils/productTechnicalFieldRules';
import { deduplicateProductTechnicalValueAliasFields } from '../../../../../shared-utils/productTechnicalValueAliases';
import { isProductMeasureCharacteristic } from '../../../../../shared-utils/productAiAttributeTypes';
import { sortProductCharacteristicGroups } from '../../../../../shared-utils/productCharacteristicGroupOrder';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export interface MobileTechnicalFieldOption {
  readonly id: string;
  readonly value: string;
  readonly attribute_id: string;
}

export interface MobileProductTechnicalField {
  readonly id: string;
  readonly name: string;
  readonly active: boolean | null;
  readonly data_type: string | null;
  readonly decimal_places: 1 | 2 | 3 | null;
  readonly unit: string | null;
  readonly categoryIds: string[];
  readonly groupId?: string;
  readonly groupName?: string;
  readonly dependency?: {
    referenceAttributeId: string;
    operator:
      | 'contains'
      | 'not_contains'
      | 'equals'
      | 'not_equals'
      | 'greater_than'
      | 'greater_or_equal'
      | 'less_than'
      | 'less_or_equal';
    value: string;
  } | null;
  readonly dependencyAlternatives?: Array<NonNullable<MobileProductTechnicalField['dependency']>>;
  readonly dependencyLogic?: 'all' | 'any';
  readonly categoryApplications?: Array<{
    categoryId: string;
    application: 'unavailable' | 'optional' | 'required';
  }>;
  readonly requiredCategoryIds?: string[];
  readonly isRequired: boolean;
  readonly isRequiredForProduct?: boolean;
  readonly isCustom: boolean;
  readonly options: MobileTechnicalFieldOption[];
}

interface TechnicalAttributeRow {
  readonly id: string;
  readonly name: string;
  readonly active: boolean | null;
  readonly data_type: string | null;
  readonly unit: string | null;
  readonly configuration?: Record<string, unknown> | null;
  readonly is_custom?: boolean | null;
  readonly decimal_places?: number | null;
  readonly group_id?: string | null;
  readonly dependency_attribute_id?: string | null;
  readonly dependency_operator?: string | null;
  readonly dependency_value?: string | null;
}

interface ProductCharacteristicGroupRow {
  readonly id: string;
  readonly name: string;
}

interface ProductCharacteristicDependencyRow {
  readonly attribute_id: string;
  readonly reference_attribute_id: string;
  readonly operator: NonNullable<MobileProductTechnicalField['dependency']>['operator'];
  readonly value: string;
}

const BASE_ATTRIBUTE_COLUMNS = ['id', 'name', 'active', 'data_type', 'unit'] as const;
const OPTIONAL_ATTRIBUTE_COLUMNS = [
  'configuration',
  'is_custom',
  'decimal_places',
  'group_id',
  'dependency_attribute_id',
  'dependency_operator',
  'dependency_value',
] as const;
const TECHNICAL_FIELDS_TIMEOUT_MS = 15_000;

const isMissingRelationError = (error: { code?: string | null; message?: string | null }, relation: string) =>
  error.code === '42P01' ||
  error.code === 'PGRST205' ||
  (String(error.message ?? '').includes(relation) &&
    /(could not find|does not exist|not found)/i.test(String(error.message ?? '')));

const isMissingColumnError = (error: { code?: string | null; message?: string | null }) =>
  error.code === '42703' ||
  error.code === 'PGRST204' ||
  /column .* (does not exist|not found)|could not find .* column/i.test(String(error.message ?? ''));

const getMissingOptionalColumn = (error: { message?: string | null }, columns: readonly string[]) => {
  const message = String(error.message ?? '').toLocaleLowerCase('en-US');
  return columns.find((column) => message.includes(column.toLocaleLowerCase('en-US')));
};

export const fetchMobileProductTechnicalFields = async (
  fetchOptions: { requireCategoryLinks?: boolean } = {}
): Promise<MobileProductTechnicalField[]> => {
  let optionalColumns: string[] = [...OPTIONAL_ATTRIBUTE_COLUMNS];
  let attributes: TechnicalAttributeRow[] | null = null;
  for (;;) {
    const columns = [...BASE_ATTRIBUTE_COLUMNS, ...optionalColumns].join(', ');
    const attributeQuery = await withTimeout(
      supabase.from('attributes').select(columns).order('name'),
      TECHNICAL_FIELDS_TIMEOUT_MS,
      null,
      'mobile-product:technical-attributes',
    );
    if (!attributeQuery) throw new Error('Tempo esgotado ao carregar características técnicas.');
    if (!attributeQuery.error) {
      attributes = attributeQuery.data;
      break;
    }
    if (!isMissingColumnError(attributeQuery.error) || optionalColumns.length === 0) {
      throw attributeQuery.error;
    }
    const missingColumn = getMissingOptionalColumn(attributeQuery.error, optionalColumns);
    optionalColumns = missingColumn
      ? optionalColumns.filter((column) => column !== missingColumn)
      : optionalColumns.slice(0, -1);
  }

  const attributesWithDependencies = (attributes ?? []).filter(
    (attribute) => attribute.dependency_attribute_id && attribute.dependency_operator && attribute.dependency_value != null,
  );
  const relatedQueries = await withTimeout(
    Promise.all([
      supabase.from('attribute_values').select('id, attribute_id, value, sort_order, active').limit(10000),
      supabase
        .from('category_attributes')
        .select('attribute_id, category_id, is_required')
        .limit(10000),
      supabase
        .from('attribute_category_applications')
        .select('attribute_id, category_id, application')
        .limit(10000),
      attributesWithDependencies.length
        ? supabase
            .from('attribute_dependency_alternatives')
            .select('attribute_id, reference_attribute_id, operator, value')
            .limit(10000)
        : Promise.resolve({ data: [], error: null }),
      (attributes ?? []).some((attribute) => attribute.group_id)
        ? supabase.from('attribute_groups').select('id, name').limit(10000)
        : Promise.resolve({ data: [], error: null }),
    ]),
    TECHNICAL_FIELDS_TIMEOUT_MS,
    null,
    'mobile-product:technical-field-relations',
  );
  if (!relatedQueries) throw new Error('Tempo esgotado ao carregar relações das características.');
  const [optionsResult, categoryLinksResult, categoryApplicationsResult, dependenciesResult, groupsResult] = relatedQueries;
  const { data: categoryLinks, error: categoryLinksError } = categoryLinksResult;
  const { data: rawCategoryApplications, error: categoryApplicationsError } = categoryApplicationsResult;
  const categoryApplicationsErrorMessage = String(categoryApplicationsError?.message || '');
  const categoryApplicationsTableMissing = Boolean(
    categoryApplicationsError &&
    (categoryApplicationsError.code === '42P01' ||
      categoryApplicationsError.code === 'PGRST205' ||
      (categoryApplicationsErrorMessage.includes('attribute_category_applications') &&
        /(could not find|does not exist|not found)/i.test(categoryApplicationsErrorMessage)))
  );
  if (categoryApplicationsError && !categoryApplicationsTableMissing) {
    throw categoryApplicationsError;
  }
  const categoryApplications = categoryApplicationsTableMissing
    ? undefined
    : rawCategoryApplications;
  const dependenciesError = dependenciesResult.error;
  const dependencyAlternativesTableMissing = Boolean(
    dependenciesError && isMissingRelationError(dependenciesError, 'attribute_dependency_alternatives'),
  );
  if (dependenciesError && !dependencyAlternativesTableMissing) throw dependenciesError;
  const dependencyAlternatives = dependencyAlternativesTableMissing
    ? []
    : (dependenciesResult.data ?? []) as ProductCharacteristicDependencyRow[];
  const groupsError = groupsResult.error;
  const groupsTableMissing = Boolean(groupsError && isMissingRelationError(groupsError, 'attribute_groups'));
  if (groupsError && !groupsTableMissing) throw groupsError;
  const groups = groupsTableMissing
    ? []
    : sortProductCharacteristicGroups(
        ((groupsResult.data ?? []) as ProductCharacteristicGroupRow[])
          .map((group) => ({ id: String(group.id), name: String(group.name) })),
      );
  const groupNamesById = new Map(groups.map((group) => [group.id, group.name]));
  if (categoryLinksError && fetchOptions.requireCategoryLinks) throw categoryLinksError;
  const shouldRetryOptionsQuery = Boolean(
    optionsResult.error &&
      (optionsResult.error.code === '42703' ||
        optionsResult.error.message?.includes('sort_order') ||
        optionsResult.error.message?.includes('active'))
  );
  const fallbackOptionsResult = shouldRetryOptionsQuery
    ? await withTimeout(
        supabase.from('attribute_values').select('id, attribute_id, value').limit(10000),
        TECHNICAL_FIELDS_TIMEOUT_MS,
        null,
        'mobile-product:technical-option-values-fallback',
      )
    : null;
  if (shouldRetryOptionsQuery && !fallbackOptionsResult) {
    throw new Error('Tempo esgotado ao carregar opções de características.');
  }
  const optionResult = fallbackOptionsResult ?? optionsResult;
  if (optionResult.error) throw optionResult.error;
  const options = (optionResult.data ?? []).filter(
    (option) => (option as { active?: boolean | null }).active !== false,
  );

  const FIRMNESS_OPTION_ORDER = ['macio', 'médio', 'firme'];

  const mappedFields: MobileProductTechnicalField[] = (attributes ?? [])
    .filter((attribute) => !isExcludedProductTechnicalField(attribute.name))
    .map((attribute) => {
      const normalizedName = String(attribute.name).trim().toLocaleLowerCase('pt-BR');
      const isWeight =
        isWeightCharacteristicName(attribute.name) ||
        isWeightCapacityCharacteristic(attribute.name) ||
        attribute.data_type === 'weight';
      const isMeasure = isProductMeasureCharacteristic(attribute.name);
      const isFirmnessField = normalizedName === 'nível de firmeza do estofamento';
      const links = (categoryLinks ?? []).filter((link) => link.attribute_id === attribute.id);
      const applications = categoryApplications?.filter(
        (application) => application.attribute_id === attribute.id
      );
      const values = (options ?? [])
        .filter((option) => option.attribute_id === attribute.id)
        .map((option) => ({
          ...option,
          sort_order: (option as { sort_order?: number | null }).sort_order ?? null,
        }));
      const orderedValues = values.sort((left, right) => {
        if (left.sort_order != null || right.sort_order != null) {
          return (
            (left.sort_order ?? Number.MAX_SAFE_INTEGER) -
            (right.sort_order ?? Number.MAX_SAFE_INTEGER)
          );
        }
        if (isFirmnessField) {
          return (
            FIRMNESS_OPTION_ORDER.indexOf(left.value.trim().toLocaleLowerCase('pt-BR')) -
            FIRMNESS_OPTION_ORDER.indexOf(right.value.trim().toLocaleLowerCase('pt-BR'))
          );
        }
        return left.value.localeCompare(right.value, 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        });
      });
      const dependency =
        attribute.dependency_attribute_id &&
        attribute.dependency_operator &&
        attribute.dependency_value != null
          ? {
              referenceAttributeId: String(attribute.dependency_attribute_id),
              operator: attribute.dependency_operator as NonNullable<MobileProductTechnicalField['dependency']>['operator'],
              value: String(attribute.dependency_value),
            }
          : null;
      const alternatives = dependencyAlternatives
        .filter((candidate) => candidate.attribute_id === attribute.id)
        .map((candidate) => ({
          referenceAttributeId: String(candidate.reference_attribute_id),
          operator: candidate.operator,
          value: String(candidate.value),
        }));
      const configuredDependencyLogic = attribute.configuration?.dependencyLogic;

      return {
        ...attribute,
        categoryIds: applications
          ? applications
              .filter((application) => application.application !== 'unavailable')
              .map((application) => String(application.category_id))
          : links.map((link) => String(link.category_id)),
        ...(applications
          ? {
              categoryApplications: applications.map((application) => ({
                categoryId: String(application.category_id),
                application: application.application as 'unavailable' | 'optional' | 'required',
              })),
            }
          : {}),
        requiredCategoryIds: links
          .filter(
            (link) =>
              link.is_required &&
              !isWeightCharacteristicName(attribute.name) &&
              !isWeightCapacityCharacteristic(attribute.name)
          )
          .map((link) => link.category_id),
        decimal_places:
          isWeight
            ? 1
            : attribute.decimal_places === 1 ||
                attribute.decimal_places === 2 ||
                attribute.decimal_places === 3
              ? attribute.decimal_places
              : null,
        data_type: isMeasure
          ? 'measure'
          : isWeightCapacityCharacteristic(attribute.name)
            ? 'weight'
            : attribute.data_type,
        unit: attribute.unit || (isMeasure ? 'cm' : isWeight ? 'kg' : null),
        isRequired: isRequiredCharacteristicName(attribute.name),
        isRequiredForProduct: isRequiredCharacteristicName(attribute.name),
        isCustom: Boolean(attribute.is_custom),
        groupId: attribute.group_id ? String(attribute.group_id) : undefined,
        groupName: attribute.group_id ? groupNamesById.get(String(attribute.group_id)) : undefined,
        dependency,
        dependencyAlternatives: alternatives,
        dependencyLogic:
          configuredDependencyLogic === 'all' || configuredDependencyLogic === 'any'
            ? configuredDependencyLogic
            : undefined,
        options: orderedValues,
      };
    });

  return deduplicateProductTechnicalValueAliasFields<MobileProductTechnicalField>(mappedFields);
};
