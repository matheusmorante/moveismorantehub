// @vitest-environment happy-dom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VariationToSimpleWarningModal } from "./VariationToSimpleWarningModal";

describe("VariationToSimpleWarningModal", () => {
	beforeEach(() => {
		cleanup();
	});

	it("não renderiza quando isOpen é falso", () => {
		render(
			<VariationToSimpleWarningModal
				isOpen={false}
				onClose={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("exibe todos os avisos mandatórios quando aberto", () => {
		render(
			<VariationToSimpleWarningModal
				isOpen={true}
				onClose={vi.fn()}
				onConfirm={vi.fn()}
				variationName="Azul Cobalto"
				variationSku="SKU-AZUL-01"
			/>,
		);

		const dialog = screen.getByRole("dialog");
		expect(dialog).not.toBeNull();

		// Título e identificação da variação
		expect(
			screen.getByText("O produto se tornará um Produto Simples"),
		).not.toBeNull();
		expect(screen.getByText(/Azul Cobalto/)).not.toBeNull();
		expect(screen.getByText(/\(SKU-AZUL-01\)/)).not.toBeNull();

		// Aviso de produto simples e reversão em Informações Básicas
		expect(screen.getByText(/Conversão para Produto Simples:/)).not.toBeNull();
		expect(screen.getByText(/Informações Básicas/)).not.toBeNull();
		expect(screen.getByText(/"Com variações"/)).not.toBeNull();

		// Aviso de fotos do produto pai e persistência na Galeria
		expect(screen.getByText(/Fotos e Galeria do Produto:/)).not.toBeNull();
		expect(screen.getByText(/produto pai/)).not.toBeNull();
		expect(
			screen.getByText(/não serão excluídas da aba Galeria/),
		).not.toBeNull();
		expect(
			screen.getByText(/alterar ou remover as fotos manualmente/),
		).not.toBeNull();
	});

	it("chama onClose ao clicar em Cancelar", () => {
		const onClose = vi.fn();
		render(
			<VariationToSimpleWarningModal
				isOpen={true}
				onClose={onClose}
				onConfirm={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("chama onClose ao pressionar Escape", () => {
		const onClose = vi.fn();
		render(
			<VariationToSimpleWarningModal
				isOpen={true}
				onClose={onClose}
				onConfirm={vi.fn()}
			/>,
		);

		fireEvent.keyDown(window, { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("chama onConfirm ao submeter a confirmação", async () => {
		const onConfirm = vi.fn();
		render(
			<VariationToSimpleWarningModal
				isOpen={true}
				onClose={vi.fn()}
				onConfirm={onConfirm}
				variationId="var-123"
			/>,
		);

		const confirmBtn = screen.getByRole("button", {
			name: /Confirmar e Tornar Simples/i,
		});
		fireEvent.click(confirmBtn);

		// useZodForm validateAndRun executa de forma assíncrona
		await vi.waitFor(() => {
			expect(onConfirm).toHaveBeenCalledTimes(1);
		});
	});
});
