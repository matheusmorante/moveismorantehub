import {
  TechnicalFieldDefinition,
  getAvailableAdditionalFields,
  CHARACTERISTIC_TOPIC_GROUPS,
  CharacteristicTopicGroupDefinition,
} from '@/pages/utils/technicalValuesService';
import {
  normalizeTechnicalName,
  normalizeSearchTerm,
} from './technicalTabUtils';

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
  limit = 3
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

  const searchableOptionalFields = getAvailableAdditionalFields(allTechnicalFields, [
    ...requiredFields,
    ...displayedOptionalFields,
  ]).filter((field) => !requiredFieldNames.has(normalizeTechnicalName(field.name)));

  return searchableOptionalFields
    .filter((field) =>
      normalizeSearchTerm(field.name).includes(normalizedDebouncedSearchTerm)
    )
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
