import {
  TechnicalFieldDefinition,
  getAvailableAdditionalFields,
  CHARACTERISTIC_TOPIC_GROUPS,
  CharacteristicTopicGroupDefinition,
  isDrawerQuantityCharacteristic,
  isDoorQuantityCharacteristic,
  isHasDrawersCharacteristic,
  isHasDoorsCharacteristic,
  getCharacteristicDependencyState,
} from '@/pages/utils/technicalValuesService';
import {
  normalizeTechnicalName,
  normalizeSearchTerm,
} from './technicalTabUtils';
import { getTechnicalFieldDisplayName } from '../../../../../../../../shared-utils/productTechnicalFieldScope';

export interface GetDisplayedOptionalFieldsParams {
  readonly requiredFieldsOnly: boolean;
  readonly optionalFields: readonly TechnicalFieldDefinition[];
  readonly allTechnicalFields: readonly TechnicalFieldDefinition[];
  readonly filledOrManualOptionalFields: readonly TechnicalFieldDefinition[];
  readonly normalizedSearchTerm: string;
}

/**
 * Determina quais características opcionais devem ser exibidas em tela.
 * Respeita a regra de manter campos preenchidos ou manuais sempre visíveis,
 * mesmo quando a busca estiver ativa.
 */
export const getDisplayedOptionalFields = ({
  requiredFieldsOnly,
  filledOrManualOptionalFields,
}: GetDisplayedOptionalFieldsParams): TechnicalFieldDefinition[] => {
  if (requiredFieldsOnly) {
    return [];
  }

  // Campos opcionais entram na ficha somente após seleção/preenchimento ou adição pela busca.
  return [...filledOrManualOptionalFields];
};

/**
 * Filtra as características opcionais disponíveis no catálogo que correspondem
 * ao termo de busca debounced (exibidas como sugestões de adição).
 */
export const getMatchingOptionalFields = (
  allTechnicalFields: readonly TechnicalFieldDefinition[],
  requiredFields: readonly TechnicalFieldDefinition[],
  displayedOptionalFields: readonly TechnicalFieldDefinition[],
  requiredFieldsOnly: boolean,
  normalizedSearchTerm: string,
  normalizedDebouncedSearchTerm: string,
  limit = 3,
  technicalValues: Record<string, unknown> = {},
  productCategoryNames: readonly string[] = [],
  productCategoryIds: readonly string[] = []
): TechnicalFieldDefinition[] => {
  if (
    requiredFieldsOnly ||
    normalizedSearchTerm.length < 3 ||
    normalizedSearchTerm !== normalizedDebouncedSearchTerm
  ) {
    return [];
  }

  const requiredFieldNames = new Set(
    requiredFields.map((field) => normalizeTechnicalName(field.name))
  );
  const fieldsAlreadyDisplayed = [...requiredFields, ...displayedOptionalFields];
  const hasVisibleDoorQuantity = fieldsAlreadyDisplayed.some((field) =>
    isDoorQuantityCharacteristic(field.name)
  );
  const hasVisibleDrawerQuantity = fieldsAlreadyDisplayed.some((field) =>
    isDrawerQuantityCharacteristic(field.name)
  );
  const searchableOptionalFields = getAvailableAdditionalFields(allTechnicalFields, [
    ...requiredFields,
    ...displayedOptionalFields,
  ], productCategoryNames, productCategoryIds).filter((field) => {
    if (requiredFieldNames.has(normalizeTechnicalName(field.name))) return false;
    // Do not suggest dependent fields until their current master value enables them.
    const dependency = getCharacteristicDependencyState(field.name, technicalValues);
    if (dependency.isDependent && dependency.isDisabled) return false;
    // These master toggles are deliberately hidden once their quantity field is shown.
    // Do not offer a search result that disappears immediately after the user adds it.
    if (hasVisibleDoorQuantity && isHasDoorsCharacteristic(field.name)) return false;
    if (hasVisibleDrawerQuantity && isHasDrawersCharacteristic(field.name)) return false;
    return true;
  });
  const searchTokens = normalizedDebouncedSearchTerm.split(/\s+/).filter(Boolean);

  return searchableOptionalFields
    .filter((field) => {
      const fieldTokens = normalizeSearchTerm(getTechnicalFieldDisplayName(field.name))
        .split(/\s+/)
        .filter(Boolean);
      return searchTokens.every((searchToken) =>
        fieldTokens.some((fieldToken) => fieldToken.startsWith(searchToken))
      );
    })
    .slice(0, limit);
};

/**
 * Retorna grupos temáticos predefinidos (ex: Portas, Gavetas) correspondentes
 * ao termo pesquisado.
 */
export const getMatchingTopicGroups = (
  requiredFieldsOnly: boolean,
  normalizedSearchTerm: string,
  normalizedDebouncedSearchTerm: string
): CharacteristicTopicGroupDefinition[] => {
  if (
    requiredFieldsOnly ||
    normalizedSearchTerm.length < 3 ||
    normalizedSearchTerm !== normalizedDebouncedSearchTerm
  ) {
    return [];
  }

  return CHARACTERISTIC_TOPIC_GROUPS.filter((grp) =>
    grp.searchKeywords.some(
      (kw) =>
        normalizeSearchTerm(kw).includes(normalizedDebouncedSearchTerm) ||
        normalizedDebouncedSearchTerm.includes(normalizeSearchTerm(kw))
    )
  );
};
