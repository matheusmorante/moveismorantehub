import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ReturnConfirmationModalProps {
    onCancel: () => void;
    onConfirm: () => void;
}

const ReturnConfirmationModal = ({ onCancel, onConfirm }: ReturnConfirmationModalProps) => {
    const [secondsLeft, setSecondsLeft] = useState(5);

    useEffect(() => {
        if (secondsLeft === 0) return;
        const timer = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [secondsLeft]);

    if (typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4" onClick={onCancel}>
            <section role="dialog" aria-modal="true" aria-labelledby="return-confirmation-title" className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/70 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><i className="bi bi-arrow-return-left text-xl" /></div>
                <h2 id="return-confirmation-title" className="text-base font-black text-slate-800 dark:text-slate-100">Gerar devolução?</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">A devolução cria um registro próprio. Nele você escolherá os itens e as quantidades devolvidos. O valor final e a quantidade definidos para cada item serão descontados desta venda nas análises e relatórios.</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">A movimentação de saída original permanece preservada. Quando a devolução for atendida, a entrada correspondente será registrada no estoque.</p>
                <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button><button type="button" disabled={secondsLeft > 0} onClick={onConfirm} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-amber-700">{secondsLeft > 0 ? `Aguarde ${secondsLeft}s` : "Sim, continuar"}</button></div>
            </section>
        </div>,
        document.body
    );
};

export default ReturnConfirmationModal;
