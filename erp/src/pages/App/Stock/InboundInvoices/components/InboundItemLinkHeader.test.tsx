// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InboundInvoiceItem } from "@/pages/utils/inboundNfe/inboundNfeTypes";
import {
	InboundItemLinkHeader,
	type InboundItemLinkHeaderProps,
} from "./InboundItemLinkHeader";

afterEach(cleanup);

type HeaderOverrides = Partial<
	Pick<InboundItemLinkHeaderProps, "isComposition" | "compositionLinks">
> & {
	item?: Partial<InboundInvoiceItem>;
};

const renderHeader = (overrides: HeaderOverrides = {}) => {
	const item = {
		itemNumber: 1,
		productCode: "SKU-1",
		productDescription: "Produto de exemplo",
		...overrides.item,
	} as InboundInvoiceItem;

	render(
		<InboundItemLinkHeader
			item={item}
			isComposition={overrides.isComposition ?? false}
			quickRegisterDisabled={false}
			compositionLinks={overrides.compositionLinks || []}
			displaySellingPrice={100}
			onRequestQuickRegister={vi.fn()}
			onUpdateItem={vi.fn()}
		/>,
	);
};

describe("InboundItemLinkHeader mode lock", () => {
	it("locks Único while a normal product is selected", () => {
		renderHeader({ item: { matchedProductId: "product-1" } });

		const trigger = screen.getByRole("button", {
			name: "Modo de vínculo: Único",
		});
		expect(trigger.hasAttribute("disabled")).toBe(true);
		expect(trigger.getAttribute("title")).toBe(
			"Remova o produto vinculado antes de alterar o modo.",
		);
		fireEvent.click(trigger);
		expect(screen.queryByRole("menu", { name: "Modo de vínculo" })).toBeNull();
	});

	it("locks Composto while any component remains selected", () => {
		renderHeader({
			isComposition: true,
			item: {
				linkMode: "composition",
				compositionLinks: [{ productId: "component-1" }],
			},
			compositionLinks: [{ productId: "component-1" }],
		});

		const trigger = screen.getByRole("button", {
			name: "Modo de vínculo: Composto",
		});
		expect(trigger.hasAttribute("disabled")).toBe(true);
		expect(trigger.getAttribute("title")).toBe(
			"Remova o produto vinculado antes de alterar o modo.",
		);
	});

	it("keeps the selector available when no product is selected", () => {
		renderHeader();

		const trigger = screen.getByRole("button", {
			name: "Modo de vínculo: Único",
		});
		expect(trigger.hasAttribute("disabled")).toBe(false);
		fireEvent.click(trigger);
		expect(
			screen.getByRole("menu", { name: "Modo de vínculo" }),
		).not.toBeNull();
	});

	it("unlocks Composto after the last component is removed", () => {
		renderHeader({
			isComposition: true,
			item: { linkMode: "composition", compositionLinks: [] },
			compositionLinks: [],
		});

		const trigger = screen.getByRole("button", {
			name: "Modo de vínculo: Composto",
		});
		expect(trigger.hasAttribute("disabled")).toBe(false);
		fireEvent.click(trigger);
		expect(
			screen.getByRole("menu", { name: "Modo de vínculo" }),
		).not.toBeNull();
	});
});
