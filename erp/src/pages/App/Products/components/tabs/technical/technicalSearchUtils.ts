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
  optionalFields,
  allTechnicalFields,
  filledOrManualOptionalFields,
  normalizedSearchTerm,
}: GetDisplayedOptionalFieldsParams): TechnicalFieldDefinition[] => {
  if (requiredFieldsOnly) {
    return [];
  }

  if (!normalizedSearchTerm) {
    return [...optionalFields];
  }

  // Quando há pesquisa ativa:
  // 1. Mantém SEMPRE visíveis todos os campos preenchidos/selecionados
  const visibleMap = new Map<string, TechnicalFieldDefinition>();
  filledOrManualOptionalFields.forEach((f) => visibleMap.set(f.name, f));

  // 2. Adiciona campos opcionais aplicáveis que coincidem com o termo pesquisado
  optionalFields.forEach((f) => {
    if (normalizeSearchTerm(f.name).includes(normalizedSearchTerm)) {
      visibleMap.set(f.name, f);
    }
  });

  // 3. Adiciona características globais do catálogo que coincidem com a busca
  allTechnicalFields.forEach((f) => {
    if (!f.isRequired && normalizeSearchTerm(f.name).includes(normalizedSearchTerm)) {
      if (!visibleMap.has(f.name)) {
        visibleMap.set(f.name, f);
      }
    }
  });

  return Array.from(visibleMap.values());
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
