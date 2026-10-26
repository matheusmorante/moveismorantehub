export type ProductVariationModeSnapshot = {
	isDraft?: unknown;
	is_draft?: unknown;
	status?: unknown;
	hasVariations?: unknown;
	has_variations?: unknown;
};

/**
 * Resolves whether a variation form is operating as a simple product.
 * Completed products derive mode from row count; drafts retain an explicitly
 * selected family mode so an incomplete family stays editable before row two.
 */
export const isSingleProductVariationFormMode = (
	product: ProductVariationModeSnapshot,
	variationCount: number,
	isCreatingVariation: boolean,
): boolean => {
	const isDraft =
		Boolean(product.isDraft) || Boolean(product.is_draft) || product.status === "draft";
	const retainsDraftFamilyMode =
		isDraft && Boolean(product.hasVariations ?? product.has_variations);
	const expectedVariationCount = isCreatingVariation ? 0 : 1;

	return !retainsDraftFamilyMode && variationCount === expectedVariationCount;
};
