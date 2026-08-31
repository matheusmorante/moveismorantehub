import { createPortal } from "react-dom";

interface UndoFulfillmentModalProps {
    onCancel: () => void;
    onConfirm: () => void;
}

const UndoFulfillmentModal = ({ onCancel, onConfirm }: UndoFulfillmentModalProps) => {
    if (typeof document === "undefined") return null;
    return createPortal(<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4" onClick={onCancel}>
        <section role="dialog" aria-modal="true" aria-labelledby="undo-fulfilled-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><i className="bi bi-arrow-counterclockwise text-xl" /></div>
            <h2 id="undo-fulfilled-title" className="text-base font-black text-slate-800 dark:text-slate-100">Desfazer pedido atendido?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Nenhum dado, item ou valor deste pedido será alterado. Ele voltará para <strong>Agendado</strong> e poderá reaparecer no cronograma conforme a data do pedido e os filtros aplicados. Os resumos por IA também passarão a considerar o novo status.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button><button type="button" onClick={onConfirm} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-700">Desfazer atendido</button></div>
        </section>
    </div>, document.body);
};

export default UndoFulfillmentModal;
