import { PaymentsSummary } from "../../types/payments.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';

interface Props {
    summary: PaymentsSummary,
}

const Footer = ({ summary }: Props) => {

    return (
        <tfoot className="bg-slate-50 border-t-2 border-slate-900 font-sans">
            <tr className="text-[9px] font-black uppercase tracking-tight text-slate-400 whitespace-nowrap">
                <th className="px-2 pt-1 pb-0.5">Saldo Juros</th>
                <th className="px-2 pt-1 pb-0.5 text-right">Total Pedido</th>
            </tr>
            <tr className="text-base font-black text-slate-900 border-b border-slate-100 whitespace-nowrap">
                <td className="px-2 py-0.5">
                    <CurrencyDisplay value={summary.totalPaymentsFee} />
                </td>
                <td className="px-2 py-0.5 text-right text-slate-900">
                    <CurrencyDisplay value={summary.totalOrderValue} />
                </td>
            </tr>
            <tr className="bg-slate-900 text-white">
                <td colSpan={2} className="px-4 py-1.5 text-center">
                    <div className="flex flex-col items-center gap-0">
                        <span className="text-[9px] uppercase tracking-[0.2em] font-black opacity-70">VALOR TOTAL PAGAR</span>
                        <span className="text-xl font-black italic tracking-tighter whitespace-nowrap"><CurrencyDisplay value={summary.totalAmountPaid} /></span>
                    </div>
                </td>
            </tr>
        </tfoot>

    )
}
export default Footer;