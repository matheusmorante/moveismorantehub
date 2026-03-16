import React from "react";
import Body from "./Body";
import Footer from "./Footer";
import { PaymentsSummary, Payment } from "../../../types/payments.type";
import { useWindowSize } from "../../../../hooks/useWindowSize";

type Props = {
    payments: Payment[],
    setPayments: React.Dispatch<React.SetStateAction<Payment[]>>,
    summary: PaymentsSummary
}

const PaymentsTable = ({ payments, setPayments, summary }: Props) => {
    const { width } = useWindowSize();
    const isMobile = width <= 900;

    const addPayment = () => {
        setPayments((prev: Payment[]) => {
            return [...prev, {
                method: 'Verificar',
                amount: 0,
                fee: 0,
                feeType: 'fixed',
                status: ''
            }]
        })
    }

    if (isMobile) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Pagamentos</h3>
                    <button
                        type="button"
                        onClick={addPayment}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                        <i className="bi bi-plus-lg" />
                        Add Pagamento
                    </button>
                </div>

                <Body
                    payments={payments}
                    setPayments={setPayments}
                    summary={summary}
                    isMobile={isMobile}
                />

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Footer summary={summary} isMobile={isMobile} />
                </div>
            </div>
        );
    }

    return (
        <table className="w-full border-collapse">
            <colgroup>
                <col className="w-auto" />
                <col className="w-[110px]" />
                <col className="w-[120px]" />
                <col className="w-[110px]" />
                <col className="w-auto" />
                <col className="w-[60px]" />
            </colgroup>
            <thead className="bg-slate-50/50 dark:bg-slate-800/40">
                <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pagamento</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]">Valor</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[120px]">Taxa</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]">Total</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                    <th className="px-4 py-3 text-center border-none bg-transparent">
                        <button
                            type="button"
                            onClick={addPayment}
                            className="w-8 h-8 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-all shadow-sm border border-indigo-100 dark:border-indigo-800"
                            title="Adicionar Pagamento"
                        >
                            <i className="bi bi-plus-lg" />
                        </button>
                    </th>
                </tr>
            </thead>
            <Body payments={payments} setPayments={setPayments} summary={summary} isMobile={isMobile} />
            <Footer
                summary={summary}
                isMobile={isMobile}
            />
        </table>
    );
};

export default PaymentsTable;