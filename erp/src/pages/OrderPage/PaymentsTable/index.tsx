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
                    <col className="w-[45%]" />
                    <col className="w-[20%]" />
                    <col className="w-[35%]" />
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Forma de Pagamento</th>
                        <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Valor</th>
                        <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                    </tr>
                </thead>
                <Body payments={payments} />
                <Footer summary={summary} />
            </table>
        </div>
    )
}
export default PaymentsTable;