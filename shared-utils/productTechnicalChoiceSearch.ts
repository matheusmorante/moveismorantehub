import { normalizeSearchTerm } from './productText';
import { matchesSearchText } from './searchText';
import {
  PRODUCT_TECHNICAL_CHOICE_SEARCH_MAX_RESULTS,
  PRODUCT_TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS,
} from './productTechnicalFieldRules';

export interface ProductTechnicalChoiceOption {
  readonly id?: string;
  readonly value: string;
}

/** Filters already-loaded technical options and caps the visible suggestions. */
export const searchProductTechnicalChoiceOptions = <Option extends ProductTechnicalChoiceOption>(
  options: readonly Option[],
  query: string
): Option[] => {
  const term = normalizeSearchTerm(query);
  if (term.length < PRODUCT_TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS) return [];

  return options
    .filter((option) => matchesSearchText(option.value, term))
    .slice(0, PRODUCT_TECHNICAL_CHOICE_SEARCH_MAX_RESULTS);
};
