import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import {
  isExcludedCharacteristic,
  isRequiredCharacteristicName,
  isWeightCapacityCharacteristic,
  isWeightCharacteristicName,
  type TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import { isProductMeasureCharacteristic } from '../../../../../../shared-utils/productAiAttributeTypes';
import { deduplicateProductTechnicalValueAliasFields } from '../../../../../../shared-utils/productTechnicalValueAliases';

export type TechnicalFieldUnitPolicy = 'product-form' | 'variation-form';

const FIRMNESS_OPTION_ORDER = ['macio', 'médio', 'firme'];
interface TechnicalAttributeRow {
  readonly id: string;
  readonly name: string;
  readonly active: boolean | null;
  readonly data_type: TechnicalFieldDefinition['dataType'] | null;
  readonly unit: string | null;
  readonly is_custom?: boolean | null;
  readonly decimal_places?: number | null;
  readonly group_id?: string | null;
  readonly configuration?: Record<string, unknown> | null;
  readonly dependency_attribute_id?: string | null;
  readonly dependency_operator?: string | null;
  readonly dependency_value?: string | null;
}

const cachedDefinitions = new Map<string, {
  data: TechnicalFieldDefinition[];
  timestamp: number;
  categoryLinksVerified: boolean;
}>();
const inFlightDefinitions = new Map<string, Promise<TechnicalFieldDefinition[]>>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória
const APPLICATION_PAGE_SIZE = 1000;

const fetchCategoryApplications = async (categoryIds: readonly string[]) => {
  if (categoryIds.length === 0) return { data: [], error: null };

  const rows: Array<{
    attribute_id: string;
    category_id: string;
    application: string;
  }> = [];

  for (let start = 0; ; start += APPLICATION_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('attribute_category_applications')
      .select('attribute_id, category_id, application')
      .in('category_id', [...categoryIds])
      .order('attribute_id', { ascending: true })
      .order('category_id', { ascending: true })
      .range(start, start + APPLICATION_PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < APPLICATION_PAGE_SIZE) return { data: rows, error: null };
  }
};

const fetchAllDependencyAlternatives = async () => {
  const rows: Array<{
    attribute_id: string;
    reference_attribute_id: string;
    operator: NonNullable<TechnicalFieldDefinition['dependency']>['operator'];
    value: string;
  }> = [];

  for (let start = 0; ; start += APPLICATION_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('attribute_dependency_alternatives')
      .select('attribute_id, reference_attribute_id, operator, value')
      .order('attribute_id', { ascending: true })
      .order('reference_attribute_id', { ascending: true })
      .range(start, start + APPLICATION_PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < APPLICATION_PAGE_SIZE) return { data: rows, error: null };
  }
};

const isMissingDependencyAlternativesRelation = (error: { code?: string | null; message?: string | null }) =>
  error.code === '42P01' ||
  error.code === 'PGRST205' ||
  (String(error.message ?? '').includes('attribute_dependency_alternatives') &&
    /(could not find|does not exist|not found)/i.test(String(error.message ?? '')));

export const invalidateTechnicalFieldDefinitionsCache = () => {
  cachedDefinitions.clear();
  inFlightDefinitions.clear();
};

/** Loads and maps the technical fields shared by product and variation forms. */
export const fetchTechnicalFieldDefinitions = async (
  unitPolicy: TechnicalFieldUnitPolicy,
  options: { categoryIds: readonly string[]; forceRefresh?: boolean; requireCategoryLinks?: boolean }
): Promise<TechnicalFieldDefinition[]> => {
  const categoryIds = [...new Set(options.categoryIds.map((id) => id.trim()).filter(Boolean))].sort();
  const cacheKey = `${unitPolicy}:${JSON.stringify(categoryIds)}`;
  const now = Date.now();
  if (!options.forceRefresh) {
    const cached = cachedDefinitions.get(cacheKey);
    if (
      cached &&
      now - cached.timestamp < CACHE_TTL_MS &&
      (!options.requireCategoryLinks || cached.categoryLinksVerified)
    ) {
      return cached.data;
    }
    const pending = inFlightDefinitions.get(cacheKey);
    if (pending) {
      const inFlight = await pending;
      if (!options.requireCategoryLinks || cachedDefinitions.get(cacheKey)?.categoryLinksVerified) {
        return inFlight;
      }
      return fetchTechnicalFieldDefinitions(unitPolicy, { ...options, forceRefresh: true });
    }
  }

  const fetchPromise = (async () => {
    try {
      const initialAttributeQuery = await supabase
        .from('attributes')
        .select('id, name, active, data_type, unit, is_custom, decimal_places, group_id, configuration, dependency_attribute_id, dependency_operator, dependency_value')
        .order('name');
      let attributes: TechnicalAttributeRow[] | null = initialAttributeQuery.data;
      let error = initialAttributeQuery.error;

      if (error && (error.message?.includes('decimal_places') || error.code === '42703')) {
        const fallbackQuery = await supabase
          .from('attributes')
          .select('id, name, active, data_type, unit, is_custom')
          .order('name');
        attributes = fallbackQuery.data;
        error = fallbackQuery.error;
      }

      if (error && (error.message?.includes('is_custom') || error.code === '42703')) {
        const fallbackQuery = await supabase
          .from('attributes')
          .select('id, name, active, data_type, unit')
          .order('name');
        attributes = fallbackQuery.data;
        error = fallbackQuery.error;
      }

      if (error) throw error;

      const hasPrimaryDependencies = (attributes ?? []).some(
        (attribute) => attribute.dependency_attribute_id && attribute.dependency_operator && attribute.dependency_value != null,
      );
      const [
        valuesResult,
        { data: categoryLinks, error: categoryLinksError },
        { data: applicationLinks, error: applicationLinksError },
        dependencyAlternativesResult,
      ] = await Promise.all([
        supabase
          .from('attribute_values')
          .select('id, attribute_id, value, sort_order, active')
          .limit(10000),
        supabase
          .from('category_attributes')
          .select('attribute_id, category_id, is_required')
          .limit(10000),
        fetchCategoryApplications(categoryIds),
        hasPrimaryDependencies
          ? fetchAllDependencyAlternatives()
          : Promise.resolve({ data: [], error: null }),
      ]);
      const valueResult =
        valuesResult.error &&
        (valuesResult.error.message?.includes('sort_order') ||
          valuesResult.error.message?.includes('active') ||
          valuesResult.error.code === '42703')
          ? await supabase.from('attribute_values').select('id, attribute_id, value').limit(10000)
          : valuesResult;
      if (valueResult.error) throw valueResult.error;
      const values: Array<{
        id: string;
        attribute_id: string;
        value: string;
        sort_order?: number | null;
        active?: boolean | null;
      }> = valueResult.data ?? [];

      if (categoryLinksError) {
        console.warn('Aviso ao buscar category_attributes:', categoryLinksError);
        if (options.requireCategoryLinks) throw categoryLinksError;
      }
      if (applicationLinksError) {
        console.warn('Aviso ao buscar aplicações das características por categoria:', applicationLinksError);
        if (options.requireCategoryLinks) throw applicationLinksError;
      }
      const dependencyAlternativesTableMissing = Boolean(
        dependencyAlternativesResult.error &&
          isMissingDependencyAlternativesRelation(dependencyAlternativesResult.error),
      );
      if (dependencyAlternativesResult.error && !dependencyAlternativesTableMissing) {
        throw dependencyAlternativesResult.error;
      }
      const dependencyAlternatives = dependencyAlternativesTableMissing
        ? []
        : dependencyAlternativesResult.data ?? [];

      const mappedFields: TechnicalFieldDefinition[] = (attributes ?? [])
        .filter((attribute) => !isExcludedCharacteristic(String(attribute.name)))
        .map((attribute) => {
          const normalizedName = String(attribute.name).trim().toLocaleLowerCase('pt-BR');
          const isFirmnessField = normalizedName === 'nível de firmeza do estofamento';
          // Dimensões são valores numéricos livres. Características legadas sem tipo (ou como lista)
          // viram comboboxes e Ctrl+V só filtra opções, sem atualizar o valor da característica.
          const isMeasureCharacteristic = isProductMeasureCharacteristic(attribute.name);
          const options = (values ?? [])
            .filter((value) => value.attribute_id === attribute.id && value.active !== false)
            .map((value) => ({
              id: value.id,
              value: value.value,
              sortOrder: (value as { sort_order?: number | null }).sort_order ?? undefined,
            }))
            .sort((left, right) => {
              if (left.sortOrder != null || right.sortOrder != null) {
                return (
                  (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
                  (right.sortOrder ?? Number.MAX_SAFE_INTEGER)
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
          const categoryApplications = applicationLinksError
            ? []
            : (applicationLinks ?? []).filter(
                (link) => link.attribute_id === attribute.id
              );
          const mappedCategoryApplications = categoryApplications.map((link) => ({
            categoryId: String(link.category_id),
            application: link.application as 'unavailable' | 'optional' | 'required',
          }));
          const categoryIds = categoryApplications
            .filter((link) => link.application === 'optional' || link.application === 'required')
            .map((link) => link.category_id);
          const requiredProductCategoryIds = categoryApplications
            .filter((link) => link.application === 'required')
            .map((link) => link.category_id);
          const requiredCategoryIds = categoryLinksError
            ? []
            : (categoryLinks ?? [])
                .filter(
                  (link) =>
                    link.attribute_id === attribute.id &&
                    link.is_required &&
                    !isWeightCharacteristicName(attribute.name) &&
                    !isWeightCapacityCharacteristic(attribute.name)
                )
                .map((link) => link.category_id);
          const unavailableCategoryIds = categoryApplications
            .filter((link) => link.application === 'unavailable')
            .map((link) => link.category_id);
          const isWeight =
            isWeightCharacteristicName(attribute.name) ||
            isWeightCapacityCharacteristic(attribute.name) ||
            attribute.data_type === 'weight';
          const dimensionUnit = isMeasureCharacteristic ? 'cm' : isWeight ? 'kg' : undefined;

          return {
            id: attribute.id,
            name: attribute.name,
            active: attribute.active ?? true,
            dataType: isMeasureCharacteristic
              ? 'measure'
              : isWeightCapacityCharacteristic(attribute.name)
                ? 'weight'
                : attribute.data_type || 'list',
            unit: attribute.unit || dimensionUnit,
            decimalPlaces: isWeight
              ? 1
              : attribute.decimal_places === 1 ||
                  attribute.decimal_places === 2 ||
                  attribute.decimal_places === 3
                ? (attribute.decimal_places as 1 | 2 | 3)
                : undefined,
            isRequired: isRequiredCharacteristicName(attribute.name),
            isCustom: Boolean(attribute.is_custom),
            groupId: typeof attribute.group_id === 'string' ? attribute.group_id : undefined,
            configuration:
              attribute.configuration && typeof attribute.configuration === 'object'
                ? attribute.configuration as TechnicalFieldDefinition['configuration']
                : {},
            dependency:
              attribute.dependency_attribute_id &&
              attribute.dependency_operator &&
              attribute.dependency_value != null
                ? {
                    referenceAttributeId: String(attribute.dependency_attribute_id),
                    operator: attribute.dependency_operator as NonNullable<TechnicalFieldDefinition['dependency']>['operator'],
                    value: String(attribute.dependency_value),
                  }
                : null,
            dependencyAlternatives: dependencyAlternatives
              .filter((dependency) => dependency.attribute_id === attribute.id)
              .map((dependency) => ({
                referenceAttributeId: String(dependency.reference_attribute_id),
                operator: dependency.operator,
                value: String(dependency.value),
              })),
            dependencyLogic:
              attribute.configuration?.dependencyLogic === 'all' ||
              attribute.configuration?.dependencyLogic === 'any'
                ? attribute.configuration.dependencyLogic
                : undefined,
            options,
            categoryIds,
            unavailableCategoryIds,
            categoryApplications: mappedCategoryApplications,
            requiredCategoryIds,
            requiredProductCategoryIds,
          };
        });
      const result = deduplicateProductTechnicalValueAliasFields<TechnicalFieldDefinition>(mappedFields);

      cachedDefinitions.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        categoryLinksVerified: !categoryLinksError && !applicationLinksError,
      });
      return result;
    } finally {
      inFlightDefinitions.delete(cacheKey);
    }
  })();

  inFlightDefinitions.set(cacheKey, fetchPromise);
  return fetchPromise;
};
