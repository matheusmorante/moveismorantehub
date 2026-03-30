import CurrencyDisplay from "../../../components/CurrencyDisplay";
import { PaymentsSummary } from "../../types/payments.type";

interface Props {
    summary: PaymentsSummary,
}

const Footer = ({ summary }: Props) => {
    return (
        <tfoot className="bg-slate-900 text-white">
            <tr>
                <td className="px-4 py-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total em Taxas</span>
                    <div className="text-xs font-bold text-slate-300">
                        <CurrencyDisplay value={summary.totalPaymentsFee} />
                    </div>
                </td>
                <td className="px-4 py-3 text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total do Pedido</span>
                    <div className="text-lg font-black text-amber-400">
                        <CurrencyDisplay value={summary.totalOrderValue} />
                    </div>
                </td>
            </tr>
        </tfoot>
    )
}
export default Footer;