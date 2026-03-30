import Body from "./Body";
import Footer from "./Footer";
import { Payment, PaymentsSummary } from "../../types/payments.type";

type Props = {
    payments: Payment[],
    summary: PaymentsSummary
}

const PaymentsTable = ({ payments, summary }: Props) => {
    return (
        <section className="flex-1 overflow-hidden rounded-2xl border border-slate-100 shadow-sm self-start">
            <table className="w-full border-collapse">
                <colgroup>
                    <col className="w-[60%]" />
                    <col className="w-[40%]" />
                </colgroup>
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Forma de Pagamento</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Valor</th>
                    </tr>
                </thead>
                <Body payments={payments} />
                <Footer summary={summary} />
            </table>
        </section>
    )
}
export default PaymentsTable;