import { PaymentsSummary } from "../../types/payments.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';

interface Props {
    summary: PaymentsSummary,
}

const Footer = ({ summary }: Props) => {

    return (
        <tfoot className="bg-slate-50 border-t-2 border-slate-900 font-sans">
            <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-4 pt-3 pb-1">Saldo Juros</th>
                <th className="px-4 pt-3 pb-1 text-right">Total Pedido</th>
                <th className="px-4 pt-3 pb-1 text-center text-red-500">Saldo Restante</th>
            </tr>
            <tr className="text-sm font-black text-slate-900 border-b border-slate-100">
                <td className="px-4 py-2">
                    <CurrencyDisplay value={summary.totalInterest} />
                </td>
                <td className="px-4 py-2 text-right text-slate-900">
                    <CurrencyDisplay value={summary.totalOrderValue} />
                </td>
                <td className="px-4 py-2 text-center text-red-600">
                    <CurrencyDisplay value={summary.amountRemaining} />
                </td>
            </tr>
            <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-70">VALOR TOTAL PAGO</span>
                        <span className="text-2xl font-black italic tracking-tighter"><CurrencyDisplay value={summary.totalPaid} /></span>
                    </div>
                </td>
            </tr>
        </tfoot>

    )
}
export default Footer;