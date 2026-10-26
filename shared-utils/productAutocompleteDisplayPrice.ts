export interface ProductAutocompleteDisplayPriceInput {
  parentPromoPrice?: number | null;
  parentUnitPrice?: number | null;
  variationPromoPrice?: number | null;
  variationUnitPrice?: number | null;
}

/** Mirrors the ERP autocomplete's promotion-first price shown in a suggestion. */
export const resolveProductAutocompleteDisplayPrice = ({
  parentPromoPrice,
  parentUnitPrice,
  variationPromoPrice,
  variationUnitPrice,
}: ProductAutocompleteDisplayPriceInput): number =>
  variationPromoPrice || variationUnitPrice || parentPromoPrice || parentUnitPrice || 0;
