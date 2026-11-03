import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("../../supabaseClient", () => ({ supabase: { from: mocks.from } }));

import { updateInboundInvoiceMappings } from "./inboundInvoiceMappingsService";

const INVOICE_ID = "00000000-0000-4000-8000-000000000001";
const SUPPLIER_ID = "00000000-0000-4000-8000-000000000002";

const makeInvoiceItem = (linked: boolean) => ({
	itemNumber: 1,
	productCode: "EXT-1",
	productDescription: "Produto da NF",
	quantity: 1,
	unitCost: 100,
	totalCost: 100,
	linkMode: "single" as const,
	matchedProductId: linked ? "00000000-0000-4000-8000-000000000003" : undefined,
	matchedVariationId: linked
		? "00000000-0000-4000-8000-000000000004"
		: undefined,
	compositionLinks: [],
});

type SetupOptions = {
	persistNormalizedRows?: boolean;
	returnWriteRepresentations?: boolean;
	returnWriteErrors?: boolean;
};

const setupSupabase = (items: unknown[], options: SetupOptions = {}) => {
	let normalizedRows: unknown[] = [];
	let savedItems = items;
	let savedSupplierId: string | null = SUPPLIER_ID;

	mocks.from.mockImplementation((table: string) => {
		let action = "";
		let selectedColumns = "";
		let filteredIds: string[] = [];
		let writePayload:
			| { itens: unknown[]; supplier_id: string | null }
			| undefined;
		const query: Record<string, unknown> = {};
		query.select = vi.fn((columns: string) => {
			selectedColumns = columns;
			return query;
		});
		query.eq = vi.fn(() => query);
		query.in = vi.fn((_column: string, values: string[]) => {
			filteredIds = values;
			return query;
		});
		query.update = vi.fn(
			(payload: { itens: unknown[]; supplier_id: string | null }) => {
				action = "update";
				writePayload = payload;
				savedItems = payload.itens;
				savedSupplierId = payload.supplier_id;
				return query;
			},
		);
		query.upsert = vi.fn((rows: unknown[]) => {
			action = "upsert";
			if (options.persistNormalizedRows !== false) normalizedRows = rows;
			return query;
		});
		query.maybeSingle = vi.fn(async () => {
			if (table === "people")
				return { data: { stock_origins: ["Normal"] }, error: null };
			if (table !== "inbound_invoices") return { data: null, error: null };
			if (action === "update") {
				return {
					data: options.returnWriteRepresentations
						? {
								id: INVOICE_ID,
								supplier_id: writePayload?.supplier_id,
								itens: writePayload?.itens,
							}
						: null,
					error: options.returnWriteErrors
						? new Error("Resposta ambígua do update")
						: null,
				};
			}
			if (selectedColumns.includes("supplier:people")) {
				return {
					data: {
						id: INVOICE_ID,
						supplier_id: SUPPLIER_ID,
						supplier: { stock_origins: ["Normal"] },
					},
					error: null,
				};
			}
			return {
				data: {
					id: INVOICE_ID,
					supplier_id: savedSupplierId,
					itens: savedItems,
					inbound_invoice_items: normalizedRows,
				},
				error: null,
			};
		});
		// biome-ignore lint/suspicious/noThenProperty: Supabase builders are thenable and the service awaits this query.
		query.then = (
			resolve: (value: { data: unknown; error: Error | null }) => unknown,
			reject?: (reason: unknown) => unknown,
		) =>
			Promise.resolve(
				table === "product_variations"
					? { data: filteredIds.map((id) => ({ id })), error: null }
					: {
							data: null,
							error: options.returnWriteErrors
								? new Error("Resposta ambígua do upsert")
								: null,
						},
			).then(resolve, reject);
		return query;
	});
};

describe("updateInboundInvoiceMappings", () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([
		["vínculo", makeInvoiceItem(true)],
		["desvínculo", makeInvoiceItem(false)],
	])(
		"confirma o %s persistido quando o servidor não devolve representação da gravação",
		async (_label, item) => {
			setupSupabase([item]);

			const savedItems = await updateInboundInvoiceMappings(INVOICE_ID, SUPPLIER_ID, [item]);
			expect(savedItems).toHaveLength(1);
			expect(savedItems[0]).toMatchObject({
				matchedProductId: item.matchedProductId,
				matchedVariationId: item.matchedVariationId,
			});
		},
	);

	it("não exibe falha quando update e upsert retornam erro, mas a leitura confirma o vínculo", async () => {
		const item = makeInvoiceItem(true);
		setupSupabase([item], { returnWriteErrors: true });

		const savedItems = await updateInboundInvoiceMappings(INVOICE_ID, SUPPLIER_ID, [item]);
		expect(savedItems).toHaveLength(1);
		expect(savedItems[0]).toMatchObject({ matchedVariationId: item.matchedVariationId });
	});

	it("mantém a falha quando a leitura posterior não confirma as linhas normalizadas", async () => {
		const item = makeInvoiceItem(true);
		setupSupabase([item], { persistNormalizedRows: false });

		await expect(
			updateInboundInvoiceMappings(INVOICE_ID, SUPPLIER_ID, [item]),
		).rejects.toThrow(
			"A gravação dos itens normalizados não foi confirmada pelo servidor.",
		);
	});
});
