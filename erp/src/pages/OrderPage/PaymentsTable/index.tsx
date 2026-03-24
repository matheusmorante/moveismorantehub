import Body from "./Body";
import Footer from "./Footer";
import { Payment, PaymentsSummary } from "../../types/payments.type";

type Props = {
    payments: Payment[],
    summary: PaymentsSummary
}

const PaymentsTable = ({ payments, summary }: Props) => {

    return (
        <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <table className="break-words w-full text-left border-collapse">
                <colgroup>
                    <col className="w-full" /> {/* MÉTODO greedy */}
                    <col className="w-[1px]" /> {/* Valor minimal */}
                    <col className="w-[30%]" /> {/* Status comfortable wrapping width */}
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs font-black uppercase tracking-tight text-slate-500 whitespace-nowrap">
                        <th className="px-4 py-1">MÉTODO</th>
                        <th className="px-4 py-1 text-right">Valor</th>
                        <th className="px-4 py-1 text-center">Status</th>
                    </tr>
                </thead>
                <Body payments={payments} />
                <Footer summary={summary} />
            </table>
        </div>
    )
}
export default PaymentsTable;