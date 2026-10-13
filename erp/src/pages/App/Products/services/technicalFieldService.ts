import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import {
  isRequiredCharacteristicName,
  isWeightCharacteristicName,
  type TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';

export type TechnicalFieldUnitPolicy = 'product-form' | 'variation-form';

const FIRMNESS_OPTION_ORDER = ['macio', 'médio', 'firme'];
const MEASURE_CHARACTERISTIC_NAMES = new Set(['altura', 'largura', 'profundidade', 'comprimento']);

interface TechnicalAttributeRow {
  readonly id: string;
  readonly name: string;
  readonly active: boolean | null;
  readonly data_type: TechnicalFieldDefinition['dataType'] | null;
  readonly unit: string | null;
  readonly is_custom?: boolean | null;
  readonly decimal_places?: number | null;
}

let cachedDefinitions: {
  'product-form'?: { data: TechnicalFieldDefinition[]; timestamp: number };
  'variation-form'?: { data: TechnicalFieldDefinition[]; timestamp: number };
} = {};

let inFlightDefinitions: {
  'product-form'?: Promise<TechnicalFieldDefinition[]> | null;
  'variation-form'?: Promise<TechnicalFieldDefinition[]> | null;
} = {};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória

export const invalidateTechnicalFieldDefinitionsCache = () => {
  cachedDefinitions = {};
  inFlightDefinitions = {};
};

/** Loads and maps the technical fields shared by product and variation forms. */
export const fetchTechnicalFieldDefinitions = async (
  unitPolicy: TechnicalFieldUnitPolicy,
  options?: { forceRefresh?: boolean }
): Promise<TechnicalFieldDefinition[]> => {
  const now = Date.now();
  if (!options?.forceRefresh) {
    const cached = cachedDefinitions[unitPolicy];
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    if (inFlightDefinitions[unitPolicy]) {
      return inFlightDefinitions[unitPolicy]!;
    }
  }

  const fetchPromise = (async () => {
    try {
      let attributeQuery = await supabase
        .from('attributes')
        .select('id, name, active, data_type, unit, is_custom, decimal_places')
        .order('name');
      let attributes: TechnicalAttributeRow[] | null = attributeQuery.data;
      let error = attributeQuery.error;

      if (error && (error.message?.includes('decimal_places') || error.code === '42703')) {
        attributeQuery = await supabase
          .from('attributes')
          .select('id, name, active, data_type, unit, is_custom')
          .order('name');
        attributes = attributeQuery.data;
        error = attributeQuery.error;
      }

      if (error && (error.message?.includes('is_custom') || error.code === '42703')) {
        attributeQuery = await supabase
          .from('attributes')
          .select('id, name, active, data_type, unit')
          .order('name');
        attributes = attributeQuery.data;
        error = attributeQuery.error;
      }

      if (error) throw error;

      const [valuesResult, { data: categoryLinks, error: categoryLinksError }] = await Promise.all([
        supabase
          .from('attribute_values')
          .select('id, attribute_id, value, sort_order')
          .limit(10000),
        supabase
          .from('category_attributes')
          .select('attribute_id, category_id, is_required')
          .limit(10000),
      ]);
      const valueResult =
        valuesResult.error &&
        (valuesResult.error.message?.includes('sort_order') || valuesResult.error.code === '42703')
          ? await supabase.from('attribute_values').select('id, attribute_id, value').limit(10000)
          : valuesResult;
      if (valueResult.error) throw valueResult.error;
      const values = valueResult.data;

      if (categoryLinksError) {
        console.warn('Aviso ao buscar category_attributes:', categoryLinksError);
      }

      const result = (attributes ?? [])
        .filter((attribute) => !/^reclin[aá]vel$/i.test(String(attribute.name).trim()))
        .map((attribute) => {
          const normalizedName = String(attribute.name).trim().toLocaleLowerCase('pt-BR');
          const isFirmnessField = normalizedName === 'nível de firmeza do estofamento';
          // Dimensões são valores numéricos livres. Atributos legados sem tipo (ou como lista)
          // viram comboboxes e Ctrl+V só filtra opções, sem atualizar o valor da característica.
          const isMeasureCharacteristic = MEASURE_CHARACTERISTIC_NAMES.has(normalizedName);
          const options = (values ?? [])
            .filter((value) => value.attribute_id === attribute.id)
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
          const categoryIds = categoryLinksError
            ? []
            : (categoryLinks ?? [])
                .filter((link) => link.attribute_id === attribute.id)
                .map((link) => link.category_id);
          const requiredCategoryIds = categoryLinksError
            ? []
            : (categoryLinks ?? [])
                .filter(
                  (link) =>
                    link.attribute_id === attribute.id &&
                    link.is_required &&
                    !isWeightCharacteristicName(attribute.name)
                )
                .map((link) => link.category_id);
          const isWeight =
            isWeightCharacteristicName(attribute.name) || attribute.data_type === 'weight';
          const dimensionUnit = isMeasureCharacteristic ? 'cm' : isWeight ? 'kg' : undefined;

          return {
            id: attribute.id,
            name: attribute.name,
            active: attribute.active ?? true,
            dataType: isMeasureCharacteristic ? 'measure' : attribute.data_type || 'list',
            unit: attribute.unit || dimensionUnit,
            decimalPlaces: isWeight
              ? 1
              : attribute.decimal_places === 1 ||
                  attribute.decimal_places === 2 ||
                  attribute.decimal_places === 3
                ? attribute.decimal_places
                : undefined,
            isRequired: isRequiredCharacteristicName(attribute.name),
            isCustom: Boolean(attribute.is_custom),
            options,
            categoryIds,
            requiredCategoryIds,
          };
        });

      cachedDefinitions[unitPolicy] = { data: result, timestamp: Date.now() };
      return result;
    } finally {
      inFlightDefinitions[unitPolicy] = null;
    }
  })();

  inFlightDefinitions[unitPolicy] = fetchPromise;
  return fetchPromise;
};
