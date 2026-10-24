import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import type VariationType from '../types/variation.type';
import type { VariationOption } from '../types/variation.type';
import { toTitleCase } from './textUtils';
import { sortAttributeValuesNaturally } from './attributeValueSorting';
import { queryClient } from '@/lib/queryClient';
import { isWeightCharacteristicName } from './technicalValuesService';
import { normalizeAttributeDataType } from './attributeDataType';
import { variationFamilyAttributeSchema, VariationFamilyUnconfirmedError } from '../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { saveAttributeValueWithClient } from '../../../../shared-utils/productAttributeValueService';

export { normalizeAttributeDataType };

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
      'material dos puxadores',
      'acabamento',
      'cor',
      'estrutura',
      'material da estrutura',
    ].includes(normalizedName)
  )
    return 'radio' as const;
  if (['tipo de puxador', 'tipo(s) de puxador'].includes(normalizedName))
    return 'multi_select' as const;
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

/** Garante um valor canônico para uma característica global sem criar duplicatas. */
export const ensureAttributeValue = async (
  attributeName: string,
  value: string,
  stillCurrent: () => boolean = () => true,
): Promise<{ name: string; value: string }> => {
  const input = variationFamilyAttributeSchema.parse({ name: attributeName, value });
  const normalizedName = capitalize(input.name), normalizedValue = capitalize(input.value);
  const literal = (text: string) => `^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
  const check = () => { if (!stillCurrent()) throw new Error('A mudança de família perdeu o contexto.'); };
  const wait = async <T,>(promise: PromiseLike<T>, write = false): Promise<T> => {
    check();
    const result = await withTimeout(promise, 10000, null, 'mover-variacao:atributo');
    if (!result) throw write ? new VariationFamilyUnconfirmedError('O cadastro da característica não foi confirmado. Consulte as características antes de repetir.') : new Error('A consulta da característica excedeu o prazo.');
    check(); return result;
  };
  const { data: attributes, error: attributeError } = await wait(supabase
    .from('attributes')
    .select('id,name')
    .filter('name', 'imatch', literal(normalizedName))
    .limit(1));
  if (attributeError) throw attributeError;
  if (!Array.isArray(attributes)) throw new Error('Não foi possível confirmar a consulta da característica.');

  let attribute = attributes?.[0];
  if (!attribute) {
    let response;
    try { response = await wait(supabase
      .from('attributes')
      .insert({ name: normalizedName, active: true })
      .select('id,name')
      .single(), true); } catch (error) { throw error instanceof VariationFamilyUnconfirmedError ? error : new VariationFamilyUnconfirmedError(); }
    if (response.error) {
      if (!response.error.code || response.status === 0 || response.status >= 500) throw new VariationFamilyUnconfirmedError();
      throw response.error;
    }
    attribute = response.data;
  }
  if (!attribute?.id || typeof attribute.name !== 'string' || attribute.name.trim().toLocaleLowerCase('pt-BR') !== normalizedName.toLocaleLowerCase('pt-BR')) throw new VariationFamilyUnconfirmedError('O cadastro da característica não foi confirmado. Consulte as características antes de repetir.');
  const { data: values, error: valueError } = await wait(supabase
    .from('attribute_values')
    .select('value')
    .eq('attribute_id', attribute.id)
    .filter('value', 'imatch', literal(normalizedValue))
    .limit(1));
  if (valueError) throw valueError;
  if (!Array.isArray(values)) throw new Error('Não foi possível confirmar a consulta do valor da característica.');
  let storedValue = values[0]?.value;
  if (!values?.length) {
    let response;
    try { response = await wait(supabase
      .from('attribute_values')
      .insert({ attribute_id: attribute.id, value: normalizedValue }).select('value').single(), true);
    } catch (error) { throw error instanceof VariationFamilyUnconfirmedError ? error : new VariationFamilyUnconfirmedError(); }
    if (response.error) {
      if (!response.error.code || response.status === 0 || response.status >= 500) throw new VariationFamilyUnconfirmedError();
      throw response.error;
    }
    storedValue = response.data?.value;
  }
  if (typeof storedValue !== 'string' || storedValue.trim().toLocaleLowerCase('pt-BR') !== normalizedValue.toLocaleLowerCase('pt-BR')) throw new VariationFamilyUnconfirmedError('O valor da característica não foi confirmado. Consulte as características antes de repetir.');
  return variationFamilyAttributeSchema.parse({ name: attribute.name, value: storedValue });
};

/**
 * Salva um novo valor para uma característica existente, evitando duplicidades.
 */
export const saveAttributeValue = async (
  attributeId: string,
  value: string
): Promise<{ id: string; attribute_id: string; value: string }> => {
  return saveAttributeValueWithClient(supabase, attributeId, value);
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

const VARIATION_FETCH_PAGE_SIZE = 1000;

const fetchAllVariationRows = async (
  table: string,
  columns: string,
  orderBy: string[]
): Promise<{ data: any[] | null; error: any | null }> => {
  const allRows: any[] = [];

  for (let firstRow = 0; ; firstRow += VARIATION_FETCH_PAGE_SIZE) {
    let query = supabase.from(table).select(columns);
    for (const column of orderBy) {
      query = query.order(column, { ascending: true });
    }
    const { data, error } = await query.range(
      firstRow,
      firstRow + VARIATION_FETCH_PAGE_SIZE - 1
    );

    if (error) return { data: null, error };

    const page = data || [];
    allRows.push(...page);
    if (page.length < VARIATION_FETCH_PAGE_SIZE) return { data: allRows, error: null };
  }
};

export const fetchVariations = async (
  options: { throwOnError?: boolean } = {}
): Promise<VariationType[]> => {
  try {
    // 1. Buscar características globais ordenadas por nome
    let attrData: any[] | null = null;
    const primaryQuery = await fetchAllVariationRows(
      'attributes',
      'id, name, active, data_type, unit, is_globally_required, is_custom, decimal_places',
      ['name', 'id']
    );

    if (
      primaryQuery.error &&
      (primaryQuery.error.message?.includes('column') || primaryQuery.error.code === '42703')
    ) {
      let fallbackQuery: any = await fetchAllVariationRows(
        'attributes',
        'id, name, active, data_type, unit, is_globally_required, is_custom',
        ['name', 'id']
      );
      if (
        fallbackQuery.error &&
        (fallbackQuery.error.message?.includes('is_custom') || fallbackQuery.error.code === '42703')
      ) {
        fallbackQuery = await fetchAllVariationRows(
          'attributes',
          'id, name, active, data_type, unit, is_globally_required',
          ['name', 'id']
        );
      }
      if (fallbackQuery.error) throw fallbackQuery.error;
      attrData = fallbackQuery.data;
    } else if (primaryQuery.error) {
      throw primaryQuery.error;
    } else {
      attrData = primaryQuery.data;
    }

    // 2. Buscar todos os valores/opções vinculados
    const { data: valData, error: valErr } = await fetchAllVariationRows(
      'attribute_values',
      '*',
      ['id']
    );
    if (valErr) throw valErr;

    // 2.5 Enriquecer com vínculos de categoria quando a migration já estiver disponível.
    // A ausência dessa tabela não pode ocultar as características globais existentes.
    const { data: catAttrData, error: catAttrErr } = await fetchAllVariationRows(
      'category_attributes',
      'attribute_id, category_id, is_required',
      ['attribute_id', 'category_id']
    );
    if (catAttrErr) {
      console.warn('Aviso ao buscar vínculos de categorias das características:', catAttrErr);
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
      isGloballyRequired:
        Boolean(attr.is_globally_required) && !isWeightCharacteristicName(attr.name),
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
          isRequired: Boolean(ca.is_required) && !isWeightCharacteristicName(attr.name),
        })),
      deleted: false, // Exclusões sem uso são físicas; itens usados ficam ativos=false.
    }));

    return mapped;
  } catch (error) {
    console.error('Erro ao buscar variações iniciais:', error);
    if (options.throwOnError) throw error;
    return [];
  }
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

export const saveVariation = async (
  variation: VariationType,
  options: { invalidate?: boolean } = {}
): Promise<string> => {
  return persistVariationDefinition(variation, options);
};

export const fetchVariationOptionByValue = async (
  attributeId: string,
  value: string
): Promise<VariationOption> => {
  const normalizedValue = capitalize(value.trim());
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


const invalidateVariationsQueries = () => {
  void queryClient
    .invalidateQueries({ queryKey: ['variations'] })
    .catch((error) => console.error('[Variations] Falha ao atualizar o cache:', error));
};

const persistVariationDefinition = async (
  variation: Partial<VariationType>,
  options: { invalidate?: boolean } = {}
): Promise<string> => {
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

  const { data, error } = await supabase.rpc('save_product_characteristic_definition', {
    p_definition: definition,
  });
  if (error) throw error;
  if (typeof data !== 'string' || !data) {
    throw new Error('O banco não retornou o identificador da característica salva.');
  }
  if (options.invalidate !== false) invalidateVariationsQueries();
  return data;
};

export const moveToTrash = async (id: string): Promise<'deactivated' | 'deleted'> => {
  const { data, error } = await supabase.rpc('delete_product_characteristic', {
    p_attribute_id: id,
  });
  if (error) throw error;
  invalidateVariationsQueries();
  return data === 'deactivated' ? 'deactivated' : 'deleted';
};

export const restoreVariation = async (_id: string): Promise<void> => {
  // Restauração segue indisponível até existir um fluxo explícito de reativação.
  console.warn('Restauração de variação não suportada no modelo relacional físico.');
};

export const permanentDeleteVariation = async (id: string): Promise<void> => {
  await moveToTrash(id);
};
