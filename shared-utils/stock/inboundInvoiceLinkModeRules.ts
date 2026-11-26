export interface InboundInvoiceProductSelection {
	matchedProductId?: string | null;
	matchedVariationId?: string | null;
	matched_product_id?: string | null;
	matched_variation_id?: string | null;
	compositionLinks?: ReadonlyArray<{
		productId?: string | null;
		product_id?: string | null;
	}> | null;
	composition_links?: ReadonlyArray<{
		productId?: string | null;
		product_id?: string | null;
	}> | null;
}

const hasIdentifier = (value?: string | null) => Boolean(value?.trim());

export function hasInboundInvoiceProductSelection(
	item: InboundInvoiceProductSelection,
	isComposition: boolean,
): boolean {
	if (isComposition) {
		const links = item.compositionLinks ?? item.composition_links ?? [];
		return links.some((link) =>
			hasIdentifier(link.productId ?? link.product_id),
		);
	}

	return (
		hasIdentifier(item.matchedProductId ?? item.matched_product_id) ||
		hasIdentifier(item.matchedVariationId ?? item.matched_variation_id)
	);
}
