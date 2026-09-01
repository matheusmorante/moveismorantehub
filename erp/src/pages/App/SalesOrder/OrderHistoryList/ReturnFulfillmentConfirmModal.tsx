import React from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";

type Props = { order: Order; onCancel: () => void; onConfirm: () => void };

const ReturnFulfillmentConfirmModal = ({ order, onCancel, onConfirm }: Props) => {
    const [seconds, setSeconds] = React.useState(5);
    React.useEffect(() => {
        if (!seconds) return;
        const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [seconds]);
    const unlinkedItems = (order.items || []).filter(item => !item.productId?.trim() || item.isTemporaryProduct);
    const hasUnregistered = unlinkedItems.length > 0;

    if (typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
            <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Confirmar devolução atendida?</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Ao atender este pedido de devolução, uma movimentação de entrada será gerada para os itens com produto cadastrado. Depois disso, esta devolução não poderá ser cancelada ou desfeita.</p>
                {hasUnregistered ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                        <div className="flex items-center gap-2 font-black">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 dark:text-amber-400 text-sm" />
                            <span>Itens sem cadastro detectados ({unlinkedItems.length})</span>
                        </div>
                        <p className="mt-1">Itens sem cadastro no sistema <strong>NÃO geram movimentação de estoque</strong> (nenhuma entrada será lançada para eles).</p>
                    </div>
                ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Itens sem cadastro no sistema não movimentam estoque.</p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Voltar</button>
                    <button type="button" disabled={seconds > 0} onClick={onConfirm} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{seconds ? `Aguarde ${seconds}s` : "Sim, gerar entrada"}</button>
                </div>
            </section>
        </div>, document.body
    );
};

export default ReturnFulfillmentConfirmModal;
