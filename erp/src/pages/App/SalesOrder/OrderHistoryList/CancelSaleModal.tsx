import { createPortal } from "react-dom";

interface CancelSaleModalProps {
    onCancel: () => void;
    onConfirm: () => void;
}

const CancelSaleModal = ({ onCancel, onConfirm }: CancelSaleModalProps) => {
    if (typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4" onClick={onCancel}>
            <section role="dialog" aria-modal="true" aria-labelledby="cancel-sale-title" className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/70 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"><i className="bi bi-exclamation-triangle-fill text-xl" /></div>
                <h2 id="cancel-sale-title" className="text-base font-black text-slate-800 dark:text-slate-100">Cancelar esta venda?</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Ao confirmar, a saída de estoque vinculada será estornada. Os produtos deixarão de ter o saldo reduzido por esta venda e as movimentações de estoque serão atualizadas para registrar o cancelamento.</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-red-700 dark:text-red-300">Esta ação é definitiva: uma venda cancelada não pode mais ser editada nem ter o status alterado. Caso precise corrigir ou refazer a operação, duplique o pedido e trabalhe na nova venda.</p>
                <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Voltar</button><button type="button" onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-red-700">Cancelar venda</button></div>
            </section>
        </div>,
        document.body
    );
};

export default CancelSaleModal;
