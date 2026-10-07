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
}

export const fetchMobileProductTechnicalFields = async (): Promise<
  MobileProductTechnicalField[]
> => {
  const attributeQuery = await supabase
    .from('attributes')
    .select('id, name, active, data_type, unit, is_custom')
    .eq('active', true)
    .order('name');
  let attributes: TechnicalAttributeRow[] | null = attributeQuery.data;
  let error = attributeQuery.error;

  if (
    error &&
    (error.code === '42703' || error.message?.includes('is_custom'))
  ) {
    const fallback = await supabase
      .from('attributes')
      .select('id, name, active, data_type, unit')
      .eq('active', true)
      .order('name');
    attributes = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;

  const [{ data: options }, { data: categoryLinks }] = await Promise.all([
    supabase.from('attribute_values').select('id, attribute_id, value'),
    supabase.from('category_attributes').select('attribute_id, category_id'),
  ]);

  return (attributes ?? []).map((attribute) => {
    const links = (categoryLinks ?? []).filter((link) => link.attribute_id === attribute.id);
    const values = (options ?? [])
      .filter((option) => option.attribute_id === attribute.id)
      .sort((left, right) =>
        left.value.localeCompare(right.value, 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        })
      );

    return {
      ...attribute,
      categoryIds: links.map((link) => link.category_id),
      isRequired: isRequiredCharacteristicName(attribute.name),
      isCustom: Boolean(attribute.is_custom),
      options: values,
    };
  });
};
