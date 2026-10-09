import { supabase } from '../../../services/supabaseClient';
import { isRequiredCharacteristicName } from '../domain/productCharacteristics';

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
  readonly isRequired: boolean;
  readonly isCustom: boolean;
  readonly options: MobileTechnicalFieldOption[];
}

interface TechnicalAttributeRow {
  readonly id: string;
  readonly name: string;
  readonly active: boolean | null;
  readonly data_type: string | null;
  readonly unit: string | null;
  readonly is_custom?: boolean | null;
  readonly decimal_places?: number | null;
}

export const fetchMobileProductTechnicalFields = async (): Promise<
  MobileProductTechnicalField[]
> => {
  let attributeQuery: any = await supabase
    .from('attributes')
    .select('id, name, active, data_type, unit, is_custom, decimal_places')
    .order('name');
  let attributes: TechnicalAttributeRow[] | null = attributeQuery.data;
  let error = attributeQuery.error;

  if (error && (error.code === '42703' || error.message?.includes('decimal_places'))) {
    attributeQuery = await supabase
      .from('attributes')
      .select('id, name, active, data_type, unit, is_custom')
      .order('name');
    attributes = attributeQuery.data;
    error = attributeQuery.error;
  }
  if (error && (error.code === '42703' || error.message?.includes('is_custom'))) {
    attributeQuery = await supabase
      .from('attributes')
      .select('id, name, active, data_type, unit')
      .order('name');
    attributes = attributeQuery.data;
    error = attributeQuery.error;
  }
  if (error) throw error;

  const [optionsResult, { data: categoryLinks }] = await Promise.all([
    supabase.from('attribute_values').select('id, attribute_id, value, sort_order'),
    supabase.from('category_attributes').select('attribute_id, category_id'),
  ]);
  const optionResult =
    optionsResult.error &&
    (optionsResult.error.code === '42703' || optionsResult.error.message?.includes('sort_order'))
      ? await supabase.from('attribute_values').select('id, attribute_id, value')
      : optionsResult;
  if (optionResult.error) throw optionResult.error;
  const options = optionResult.data;

const FIRMNESS_OPTION_ORDER = ['macio', 'médio', 'firme'];

  return (attributes ?? [])
    .filter((attribute) => !/^reclin[aá]vel$/i.test(String(attribute.name).trim()))
    .map((attribute) => {
      const normalizedName = String(attribute.name).toLocaleLowerCase('pt-BR');
      const isFirmnessField = normalizedName === 'nível de firmeza do estofamento';
      const links = (categoryLinks ?? []).filter((link) => link.attribute_id === attribute.id);
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

      return {
        ...attribute,
        categoryIds: links.map((link) => link.category_id),
        decimal_places:
          attribute.decimal_places === 1 ||
          attribute.decimal_places === 2 ||
          attribute.decimal_places === 3
            ? attribute.decimal_places
            : null,
        isRequired: isRequiredCharacteristicName(attribute.name),
        isCustom: Boolean(attribute.is_custom),
        options: orderedValues,
      };
    });
};

