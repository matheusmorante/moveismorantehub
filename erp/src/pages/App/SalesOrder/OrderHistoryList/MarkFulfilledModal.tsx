interface MarkFulfilledModalProps {
    onCancel: () => void;
    onConfirm: () => void;
}

const MarkFulfilledModal = ({ onCancel, onConfirm }: MarkFulfilledModalProps) => {
    if (typeof document === "undefined") return null;
    return createPortal(<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4" onClick={onCancel}>
        <section role="dialog" aria-modal="true" aria-labelledby="mark-fulfilled-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <h2 id="mark-fulfilled-title" className="text-base font-black text-slate-800 dark:text-slate-100">Marcar pedido como atendido?</h2>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Não</button><button type="button" onClick={onConfirm} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700">Sim</button></div>
        </section>
    </div>, document.body);
};

export default MarkFulfilledModal;
import { createPortal } from "react-dom";
