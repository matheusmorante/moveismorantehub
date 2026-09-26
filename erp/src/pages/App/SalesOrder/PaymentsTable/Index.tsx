import React from "react";
import Body from "./Body";
import Footer from "./Footer";
import { PaymentsSummary, Payment } from "../../../types/payments.type";
import { useWindowSize } from "../../../../hooks/useWindowSize";
import { ValidationErrors } from "../../../utils/validations";

type Props = {
    payments: Payment[],
    setPayments: React.Dispatch<React.SetStateAction<Payment[]>>,
    summary: PaymentsSummary,
    errors: ValidationErrors
}

const PaymentsTable = ({ payments, setPayments, summary, errors }: Props) => {
    const { width } = useWindowSize();
    const isMobile = width < 1280;

    if (isMobile) {
        return (
            <div className="space-y-6">
                <Body
                    payments={payments}
                    setPayments={setPayments}
                    summary={summary}
                    isMobile={isMobile}
                    errors={errors}
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
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[100px]" />
                <col className="w-[120px]" />
                <col className="w-auto" />
                <col className="w-[60px]" />
            </colgroup>
            <thead className="bg-slate-50/50 dark:bg-slate-800/40">
                <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pagamento</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[120px]">Valor</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[120px]">Taxa R$</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[100px]">Taxa %</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[120px]">Total</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status <span className="text-red-500">*</span></th>
                    <th className="w-[60px] px-4 py-3" />
                </tr>
            </thead>
            <Body payments={payments} setPayments={setPayments} summary={summary} isMobile={isMobile} errors={errors} />
            <Footer
                summary={summary}
                isMobile={isMobile}
            />
        </table>
    );
};

export default PaymentsTable;
