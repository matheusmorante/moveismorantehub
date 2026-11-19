import { describe, expect, it, vi } from "vitest";
import { resolveOrderItems } from "../../../../shared-utils/agentOrderHelpers";

type Product = {
	id: string;
	code: string;
	sku: string;
	name: string;
	unit_price: number;
	cost_price: number;
	product_variations?: Array<{ id: string; sku: string }>;
};

function makeSupabaseMock(options: {
	batchRows?: Product[];
	individualRows?: Record<string, Product | null>;
	batchError?: boolean;
}) {
	const calls: Array<{ filter?: string; batch: boolean }> = [];

	return {
		calls,
		supabase: {
			from: vi.fn(() => {
				const query: {
					filter?: string;
					batch: boolean;
					select: () => typeof query;
					eq: () => typeof query;
					or: (filter: string) => typeof query;
					limit: () => typeof query;
					maybeSingle: () => Promise<{ data: Product | null; error: null }>;
					then: (
						resolve: (value: {
							data: Product[] | null;
							error: { message: string } | null;
						}) => unknown,
						reject?: (reason: unknown) => unknown,
					) => Promise<unknown>;
				} = {
					batch: false,
					select: () => query,
					eq: () => query,
					or: (filter) => {
						query.filter = filter;
						query.batch = filter.includes(".in.(");
						calls.push({ filter, batch: query.batch });
						return query;
					},
					limit: () => query,
					maybeSingle: async () => ({
						data:
							options.individualRows?.[
								query.filter?.match(/code\.eq\.(.*?),sku\.eq\./)?.[1] || ""
							] || null,
						error: null,
					}),
					// biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
					then: (resolve, reject) =>
						Promise.resolve({
							data: options.batchError ? null : options.batchRows || [],
							error: options.batchError
								? { message: "batch unavailable" }
								: null,
						}).then(resolve, reject),
				};

				return query;
			}),
		},
	};
}

const product = (id: string, code: string, sku = `${code}-SKU`): Product => ({
	id,
	code,
	sku,
	name: `Produto ${code}`,
	unit_price: 20,
	cost_price: 8,
});

describe("resolveOrderItems product lookups", () => {
	it("keeps individual lookups for lists shorter than three identified items", async () => {
		const a = product("a", "A");
		const b = product("b", "B");
		const { supabase, calls } = makeSupabaseMock({
			individualRows: { A: a, B: b },
		});

		const items = await resolveOrderItems(supabase, [
			{ codigoOuSku: "A" },
			{ codigoOuSku: "B" },
		]);

		expect(calls).toHaveLength(2);
		expect(calls.every((call) => !call.batch)).toBe(true);
		expect(items.map((item) => item.productId)).toEqual(["a", "b"]);
	});

	it("uses one bounded lookup for three or more safe codes and keeps duplicate items in input order", async () => {
		const a = product("a", "A");
		const b = product("b", "B");
		const { supabase, calls } = makeSupabaseMock({ batchRows: [a, b] });

		const items = await resolveOrderItems(supabase, [
			{ codigoOuSku: "B" },
			{ codigoOuSku: "A" },
			{ codigoOuSku: "B", quantidade: 2 },
		]);

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			filter: "code.in.(B,A),sku.in.(B,A)",
			batch: true,
		});
		expect(items.map((item) => item.productId)).toEqual(["b", "a", "b"]);
		expect(items.map((item) => item.unitPrice)).toEqual([20, 20, 20]);
		expect(items.map((item) => item.quantity)).toEqual([1, 1, 2]);
	});

	it("splits more than 25 unique codes into bounded batches", async () => {
		const products = Array.from({ length: 26 }, (_, index) => {
			const code = `P${index}`;
			return product(`id-${index}`, code);
		});
		const { supabase, calls } = makeSupabaseMock({ batchRows: products });

		const items = await resolveOrderItems(
			supabase,
			products.map(({ code }) => ({ codigoOuSku: code })),
		);

		const batchSizes = calls.map(
			(call) =>
				call.filter?.match(/^code\.in\.\((.*?)\),sku\.in\./)?.[1].split(",")
					.length,
		);
		expect(calls).toHaveLength(2);
		expect(batchSizes).toEqual([25, 1]);
		expect(items.map((item) => item.productId)).toEqual(
			products.map(({ id }) => id),
		);
	});

	it("falls back to the single lookup when the batch request fails", async () => {
		const a = product("a", "A");
		const b = product("b", "B");
		const c = product("c", "C");
		const { supabase, calls } = makeSupabaseMock({
			batchError: true,
			individualRows: { A: a, B: b, C: c },
		});

		const items = await resolveOrderItems(supabase, [
			{ codigoOuSku: "A" },
			{ codigoOuSku: "B" },
			{ codigoOuSku: "C" },
		]);

		expect(calls).toHaveLength(4);
		expect(calls[0].batch).toBe(true);
		expect(calls.slice(1).every((call) => !call.batch)).toBe(true);
		expect(items.map((item) => item.productId)).toEqual(["a", "b", "c"]);
	});

	it("falls back to individual lookups when the batch response reaches its cap", async () => {
		const unrelatedRows = Array.from({ length: 100 }, (_, index) =>
			product(`other-${index}`, `OTHER-${index}`),
		);
		const a = product("a", "A");
		const b = product("b", "B");
		const c = product("c", "C");
		const { supabase, calls } = makeSupabaseMock({
			batchRows: unrelatedRows,
			individualRows: { A: a, B: b, C: c },
		});

		const items = await resolveOrderItems(supabase, [
			{ codigoOuSku: "A" },
			{ codigoOuSku: "B" },
			{ codigoOuSku: "C" },
		]);

		expect(calls).toHaveLength(4);
		expect(calls[0].batch).toBe(true);
		expect(calls.slice(1).every((call) => !call.batch)).toBe(true);
		expect(items.map((item) => item.productId)).toEqual(["a", "b", "c"]);
	});

	it("retains the first variation from the legacy single lookup", async () => {
		const batchProduct = {
			...product("a", "A"),
			product_variations: [
				{ id: "batch-first", sku: "A-BATCH-FIRST" },
				{ id: "batch-second", sku: "A-BATCH-SECOND" },
			],
		};
		const individualProduct = {
			...product("a", "A"),
			product_variations: [
				{ id: "legacy-first", sku: "A-LEGACY-FIRST" },
				{ id: "legacy-second", sku: "A-LEGACY-SECOND" },
			],
		};
		const { supabase, calls } = makeSupabaseMock({
			batchRows: [batchProduct, product("b", "B"), product("c", "C")],
			individualRows: { A: individualProduct },
		});

		const items = await resolveOrderItems(supabase, [
			{ codigoOuSku: "A" },
			{ codigoOuSku: "B" },
			{ codigoOuSku: "C" },
		]);

		expect(calls).toHaveLength(2);
		expect(calls[0].batch).toBe(true);
		expect(calls[1]).toMatchObject({
			filter: "code.eq.A,sku.eq.A",
			batch: false,
		});
		expect(items[0].variationId).toBe("legacy-first");
		expect(items[0].sku).toBe("A-LEGACY-FIRST");
	});

	it("does not choose a product when the same code matches more than one row", async () => {
		const { supabase, calls } = makeSupabaseMock({
			batchRows: [
				product("one", "DUP"),
				product("two", "OTHER", "DUP"),
				product("three", "A"),
				product("four", "B"),
			],
		});

		const items = await resolveOrderItems(supabase, [
			{ codigoOuSku: "DUP" },
			{ codigoOuSku: "A" },
			{ codigoOuSku: "B" },
		]);

		expect(calls).toHaveLength(1);
		expect(items[0]).not.toHaveProperty("productId");
		expect(items[0].code).toBe("DUP");
		expect(items[1].productId).toBe("three");
		expect(items[2].productId).toBe("four");
	});

	it("keeps individual lookups for short lists and values that are unsafe in a batch filter", async () => {
		const a = product("a", "A.1");
		const b = product("b", "B.2");
		const c = product("c", "C.3");
		const { supabase, calls } = makeSupabaseMock({
			individualRows: { "A.1": a, "B.2": b, "C.3": c },
		});

		const items = await resolveOrderItems(supabase, [
			{ codigoOuSku: "A.1" },
			{ codigoOuSku: "B.2" },
			{ codigoOuSku: "C.3" },
		]);

		expect(calls).toHaveLength(3);
		expect(calls.every((call) => !call.batch)).toBe(true);
		expect(items.map((item) => item.productId)).toEqual(["a", "b", "c"]);
	});
});
