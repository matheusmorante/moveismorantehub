import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import VariationType, { VariationOption } from '../types/variation.type';
import { toTitleCase } from './textUtils';
import { sortAttributeValuesNaturally } from './attributeValueSorting';

export const normalizeAttributeDataType = (
  value?: VariationType['dataType']
): NonNullable<VariationType['dataType']> => {
  if (value === 'text') return 'text_short';
  if (value === 'number') return 'integer';
  if (value === 'list') return 'radio';
  return value || 'text_short';
};

// Compatibilidade para instalações onde a coluna data_type ainda não existe
// ou perdeu os valores durante uma sincronização antiga.
const inferAttributeDataType = (name: string, value?: VariationType['dataType']) => {
  if (value) return normalizeAttributeDataType(value);

  const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
  if (['altura', 'largura', 'peso', 'profundidade'].includes(normalizedName))
    return 'measure' as const;
  if (
    [
      'densidade da espuma',
      'tecido',
      'espelho',
      'contém espelho',
      'tipo de porta',
      'tipo de portas',
      'sistema de deslizamento da gaveta',
      'tipo de pés',
      'material de pés',
      'material dos pés',
      'tipo de puxador',
      'material dos puxadores',
      'acabamento',
      'cor',
      'estrutura',
      'material da estrutura',
    ].includes(normalizedName)
  )
    return 'radio' as const;
  if (
    [
      'quantidade de gavetas',
      'quantidade de gaveta',
      'quantidade de portas',
      'quantidade de porta',
    ].includes(normalizedName)
  )
    return 'integer' as const;

  return normalizeAttributeDataType(value);
};

const capitalize = (str: string): string => {
  return toTitleCase(str);
};

/** Garante um valor canônico para um atributo global sem criar atributos duplicados. */
export const ensureAttributeValue = async (
  attributeName: string,
  value: string
): Promise<{ name: string; value: string }> => {
  const normalizedName = capitalize(attributeName);
  const normalizedValue = capitalize(value);
  const { data: attributes, error: attributeError } = await supabase
    .from('attributes')
    .select('id,name')
    .ilike('name', normalizedName)
    .limit(1);
  if (attributeError) throw attributeError;

  let attribute = attributes?.[0];
  if (!attribute) {
    const { data, error } = await supabase
      .from('attributes')
      .insert({ name: normalizedName, active: true })
      .select('id,name')
      .single();
    if (error) throw error;
    attribute = data;
  }

  const { data: values, error: valueError } = await supabase
    .from('attribute_values')
    .select('value')
    .eq('attribute_id', attribute.id)
    .ilike('value', normalizedValue)
    .limit(1);
  if (valueError) throw valueError;
  if (!values?.length) {
    const { error } = await supabase
      .from('attribute_values')
      .insert({ attribute_id: attribute.id, value: normalizedValue });
    if (error) throw error;
  }
  return { name: attribute.name, value: values?.[0]?.value || normalizedValue };
};

/**
 * Salva um novo valor para um atributo existente, evitando duplicidades.
 */
export const saveAttributeValue = async (
  attributeId: string,
  value: string
): Promise<{ id: string; attribute_id: string; value: string }> => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('O valor do atributo não pode ser vazio.');

  const { data: existing, error: findError } = await supabase
    .from('attribute_values')
    .select('id, attribute_id, value')
    .eq('attribute_id', attributeId)
    .ilike('value', trimmed)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('attribute_values')
    .insert({ attribute_id: attributeId, value: trimmed })
    .select('id, attribute_id, value')
    .single();

  if (error) throw error;
  return data;
};

export const checkVariationUsage = async (
  attributeName: string,
  optionValue?: string
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

export const subscribeToVariations = (callback: (variations: VariationType[]) => void) => {
  const fetchAll = async () => {
    try {
      // 1. Buscar atributos globais ordenados por nome
      let attrData: any[] | null = null;
      const primaryQuery = await supabase
        .from('attributes')
        .select('id, name, active, data_type, unit, is_globally_required, is_custom, decimal_places')
        .order('name', { ascending: true });

      if (
        primaryQuery.error &&
        (primaryQuery.error.message?.includes('column') || primaryQuery.error.code === '42703')
      ) {
        let fallbackQuery = await supabase
          .from('attributes')
          .select('id, name, active, data_type, unit, is_globally_required, is_custom')
          .order('name', { ascending: true });
        if (
          fallbackQuery.error &&
          (fallbackQuery.error.message?.includes('is_custom') || fallbackQuery.error.code === '42703')
        ) {
          fallbackQuery = await supabase
            .from('attributes')
            .select('id, name, active, data_type, unit, is_globally_required')
            .order('name', { ascending: true });
        }
        if (fallbackQuery.error) throw fallbackQuery.error;
        attrData = fallbackQuery.data;
      } else if (primaryQuery.error) {
        throw primaryQuery.error;
      } else {
        attrData = primaryQuery.data;
      }

      // 2. Buscar todos os valores/opções vinculados
      const { data: valData, error: valErr } = await supabase.from('attribute_values').select('*');
      if (valErr) throw valErr;

      // 2.5 Enriquecer com vínculos de categoria quando a migration já estiver disponível.
      // A ausência dessa tabela não pode ocultar os atributos globais existentes.
      const { data: catAttrData, error: catAttrErr } = await supabase
        .from('category_attributes')
        .select('attribute_id, category_id, is_required');
      if (catAttrErr) {
        console.warn('Aviso ao buscar vínculos de categorias dos atributos:', catAttrErr);
      }

      // 3. Mapear para a estrutura VariationType usada no ERP
      const mapped: VariationType[] = (attrData || []).map((attr: any) => ({
        id: String(attr.id),
        name: attr.name,
        active: attr.active ?? true,
        dataType: inferAttributeDataType(attr.name, attr.data_type),
        unit: attr.unit || '',
        decimalPlaces:
          attr.decimal_places === 1 || attr.decimal_places === 2 || attr.decimal_places === 3
            ? attr.decimal_places
            : undefined,
        isGloballyRequired: Boolean(attr.is_globally_required),
        isCustom: Boolean(attr.is_custom),
        options: (() => {
          const values = (valData || [])
            .filter((val: any) => val.attribute_id === attr.id)
            .map((val: any) => ({
              id: String(val.id),
              value: val.value,
              sortOrder: Number.isInteger(val.sort_order) ? val.sort_order : undefined,
            }));
          return values.some((value: VariationOption) => value.sortOrder !== undefined)
            ? values.sort(
                (left: VariationOption, right: VariationOption) =>
                  (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
                  (right.sortOrder ?? Number.MAX_SAFE_INTEGER)
              )
            : sortAttributeValuesNaturally(values);
        })(),
        categoryAttributes: (catAttrErr ? [] : catAttrData || [])
          .filter((ca: any) => ca.attribute_id === attr.id)
          .map((ca: any) => ({
            categoryId: ca.category_id,
            isRequired: ca.is_required,
          })),
        deleted: false, // Exclusões sem uso são físicas; itens usados ficam ativos=false.
      }));

      callback(mapped);
    } catch (error) {
      console.error('Erro ao buscar variações iniciais:', error);
      callback([]);
    }
  };

  fetchAll();

  return () => {
    // Realtime desabilitado
  };
};

export const saveVariation = async (variation: VariationType): Promise<void> => {
  await persistVariationDefinition(variation);
};

export const getVariationErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

export const updateVariation = async (
  id: string,
  variationToUpdate: Partial<VariationType>
): Promise<void> => {
  await persistVariationDefinition({ id, ...variationToUpdate } as VariationType);
};

const persistVariationDefinition = async (variation: Partial<VariationType>): Promise<void> => {
  const definition: Record<string, unknown> = { ...variation };
  if (variation.dataType) definition.dataType = normalizeAttributeDataType(variation.dataType);
  if (variation.name !== undefined) definition.name = capitalize(variation.name.trim());
  if (variation.options !== undefined) {
    definition.options = variation.options.map((option, index) => ({
      ...option,
      value: capitalize(option.value.trim()),
      sortOrder: index,
    }));
  }

  const { error } = await supabase.rpc('save_product_characteristic_definition', {
    p_definition: definition,
  });
  if (error) throw error;
};

export const moveToTrash = async (id: string): Promise<'deactivated' | 'deleted'> => {
  const { data, error } = await supabase.rpc('delete_product_characteristic', {
    p_attribute_id: id,
  });
  if (error) throw error;
  return data === 'deactivated' ? 'deactivated' : 'deleted';
};

export const restoreVariation = async (_id: string): Promise<void> => {
  // Restauração segue indisponível até existir um fluxo explícito de reativação.
  console.warn('Restauração de variação não suportada no modelo relacional físico.');
};

export const permanentDeleteVariation = async (id: string): Promise<void> => {
  await moveToTrash(id);
};
