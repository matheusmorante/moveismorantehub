export interface SimpleProductParentInheritanceFields {
	name?: unknown;
	title?: unknown;
	marketplaceTitle?: unknown;
	description?: unknown;
	stock?: unknown;
	unitPrice?: unknown;
	unit_price?: unknown;
	price?: unknown;
	promoPrice?: unknown;
	promo_price?: unknown;
	costPrice?: unknown;
	cost_price?: unknown;
	condition?: unknown;
	fiscal?: unknown;
	width?: unknown;
	height?: unknown;
	depth?: unknown;
	weight?: unknown;
	ipiPercent?: unknown;
	ipiType?: unknown;
	freightCost?: unknown;
	freightType?: unknown;
	finalPurchasePrice?: unknown;
	minStock?: unknown;
	images?: unknown;
}

export interface SimpleProductVariationInheritanceOptions {
	preserveVariationStock?: boolean;
	preserveVariationAttributes?: boolean;
}

/** Applies the parent values and synchronization flags used by a simple product's sole variation. */
export const inheritSimpleProductVariationFromParent = <TVariation extends object>(
	parent: SimpleProductParentInheritanceFields,
	variation: TVariation,
	options: SimpleProductVariationInheritanceOptions = {},
): TVariation => {
	const parentFields = parent as Record<string, unknown>;
	const variationFields = variation as Record<string, unknown>;
	const parentUnitPrice =
		parentFields.unitPrice || parentFields.unit_price || parentFields.price || 0;
	const variationAttributes = variationFields.attributes;
	const attributes = options.preserveVariationAttributes
		? Array.isArray(variationAttributes)
			? variationAttributes.map((attribute) =>
					attribute && typeof attribute === "object" && !Array.isArray(attribute)
						? { ...attribute }
						: attribute,
				)
			: variationAttributes
		: [];

	return {
		...variationFields,
		name: parentFields.name || parentFields.title || parentFields.description || "",
		title: parentFields.title || parentFields.name || "",
		marketplaceTitle:
			parentFields.marketplaceTitle || parentFields.title || parentFields.name || "",
		stock: options.preserveVariationStock
			? variationFields.stock
			: Number(parentFields.stock || 0),
		price: Number(parentUnitPrice),
		unitPrice: Number(parentUnitPrice),
		promoPrice: Number(parentFields.promoPrice || parentFields.promo_price || 0),
		costPrice: Number(parentFields.costPrice || parentFields.cost_price || 0),
		condition: parentFields.condition || "novo",
		description: parentFields.description || "",
		fiscal:
			parentFields.fiscal && typeof parentFields.fiscal === "object"
				? { ...parentFields.fiscal }
				: undefined,
		width: Number(parentFields.width || 0),
		height: Number(parentFields.height || 0),
		depth: Number(parentFields.depth || 0),
		weight: Number(parentFields.weight || 0),
		ipiPercent: Number(parentFields.ipiPercent || 0),
		ipiType: parentFields.ipiType || "percentage",
		freightCost: Number(parentFields.freightCost || 0),
		freightType: parentFields.freightType || "fixed",
		finalPurchasePrice: Number(parentFields.finalPurchasePrice || 0),
		minStock: Number(parentFields.minStock || 0),
		attributes,
		images: Array.isArray(parentFields.images) ? [...parentFields.images] : [],
		syncUnitPrice: true,
		syncPromoPrice: true,
		syncCostPrice: true,
		syncCondition: true,
		syncDescription: true,
		syncFiscal: true,
		syncNcm: true,
		syncWithParent: true,
		syncDimensions: true,
		syncWidth: true,
		syncHeight: true,
		syncDepth: true,
		syncWeight: true,
		syncIpi: true,
		syncFreight: true,
	} as TVariation;
};
