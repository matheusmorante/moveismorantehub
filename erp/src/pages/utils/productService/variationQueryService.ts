import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import type VariationType from '../../types/variation.type';
import type { VariationOption } from '../../types/variation.type';
import { toTitleCase } from '../textUtils';
import { sortAttributeValuesNaturally } from '../attributeValueSorting';
import { withCatalogAttributesLoadTimeout } from '../../../../../shared-utils/catalogAttributesLoadTimeout';
import { mapVariationRowsToDefinitions } from './variationServiceMapping';

interface PostgrestErrorLike {
  message?: string;
  code?: string;
}

interface VariationQueryResult<T> {
  data: T[] | null;
  error: PostgrestErrorLike | null;
}

interface FilterableSelectBuilder {
  eq: (column: string, value: string) => FilterableSelectBuilder;
  order: (column: string, options: { ascending: boolean }) => FilterableSelectBuilder;
  range: (from: number, to: number) => PromiseLike<{
    data: unknown[] | null;
    error: PostgrestErrorLike | null;
  }>;
}

interface RawOptionRow {
  id: unknown;
  value: unknown;
  sort_order?: unknown;
  active?: unknown;
}

const VARIATION_FETCH_PAGE_SIZE = 1000;

const fetchAllVariationRows = async <T extends object = Record<string, unknown>>(
  table: string,
  columns: string,
  orderBy: string[],
  applyFilter?: (query: FilterableSelectBuilder) => FilterableSelectBuilder,
): Promise<VariationQueryResult<T>> => {
  const allRows: T[] = [];

  for (let firstRow = 0; ; firstRow += VARIATION_FETCH_PAGE_SIZE) {
    let query = supabase.from(table).select(columns) as unknown as FilterableSelectBuilder;
    if (applyFilter) query = applyFilter(query);
    for (const column of orderBy) {
      query = query.order(column, { ascending: true });
    }
    const { data, error } = await query.range(firstRow, firstRow + VARIATION_FETCH_PAGE_SIZE - 1);

    if (error) return { data: null, error };

    const page = (data || []) as T[];
    allRows.push(...page);
    if (page.length < VARIATION_FETCH_PAGE_SIZE) return { data: allRows, error: null };
  }
};

const isMissingColumnError = (error: PostgrestErrorLike | null, columnToken: string): boolean =>
  Boolean(
    error &&
      (error.message?.toLocaleLowerCase().includes(columnToken) || error.code === '42703'),
  );

export const checkVariationUsage = async (
  attributeName: string,
  optionValue?: string,
): Promise<boolean> => {
  try {
    let query = supabase.from('product_variations').select('id', { count: 'exact', head: true });

    if (optionValue) {
      query = query.eq(`attributes->>${attributeName}`, optionValue);
    } else {
      query = query.not(`attributes->>${attributeName}`, 'is', null);
    }

    const { count, error } = await query;
    if (error) throw error;

    return (count || 0) > 0;
  } catch (error) {
    console.error('Erro ao verificar uso da variação:', error);
    return false;
  }
};

export const fetchVariations = async (
  options: {
    throwOnError?: boolean;
    includeCategoryApplications?: boolean;
    includeOptionValues?: boolean;
  } = {},
): Promise<VariationType[]> => {
  try {
    let attrData: Record<string, unknown>[] | null = null;
    const primaryQuery = await fetchAllVariationRows(
      'attributes',
      'id, name, active, data_type, unit, is_globally_required, is_custom, decimal_places, group_id, configuration',
      ['name', 'id'],
    );

    if (
      primaryQuery.error &&
      (primaryQuery.error.message?.includes('column') || primaryQuery.error.code === '42703')
    ) {
      let fallbackQuery = await fetchAllVariationRows(
        'attributes',
        'id, name, active, data_type, unit, is_globally_required, is_custom',
        ['name', 'id'],
      );
      if (isMissingColumnError(fallbackQuery.error, 'is_custom')) {
        fallbackQuery = await fetchAllVariationRows(
          'attributes',
          'id, name, active, data_type, unit, is_globally_required',
          ['name', 'id'],
        );
      }
      if (fallbackQuery.error) throw fallbackQuery.error;
      attrData = fallbackQuery.data;
    } else if (primaryQuery.error) {
      throw primaryQuery.error;
    } else {
      attrData = primaryQuery.data;
    }

    // A lista precisa da contagem para manter os subtítulos, mas não dos textos.
    // Os valores completos são buscados pelo ID quando a pessoa abre um editor.
    const includeOptionValues = options.includeOptionValues !== false;
    let valueColumns = includeOptionValues
      ? ['id', 'attribute_id', 'value', 'sort_order', 'active']
      : ['attribute_id', 'active'];
    const fetchValues = (columns: string[]) =>
      fetchAllVariationRows('attribute_values', columns.join(', '), ['id']);

    let valuesResult = await fetchValues(valueColumns);
    for (const optionalColumn of includeOptionValues ? ['sort_order', 'active'] : ['active']) {
      if (!isMissingColumnError(valuesResult.error, optionalColumn)) continue;
      valueColumns = valueColumns.filter((column) => column !== optionalColumn);
      valuesResult = await fetchValues(valueColumns);
    }
    const { data: valData, error: valErr } = valuesResult;
    if (valErr) throw valErr;

    const [catalogLinks, categoryApplications] = await Promise.all([
      fetchAllVariationRows('category_attributes', 'attribute_id, category_id, is_required', [
        'attribute_id',
        'category_id',
      ]),
      options.includeCategoryApplications === false
        ? Promise.resolve<VariationQueryResult<Record<string, unknown>>>({ data: null, error: null })
        : fetchAllVariationRows(
            'attribute_category_applications',
            'attribute_id, category_id, application, is_configured',
            ['attribute_id', 'category_id'],
          ),
    ]);
    const { data: catAttrData, error: catAttrErr } = catalogLinks;
    const { data: categoryApplicationData, error: categoryApplicationErr } = categoryApplications;
    if (catAttrErr) {
      console.warn('Aviso ao buscar vínculos de categorias das características:', catAttrErr);
    }
    if (categoryApplicationErr) {
      console.warn(
        'Aviso ao buscar aplicações das características por categoria:',
        categoryApplicationErr,
      );
      throw categoryApplicationErr;
    }

    return mapVariationRowsToDefinitions({
      attrData,
      valData,
      catAttrErr,
      catAttrData,
      categoryApplicationErr,
      categoryApplicationData,
      includeOptionValues,
      includeCategoryApplications: options.includeCategoryApplications,
    });
  } catch (error) {
    console.error('Erro ao buscar variações iniciais:', error);
    if (options.throwOnError) throw error;
    return [];
  }
};

export const fetchVariationOptionsByAttributeId = async (
  attributeId: string,
): Promise<VariationOption[]> => {
  let columns = ['id', 'attribute_id', 'value', 'sort_order', 'active'];
  const fetchValues = (selectedColumns: string[]) =>
    fetchAllVariationRows<RawOptionRow>('attribute_values', selectedColumns.join(', '), ['id'], (query) =>
      query.eq('attribute_id', attributeId),
    );
  let result = await withCatalogAttributesLoadTimeout(
    fetchValues(columns),
    'erp:characteristic-options',
  );
  for (const optionalColumn of ['sort_order', 'active']) {
    if (!isMissingColumnError(result.error, optionalColumn)) continue;
    columns = columns.filter((column) => column !== optionalColumn);
    result = await withCatalogAttributesLoadTimeout(
      fetchValues(columns),
      'erp:characteristic-options',
    );
  }
  if (result.error) throw result.error;

  const options: VariationOption[] = (result.data || []).map((value) => ({
    id: String(value.id),
    value: String(value.value),
    sortOrder: typeof value.sort_order === 'number' && Number.isInteger(value.sort_order)
      ? value.sort_order
      : undefined,
    active: value.active !== false,
  }));
  return options.some((option) => option.sortOrder !== undefined)
    ? options.sort(
        (left, right) =>
          (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER),
      )
    : sortAttributeValuesNaturally(options);
};

export const subscribeToVariations = (callback: (variations: VariationType[]) => void) => {
  fetchVariations()
    .then(callback)
    .catch((error) => {
      console.error('Erro ao buscar variações:', error);
      callback([]);
    });

  return () => {
    // Realtime desabilitado
  };
};

export const fetchVariationOptionByValue = async (
  attributeId: string,
  value: string,
): Promise<VariationOption> => {
  const normalizedValue = toTitleCase(value.trim());
  const { data, error } = await supabase
    .from('attribute_values')
    .select('id, value')
    .eq('attribute_id', attributeId)
    .eq('value', normalizedValue)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('A opção foi salva, mas não foi localizada para atualizar a lista.');

  return { id: String(data.id), value: String(data.value) };
};
