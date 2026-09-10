import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";
import { formatOrderCode } from "../../../utils/orderCode";

interface CancelReturnModalProps {
    order: Order;
    onCancel: () => void;
    onConfirm: () => void;
}

const CancelReturnModal = ({ order, onCancel, onConfirm }: CancelReturnModalProps) => {
    const [secondsLeft, setSecondsLeft] = useState(5);
    const isFulfilled = order.status === "fulfilled";
    const actionTitle = isFulfilled ? "Estornar esta devolução?" : "Cancelar esta devolução?";
    const buttonLabel = isFulfilled ? "Estornar devolução" : "Cancelar devolução";

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const timer = setInterval(() => {
            setSecondsLeft((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [secondsLeft]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4" onClick={onCancel}>
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-return-title"
                className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/70 dark:bg-slate-900"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    <i className="bi bi-exclamation-triangle-fill text-xl" />
                </div>
                <h2 id="cancel-return-title" className="text-base font-black text-slate-800 dark:text-slate-100">
                    {actionTitle} (#{formatOrderCode(order)})
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Ao confirmar, a movimentação de entrada no estoque gerada por esta devolução será imediatamente estornada. Os produtos cadastrados deixarão de ter seu saldo somado no estoque por este documento.
                </p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-red-700 dark:text-red-300">
                    {isFulfilled 
                        ? "Esta devolução atendida será marcada como ESTORNADA. Esta ação é definitiva e não poderá ser desfeita."
                        : "Esta devolução agendada será marcada como CANCELADA. Esta ação é definitiva e não poderá ser desfeita."}
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Voltar
                    </button>
                    <button
                        type="button"
                        disabled={secondsLeft > 0}
                        onClick={onConfirm}
                        className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all ${
                            secondsLeft > 0
                                ? "cursor-not-allowed bg-red-400 opacity-60 dark:bg-red-900/60 dark:text-red-300"
                                : "cursor-pointer bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20"
                        }`}
                    >
                        {secondsLeft > 0 ? `${buttonLabel} (${secondsLeft}s)` : buttonLabel}
                    </button>
                </div>
            </section>
        </div>,
        document.body
    );
};

export default CancelReturnModal;
