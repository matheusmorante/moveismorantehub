import type React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { flattenFormErrors, useZodForm } from "@/hooks/useZodForm";
import { variationToSimpleConfirmationSchema } from "../../../../../../../../shared-utils/productVariationOperationFormSchemas";

export interface VariationToSimpleWarningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirm: () => void | Promise<void>;
	readonly isDeleting?: boolean;
	readonly variationName?: string;
	readonly variationSku?: string;
	readonly variationId?: string;
}

/**
 * Modal de aviso exibido ao remover a penúltima variação (restando apenas 1),
 * convertendo o produto em Produto Simples.
 * Orienta o usuário sobre:
 * - Conversão para produto simples
 * - Possibilidade de reverter para 'Com variações' na aba 'Informações Básicas'
 * - Herança das fotos do produto pai (aba Galeria)
 * - Fotos da variação não são removidas automaticamente da Galeria e devem ser ajustadas manualmente se necessário
 */
export const VariationToSimpleWarningModal: React.FC<
	VariationToSimpleWarningModalProps
> = ({
	isOpen,
	onClose,
	onConfirm,
	isDeleting = false,
	variationName,
	variationSku,
	variationId = "default",
}) => {
	const form = useZodForm(variationToSimpleConfirmationSchema, {
		variationId,
		acknowledged: true,
	});

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isDeleting) {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isDeleting]);

	if (!isOpen) return null;

	const handleConfirmSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (isDeleting) return;

		await form.validateAndRun(
			{ variationId, acknowledged: true },
			async () => {
				await onConfirm();
			},
			(errors) => {
				const errorMessages = Object.values(flattenFormErrors(errors));
				if (errorMessages[0]) toast.error(errorMessages[0]);
			},
		);
	};

	const modalContent = (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="variation-to-simple-modal-title"
			className="fixed inset-0 z-[1000020] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
		>
			<button
				type="button"
				aria-label="Fechar aviso"
				className="absolute inset-0 cursor-default border-0 p-0 m-0 w-full h-full bg-transparent"
				onClick={isDeleting ? undefined : onClose}
			/>

			<div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
				<form onSubmit={handleConfirmSubmit} className="flex flex-col gap-5">
					{/* Cabeçalho */}
					<div className="flex items-start gap-4">
						<div
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
							aria-hidden="true"
						>
							<i className="bi bi-exclamation-triangle-fill text-2xl" />
						</div>
						<div className="flex-1">
							<h3
								id="variation-to-simple-modal-title"
								className="text-base font-black text-slate-900 dark:text-slate-100"
							>
								O produto se tornará um Produto Simples
							</h3>
							<p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
								Ao remover esta variação, restará apenas uma no cadastro.
							</p>
						</div>
					</div>

					{/* Destaque da variação sendo removida */}
					{(variationName || variationSku) && (
						<div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
							<span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
								Variação que será removida:
							</span>
							<p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
								{variationName || "Variação"}{" "}
								{variationSku ? (
									<span className="font-mono text-[11px] text-slate-500">
										({variationSku})
									</span>
								) : null}
							</p>
						</div>
					)}

					{/* Avisos Principais */}
					<div className="flex flex-col gap-3">
						{/* Aviso 1: Produto Simples e Reversão */}
						<div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-slate-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-slate-300">
							<i
								className="bi bi-box-seam text-blue-600 dark:text-blue-400 text-lg mt-0.5 shrink-0"
								aria-hidden="true"
							/>
							<div className="text-xs leading-relaxed">
								<span className="font-black text-blue-900 dark:text-blue-200">
									Conversão para Produto Simples:
								</span>{" "}
				A variação restante passará a herdar nome, preços, descrição e dimensões do produto pai. UUID/SKU, atributos e saldo da variação restante serão mantidos. O produto deixará de ter variações. Caso queira adicionar
								variações novamente depois, você poderá alterar o tipo de
								produto de volta para{" "}
								<strong className="text-blue-900 dark:text-blue-200">
									"Com variações"
								</strong>{" "}
								a qualquer momento na aba{" "}
								<strong className="text-blue-900 dark:text-blue-200">
									Informações Básicas
								</strong>
								.
							</div>
						</div>

						{/* Aviso 2: Fotos do Produto Pai e Galeria */}
						<div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-[#3b1900] dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
							<i
								className="bi bi-images text-amber-600 dark:text-amber-400 text-lg mt-0.5 shrink-0"
								aria-hidden="true"
							/>
							<div className="text-xs leading-relaxed">
								<span className="font-black">Fotos e Galeria do Produto:</span>{" "}
								O produto simples utilizará as fotos do{" "}
								<strong className="font-bold">produto pai</strong>. As fotos da
								variação removida{" "}
								<strong className="font-black">
									não serão excluídas da aba Galeria
								</strong>
								. Caso precise, acesse a aba{" "}
								<strong className="font-bold">Galeria</strong> para alterar ou
								remover as fotos manualmente.
							</div>
						</div>
					</div>

					{/* Botões de Ação */}
					<div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
						<button
							type="button"
							disabled={isDeleting}
							onClick={onClose}
							className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isDeleting}
							className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
						>
							{isDeleting ? (
								<>
									<i
										className="bi bi-arrow-repeat animate-spin text-sm"
										aria-hidden="true"
									/>
									<span>Removendo...</span>
								</>
							) : (
								<>
									<i className="bi bi-trash3 text-sm" aria-hidden="true" />
									<span>Confirmar e Tornar Simples</span>
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default VariationToSimpleWarningModal;
