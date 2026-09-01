import React from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";

type Props = {
    order: Order;
    onStatusUpdate: (id: string, status: Order["status"]) => void;
    onCloseMenu: () => void;
};

const CancelScheduledSaleButton = ({ order, onStatusUpdate, onCloseMenu }: Props) => {
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [seconds, setSeconds] = React.useState(3);

    React.useEffect(() => {
        if (!isConfirmOpen || seconds === 0) return;
        const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [isConfirmOpen, seconds]);

    if (order.orderType !== "sale" || order.status !== "scheduled" || !order.id) return null;

    return (
        <>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setSeconds(3);
                    setIsConfirmOpen(true);
                    onCloseMenu();
                }}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-rose-600 transition-all hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                title="Cancelar venda agendada"
            >
                <i className="bi bi-x-circle-fill text-lg" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cancelar venda</span>
            </button>
            {isConfirmOpen && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setIsConfirmOpen(false)}>
                    <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl dark:border-rose-950/50 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40"><i className="bi bi-exclamation-octagon-fill text-xl" /></div>
                        <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">Cancelar venda?</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">As saídas de estoque vinculadas serão estornadas quando existirem. O cancelamento é definitivo e não pode ser revertido; para refazer a venda, crie um novo pedido.</p>
                        <div className="mt-6 flex gap-3">
                            <button type="button" onClick={() => setIsConfirmOpen(false)} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300">Voltar</button>
                            <button type="button" disabled={seconds > 0} onClick={() => { onStatusUpdate(order.id!, "cancelled"); setIsConfirmOpen(false); }} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">{seconds > 0 ? `Aguarde ${seconds}s` : "Confirmar cancelamento"}</button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </>
    );
};

export default CancelScheduledSaleButton;
