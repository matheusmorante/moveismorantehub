import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import type VariationType from '../../types/variation.type';
import type { VariationOption } from '../../types/variation.type';
import { toTitleCase } from '../textUtils';
import { queryClient } from '@/lib/queryClient';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import { normalizeAttributeDataType } from '../attributeDataType';
import { normalizeCharacteristicText } from '../../../../../shared-utils/characteristicFormRules';
import { invalidateTechnicalFieldDefinitionsCache } from '@/pages/App/Products/services/technicalFieldService';

const PERSISTED_ATTRIBUTE_VALUE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const assertUniqueCharacteristicOptions = (options: readonly VariationOption[]) => {
  const values = options.map((option) => normalizeCharacteristicText(option.value));
  if (new Set(values).size !== values.length) {
    throw new Error('As opções não podem ter nomes duplicados.');
  }
};

/** Set invalidateVariationQueries=false only when the caller awaits its own list refresh. */
export const invalidateVariationsQueries = (
  options: { invalidateVariationQueries?: boolean } = {},
) => {
  invalidateTechnicalFieldDefinitionsCache();
  if (options.invalidateVariationQueries === false) return;
  void queryClient
    .invalidateQueries({ queryKey: ['variations'] })
    .catch((error) => console.error('[Variations] Falha ao atualizar o cache:', error));
};

export const getVariationErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

export const saveVariation = async (
  variation: VariationType,
  options: { invalidate?: boolean; invalidateVariationQueries?: boolean } = {},
): Promise<string> => persistVariationDefinition(variation, options);

export const updateVariation = async (
  id: string,
  variationToUpdate: Partial<VariationType>,
): Promise<void> => {
  await persistVariationDefinition({ id, ...variationToUpdate } as VariationType);
};

export const saveCharacteristicOptions = async (
  attributeId: string,
  options: readonly VariationOption[],
  invalidation: { invalidateVariationQueries?: boolean } = {},
): Promise<VariationOption[]> => {
  assertUniqueCharacteristicOptions(options);

  const { data, error } = await supabase.rpc('save_characteristic_options', {
    p_attribute_id: attributeId,
    p_options: options.map((option, sortOrder) => ({
      ...option,
      value: PERSISTED_ATTRIBUTE_VALUE_ID.test(option.id)
        ? option.value
        : toTitleCase(option.value.trim()),
      active: option.active !== false,
      sortOrder,
    })),
  });
  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('O banco não retornou as opções salvas da característica.');
  }

  const savedOptions = data.map((option: Record<string, unknown>) => {
    if (typeof option.id !== 'string' || typeof option.value !== 'string') {
      throw new Error('O banco retornou uma opção inválida.');
    }
    return {
      id: option.id,
      value: option.value,
      active: option.active !== false,
      sortOrder: typeof option.sortOrder === 'number' ? option.sortOrder : undefined,
    };
  });
  const normalizedSavedValues = new Set(
    savedOptions.map((option) => option.value.trim().toLocaleLowerCase('pt-BR')),
  );
  if (
    savedOptions.length !== options.length ||
    options.some((option) => !normalizedSavedValues.has(option.value.trim().toLocaleLowerCase('pt-BR')))
  ) {
    throw new Error('O banco não confirmou todas as opções. Atualize a lista antes de tentar novamente.');
  }
  invalidateVariationsQueries(invalidation);
  return savedOptions;
};

const persistVariationDefinition = async (
  variation: Partial<VariationType>,
  options: { invalidate?: boolean; invalidateVariationQueries?: boolean } = {},
): Promise<string> => {
  const definition: Record<string, unknown> = { ...variation };
  if (variation.dataType) definition.dataType = normalizeAttributeDataType(variation.dataType);
  if (variation.name !== undefined) {
    definition.name = toTitleCase(variation.name.trim());
    if (isCatalogNeverRequiredCharacteristicName(String(definition.name))) {
      definition.isGloballyRequired = false;
      if (Array.isArray(definition.categoryAttributes)) {
        definition.categoryAttributes = (
          definition.categoryAttributes as Array<Record<string, unknown>>
        ).map((link) => ({ ...link, isRequired: false }));
      }
      if (Array.isArray(definition.categoryApplications)) {
        definition.categoryApplications = (
          definition.categoryApplications as Array<Record<string, unknown>>
        ).map((application) => ({
          ...application,
          application:
            application.application === 'required' ? 'optional' : application.application,
        }));
      }
    }
  }
  if (variation.groupId !== undefined) definition.groupId = variation.groupId;
  if (variation.configuration !== undefined) {
    const configuration = { ...variation.configuration };
    delete configuration.dependencyLogic;
    definition.configuration = configuration;
  }
  if (variation.dependency !== undefined) definition.dependency = variation.dependency;
  if (variation.options !== undefined) {
    assertUniqueCharacteristicOptions(variation.options);
    definition.options = variation.options.map((option, index) => ({
      ...option,
      value: PERSISTED_ATTRIBUTE_VALUE_ID.test(option.id)
        ? option.value
        : toTitleCase(option.value.trim()),
      active: option.active !== false,
      sortOrder: index,
    }));
  }

  const usesExtendedDefinition =
    variation.groupId !== undefined ||
    variation.configuration !== undefined ||
    variation.dependency !== undefined ||
    variation.categoryApplications !== undefined;
  const { data, error } = await supabase.rpc(
    variation.dependencyAlternatives !== undefined
      ? 'save_product_characteristic_definition_v3'
      : usesExtendedDefinition
        ? 'save_product_characteristic_definition_v2'
        : 'save_product_characteristic_definition',
    { p_definition: definition },
  );
  if (error) throw error;
  if (typeof data !== 'string' || !data) {
    throw new Error('O banco não retornou o identificador da característica salva.');
  }
  if (options.invalidate !== false) invalidateVariationsQueries(options);
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
