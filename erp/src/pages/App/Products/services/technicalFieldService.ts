import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import {
  isRequiredCharacteristicName,
  type TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';

export type TechnicalFieldUnitPolicy = 'product-form' | 'variation-form';

const FIRMNESS_OPTION_ORDER = ['macio', 'médio', 'firme'];

interface TechnicalAttributeRow {
  readonly id: string;
  readonly name: string;
  readonly active: boolean | null;
  readonly data_type: TechnicalFieldDefinition['dataType'] | null;
  readonly unit: string | null;
  readonly is_custom?: boolean | null;
}

/** Loads and maps the technical fields shared by product and variation forms. */
export const fetchTechnicalFieldDefinitions = async (
  unitPolicy: TechnicalFieldUnitPolicy
): Promise<TechnicalFieldDefinition[]> => {
  const attributeQuery = await supabase
    .from('attributes')
    .select('id, name, active, data_type, unit, is_custom')
    .eq('active', true)
    .order('name');
  let attributes: TechnicalAttributeRow[] | null = attributeQuery.data;
  let error = attributeQuery.error;

  if (error && (error.message?.includes('is_custom') || error.code === '42703')) {
    const fallback = await supabase
      .from('attributes')
      .select('id, name, active, data_type, unit')
      .eq('active', true)
      .order('name');
    attributes = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  const [{ data: values }, { data: categoryLinks, error: categoryLinksError }] = await Promise.all([
    supabase.from('attribute_values').select('id, attribute_id, value'),
    supabase.from('category_attributes').select('attribute_id, category_id, is_required'),
  ]);

  if (categoryLinksError) {
    console.warn('Aviso ao buscar category_attributes:', categoryLinksError);
  }

  return (attributes ?? [])
    .filter((attribute) => !/^reclin[aá]vel$/i.test(String(attribute.name).trim()))
    .map((attribute) => {
      const normalizedName = String(attribute.name).toLocaleLowerCase('pt-BR');
      const isFirmnessField = normalizedName === 'nível de firmeza do estofamento';
      const options = (values ?? [])
        .filter((value) => value.attribute_id === attribute.id)
        .map((value) => ({ id: value.id, value: value.value }))
        .sort((left, right) => {
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
      const dimensionUnit =
        unitPolicy === 'product-form'
          ? ['altura', 'largura', 'profundidade'].includes(normalizedName)
            ? 'cm'
            : normalizedName === 'peso'
              ? 'kg'
              : undefined
          : undefined;

      return {
        id: attribute.id,
        name: attribute.name,
        dataType: attribute.data_type || 'list',
        unit: attribute.unit || dimensionUnit,
        isRequired: isRequiredCharacteristicName(attribute.name),
        isCustom: Boolean(attribute.is_custom),
        options,
        categoryIds,
      };
    });
};
