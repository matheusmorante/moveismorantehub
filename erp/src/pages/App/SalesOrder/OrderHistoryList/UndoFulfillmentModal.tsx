import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface UndoFulfillmentModalProps {
    readonly onCancel: () => void;
    readonly onConfirm: () => void;
}

const UndoFulfillmentModal = ({ onCancel, onConfirm }: UndoFulfillmentModalProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCancel();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCancel]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar modal de desfazer atendimento"
                className="fixed inset-0 bg-slate-950/55 transition-opacity"
                onClick={onCancel}
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="undo-fulfillment-title"
                className="relative z-10 w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/70 dark:bg-slate-900"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    <i className="bi bi-arrow-counterclockwise text-xl" />
                </div>
                <h2 id="undo-fulfillment-title" className="text-base font-black text-slate-800 dark:text-slate-100">
                    Desfazer status de atendido?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    O pedido voltará para o status Agendado. As movimentações de estoque não serão alteradas.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all cursor-pointer bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-md shadow-amber-500/20"
                    >
                        Confirmar
                    </button>
                </div>
            </section>
        </div>,
        document.body
    );
};

export default UndoFulfillmentModal;
