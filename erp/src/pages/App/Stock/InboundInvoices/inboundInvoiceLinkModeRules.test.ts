import { describe, expect, it } from "vitest";
import { hasInboundInvoiceProductSelection } from "../../../../../../shared-utils/inboundInvoiceLinkModeRules";

describe("hasInboundInvoiceProductSelection", () => {
	it("locks a single link mode while a product or variation is selected", () => {
		expect(
			hasInboundInvoiceProductSelection(
				{ matchedProductId: "product-1" },
				false,
			),
		).toBe(true);
		expect(
			hasInboundInvoiceProductSelection(
				{ matchedVariationId: "variation-1" },
				false,
			),
		).toBe(true);
		expect(hasInboundInvoiceProductSelection({}, false)).toBe(false);
	});

	it("keeps composition mode locked until every selected component is removed", () => {
		expect(
			hasInboundInvoiceProductSelection(
				{ compositionLinks: [{ productId: "product-1" }] },
				true,
			),
		).toBe(true);
		expect(
			hasInboundInvoiceProductSelection({ compositionLinks: [] }, true),
		).toBe(false);
		expect(
			hasInboundInvoiceProductSelection(
				{ composition_links: [{ product_id: "product-1" }] },
				true,
			),
		).toBe(true);
	});
});
