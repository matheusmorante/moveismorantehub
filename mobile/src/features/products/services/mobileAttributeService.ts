import { toTitleCase } from '../../../../../shared-utils/productText';
import { withCatalogAttributesLoadTimeout } from '../../../../../shared-utils/catalogAttributesLoadTimeout';
import { inferAttributeDataType, normalizeAttributeDataType } from '../../../../../shared-utils/attributeDataType';
import { supabase } from '../../../services/supabaseClient';
import { isWeightCharacteristicName } from '../domain/productCharacteristics';

export interface MobileAttributeValue {
  id: string;
  value: string;
  attribute_id: string;
  sortOrder?: number;
}

export type MobileAttributeDataType =
  | 'list'
  | 'integer'
  | 'decimal'
  | 'text'
  | 'text_short'
  | 'text_long'
  | 'radio'
  | 'multi_select'
  | 'boolean'
  | 'measure'
  | 'number'
  | 'weight'
  | 'percentage';

export interface MobileCategoryAttribute {
  categoryId: string;
  isRequired: boolean;
}

export interface MobileAttribute {
  id: string;
  name: string;
  active?: boolean;
  dataType?: MobileAttributeDataType;
  decimalPlaces?: 1 | 2 | 3;
  isGloballyRequired?: boolean;
  isCustom?: boolean;
  unit?: string;
  categoryAttributes?: MobileCategoryAttribute[];
  options: MobileAttributeValue[];
}

export type MobileAttributeDefinition = Omit<MobileAttribute, 'id' | 'options'> & {
  id?: string;
  options: Array<Pick<MobileAttributeValue, 'id' | 'value'> & { sortOrder?: number }>;
};

const isMissingColumn = (error: { code?: string; message?: string } | null, column: string) =>
  Boolean(error && (error.code === '42703' || error.message?.includes(column)));

const ATTRIBUTE_FETCH_PAGE_SIZE = 1000;

const fetchAllAttributeRows = async (queryPage: (firstRow: number, lastRow: number) => any) => {
  const allRows: any[] = [];

  for (let firstRow = 0; ; firstRow += ATTRIBUTE_FETCH_PAGE_SIZE) {
    const { data, error } = await queryPage(
      firstRow,
      firstRow + ATTRIBUTE_FETCH_PAGE_SIZE - 1
    );
    if (error) return { data: null, error };

    const page = data ?? [];
    allRows.push(...page);
    if (page.length < ATTRIBUTE_FETCH_PAGE_SIZE) return { data: allRows, error: null };
  }
};

const fetchAttributeRows = async () => {
  const fetchWithColumns = (columns: string) => fetchAllAttributeRows((firstRow, lastRow) =>
    supabase
      .from('attributes')
      .select(columns)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(firstRow, lastRow)
  );

  let query = await fetchWithColumns(
    'id, name, active, data_type, unit, is_custom, decimal_places, is_globally_required'
  );
  if (isMissingColumn(query.error, 'decimal_places')) {
    query = await fetchWithColumns(
      'id, name, active, data_type, unit, is_custom, is_globally_required'
    );
  }
  if (isMissingColumn(query.error, 'is_custom')) {
    query = await fetchWithColumns('id, name, active, data_type, unit, is_globally_required');
  }
  if (isMissingColumn(query.error, 'is_globally_required')) {
    query = await fetchWithColumns('id, name, active, data_type, unit');
  }
  if (query.error) throw query.error;
  return query.data;
};

const fetchAttributeValues = async () => {
  const fetchWithColumns = (columns: string) => fetchAllAttributeRows((firstRow, lastRow) =>
    supabase
      .from('attribute_values')
      .select(columns)
      .order('id', { ascending: true })
      .range(firstRow, lastRow)
  );

  let query = await fetchWithColumns('id, attribute_id, value, sort_order');
  if (isMissingColumn(query.error, 'sort_order')) {
    query = await fetchWithColumns('id, attribute_id, value');
  }
  if (query.error) throw query.error;
  return query.data;
};

export const fetchMobileAttributes = async (): Promise<MobileAttribute[]> => {
  const [attributes, values, categoriesResult] = await withCatalogAttributesLoadTimeout(
    Promise.all([
      fetchAttributeRows(),
      fetchAttributeValues(),
      fetchAllAttributeRows((firstRow, lastRow) =>
        supabase
          .from('category_attributes')
          .select('attribute_id, category_id, is_required')
          .order('attribute_id', { ascending: true })
          .order('category_id', { ascending: true })
          .range(firstRow, lastRow)
      ),
    ]),
    'mobile:product-attributes:catalog',
  );

  if (categoriesResult.error) {
    console.warn(
      '[MobileAttributeService] Aviso ao buscar vínculos de categorias:',
      categoriesResult.error
    );
  }

  const mapped: MobileAttribute[] = attributes.map((attribute: any) => {
    const options: MobileAttributeValue[] = values
      .filter((value: any) => String(value.attribute_id) === String(attribute.id))
      .map((value: any) => ({
        id: String(value.id),
        value: String(value.value),
        attribute_id: String(value.attribute_id),
        sortOrder: Number.isInteger(value.sort_order) ? value.sort_order : undefined,
      }));
    const orderedOptions = options.some((option: MobileAttributeValue) => option.sortOrder !== undefined)
      ? options.sort(
          (left: MobileAttributeValue, right: MobileAttributeValue) =>
            (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.sortOrder ?? Number.MAX_SAFE_INTEGER)
        )
      : options.sort((left: MobileAttributeValue, right: MobileAttributeValue) =>
          left.value.localeCompare(right.value, 'pt-BR', {
            numeric: true,
            sensitivity: 'base',
          })
        );

    return {
      id: String(attribute.id),
      name: attribute.name,
      active: attribute.active ?? true,
      dataType: inferAttributeDataType(attribute.name, attribute.data_type || attribute.dataType),
      decimalPlaces:
        isWeightCharacteristicName(attribute.name) || attribute.data_type === 'weight'
          ? 1
          : attribute.decimal_places === 1 ||
            attribute.decimal_places === 2 ||
            attribute.decimal_places === 3
            ? attribute.decimal_places
            : undefined,
      isGloballyRequired:
        isWeightCharacteristicName(attribute.name) ||
        Boolean(attribute.is_globally_required ?? attribute.isGloballyRequired),
      isCustom: Boolean(attribute.is_custom ?? attribute.isCustom),
      unit: attribute.unit || '',
      options: orderedOptions,
      categoryAttributes: categoriesResult.error
        ? undefined
        : (categoriesResult.data ?? [])
            .filter((link) => String(link.attribute_id) === String(attribute.id))
            .map((link) => ({
              categoryId: String(link.category_id),
              isRequired: isWeightCharacteristicName(attribute.name) || Boolean(link.is_required),
            })),
    };
  });

  return mapped.sort((left, right) =>
    left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' })
  );
};

/** Saves the complete characteristic definition in the same transaction used by ERP. */
export const saveMobileAttributeDefinition = async (
  definition: MobileAttributeDefinition
): Promise<string> => {
  const name = toTitleCase(definition.name.trim());
  if (!name) throw new Error('O nome da característica é obrigatório.');

  const payload: Record<string, unknown> = {
    ...(definition.id ? { id: definition.id } : {}),
    name,
    active: definition.active ?? true,
    dataType: normalizeAttributeDataType(definition.dataType),
    unit:
      definition.dataType === 'weight'
        ? 'kg'
        : definition.dataType === 'percentage'
          ? '%'
          : definition.unit?.trim() || '',
    decimalPlaces:
      definition.dataType === 'decimal'
        ? (definition.decimalPlaces ?? 2)
        : definition.dataType === 'weight' || isWeightCharacteristicName(name)
          ? 1
          : undefined,
    isGloballyRequired:
      isWeightCharacteristicName(name) || (definition.isGloballyRequired ?? false),
    isCustom: definition.isCustom ?? true,
    options: definition.options.map((option, index) => ({
      ...(option.id ? { id: option.id } : {}),
      value: toTitleCase(option.value.trim()),
      sortOrder: index,
    })),
  };
  if (definition.categoryAttributes) {
    payload.categoryAttributes = definition.categoryAttributes.map((link) => ({
      categoryId: link.categoryId,
      isRequired: isWeightCharacteristicName(name) || link.isRequired,
    }));
  }

  const { data, error } = await supabase.rpc('save_product_characteristic_definition', {
    p_definition: payload,
  });
  if (error) throw error;
  if (typeof data !== 'string' || !data) {
    throw new Error('O banco não retornou o identificador da característica salva.');
  }
  return data;
};

export const deleteMobileAttribute = async (id: string): Promise<'deactivated' | 'deleted'> => {
  const { data, error } = await supabase.rpc('delete_product_characteristic', {
    p_attribute_id: id,
  });
  if (error) throw error;
  return data === 'deactivated' ? 'deactivated' : 'deleted';
};

export const addMobileAttributeValue = async (
  attributeId: string,
  value: string
): Promise<void> => {
  const trimmed = value.trim();
  if (!trimmed) return;
  const attribute = (await fetchMobileAttributes()).find((item) => item.id === attributeId);
  if (!attribute) throw new Error('Característica não encontrada.');
  await saveMobileAttributeDefinition({
    ...attribute,
    options: [...attribute.options, { id: '', value: trimmed }],
  });
};

export const deleteMobileAttributeValue = async (valId: string): Promise<void> => {
  const attributes = await fetchMobileAttributes();
  const attribute = attributes.find((item) => item.options.some((option) => option.id === valId));
  if (!attribute) throw new Error('Opção da característica não encontrada.');
  await saveMobileAttributeDefinition({
    ...attribute,
    options: attribute.options.filter((option) => option.id !== valId),
  });
};
