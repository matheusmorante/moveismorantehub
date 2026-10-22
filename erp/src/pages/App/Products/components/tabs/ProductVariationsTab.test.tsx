// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { Variation } from "@/pages/types/product.type";
import ProductVariationsTab from "./ProductVariationsTab";

const mocks = vi.hoisted(() => ({ checkVariationIsUsed: vi.fn() }));

vi.mock("@/pages/utils/productService", () => ({
	checkVariationIsUsed: mocks.checkVariationIsUsed,
}));

const makeVariation = (id: string, name: string): Variation => ({
	id,
	name,
	sku: `SKU-${id}`,
	stock: 1,
	unitPrice: 100,
	active: false,
	attributes: [],
	images: [],
});

describe("ProductVariationsTab and protected deletion", () => {
	beforeEach(() => {
		cleanup();
		mocks.checkVariationIsUsed.mockReset();
	});

	it("shows one locked variation without rendering the product mode control here", () => {
		render(
			<ProductVariationsTab
				formData={{
					name: "Mesa",
					hasVariations: false,
					images: ["https://img.test/mesa.jpg"],
				}}
				variations={[makeVariation("1", "Mesa")]}
				isExistingProduct={false}
			/>,
		);

		expect(
			screen.queryByRole("switch", { name: "Tipo do produto" }),
		).toBeNull();
		expect(screen.queryByText("Tipo do produto")).toBeNull();
		expect(
			(
				screen.getByRole("button", {
					name: "Editar características da variação",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	it("disables only the conventional variation linked to stock or sales", async () => {
		mocks.checkVariationIsUsed
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		render(
			<ProductVariationsTab
				formData={{ name: "Mesa", productKind: "normal", hasVariations: true }}
				variations={[
					makeVariation("1", "Mesa Carvalho"),
					makeVariation("2", "Mesa Nogueira"),
				]}
				isRegisteredProduct
				isExistingProduct
				isConventionalProduct
				onDeleteVariation={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(
				(
					screen.getByRole("button", {
						name: "Excluir variação SKU-1",
					}) as HTMLButtonElement
				).disabled,
			).toBe(false);
			expect(
				(
					screen.getByRole("button", {
						name: "Excluir variação SKU-2",
					}) as HTMLButtonElement
				).disabled,
			).toBe(true);
		});
	});

	it("exibe modal de aviso ao remover a penúltima variação (restando 1), alertando sobre produto simples e galeria", async () => {
		mocks.checkVariationIsUsed.mockResolvedValue(false);
		const onDeleteVariation = vi.fn();

		render(
			<ProductVariationsTab
				formData={{ name: "Mesa", productKind: "normal", hasVariations: true }}
				variations={[
					makeVariation("1", "Mesa Carvalho"),
					makeVariation("2", "Mesa Nogueira"),
				]}
				isRegisteredProduct
				isExistingProduct
				isConventionalProduct
				onDeleteVariation={onDeleteVariation}
			/>,
		);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Excluir variação SKU-1" }),
			).not.toBeNull();
		});

		// Clica no botão de excluir a variação 1 (restando apenas a 2)
		fireEvent.click(
			screen.getByRole("button", { name: "Excluir variação SKU-1" }),
		);

		// O modal deve ser exibido
		const dialog = screen.getByRole("dialog");
		expect(dialog).not.toBeNull();
		expect(
			screen.getByText("O produto se tornará um Produto Simples"),
		).not.toBeNull();
		expect(screen.getByText(/Mesa Carvalho/)).not.toBeNull();
		expect(screen.getByText(/Informações Básicas/)).not.toBeNull();
		expect(
			screen.getByText(/não serão excluídas da aba Galeria/),
		).not.toBeNull();
		expect(
			screen.getByText(/alterar ou remover as fotos manualmente/),
		).not.toBeNull();

		// Testa cancelar: fecha modal e não chama onDeleteVariation
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(onDeleteVariation).not.toHaveBeenCalled();

		// Clica novamente e confirma
		fireEvent.click(
			screen.getByRole("button", { name: "Excluir variação SKU-1" }),
		);
		expect(screen.getByRole("dialog")).not.toBeNull();
		fireEvent.click(
			screen.getByRole("button", { name: /Confirmar e Tornar Simples/i }),
		);

		await waitFor(() => {
			expect(onDeleteVariation).toHaveBeenCalledWith("1", true);
		});
	});

	it("NÃO exibe modal de aviso quando o produto possui 3 ou mais variações", async () => {
		mocks.checkVariationIsUsed.mockResolvedValue(false);
		const onDeleteVariation = vi.fn();

		render(
			<ProductVariationsTab
				formData={{ name: "Mesa", productKind: "normal", hasVariations: true }}
				variations={[
					makeVariation("1", "Mesa Carvalho"),
					makeVariation("2", "Mesa Nogueira"),
					makeVariation("3", "Mesa Mogno"),
				]}
				isRegisteredProduct
				isExistingProduct
				isConventionalProduct
				onDeleteVariation={onDeleteVariation}
			/>,
		);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Excluir variação SKU-1" }),
			).not.toBeNull();
		});

		// Clica para excluir variação 1 (ainda sobram 2 variações)
		fireEvent.click(
			screen.getByRole("button", { name: "Excluir variação SKU-1" }),
		);

		// Não deve abrir o modal de conversão para simples
		expect(screen.queryByRole("dialog")).toBeNull();
		// Chama direto a exclusão padrão
		expect(onDeleteVariation).toHaveBeenCalledWith("1");
	});

	it("permite exclusão com modal durante o cadastro de novo produto (isRegisteredProduct = false)", async () => {
		const removeVariation = vi.fn();

		render(
			<ProductVariationsTab
				formData={{ name: "Mesa Nova", hasVariations: true }}
				variations={[
					makeVariation("1", "Tamanho P"),
					makeVariation("2", "Tamanho M"),
				]}
				isRegisteredProduct={false}
				isExistingProduct={false}
				removeVariation={removeVariation}
			/>,
		);

		// O botão de exclusão deve estar presente para ambas as variações
		const deleteBtn = screen.getByRole("button", {
			name: "Excluir variação SKU-1",
		});
		expect(deleteBtn).not.toBeNull();

		// Clicar no botão abre o modal de aviso de conversão para simples
		fireEvent.click(deleteBtn);
		expect(screen.getByRole("dialog")).not.toBeNull();
		expect(
			screen.getByText("O produto se tornará um Produto Simples"),
		).not.toBeNull();

		// Confirmar chama removeVariation com o id da variação
		fireEvent.click(
			screen.getByRole("button", { name: /Confirmar e Tornar Simples/i }),
		);

		await waitFor(() => {
			expect(removeVariation).toHaveBeenCalledWith("1");
		});
	});
});
