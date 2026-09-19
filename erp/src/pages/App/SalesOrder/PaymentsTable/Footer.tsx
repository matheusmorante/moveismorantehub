import { PaymentsSummary } from "../../../types/payments.type";
import CurrencyDisplay from '../../../../components/CurrencyDisplay';

interface Props {
    summary: PaymentsSummary,
    isMobile?: boolean;
}

const Footer = ({ summary, isMobile }: Props) => {

    if (isMobile) {
        return (
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">V. T. das Taxas</span>
                    <span className="text-sm font-bold text-slate-600">
                        <CurrencyDisplay value={summary.totalPaymentsFee} />
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">V. T. do Pedido</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                        <CurrencyDisplay value={summary.totalOrderValue} />
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Valor Total Pago</span>
                    <span className="text-sm font-bold text-green-600">
                        <CurrencyDisplay value={summary.totalAmountPaid} />
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {(summary.change && summary.change > 0) ? "Troco" : "Valor Restante"}
                    </span>
                    <span className={`text-sm font-bold ${(summary.change && summary.change > 0) ? "text-emerald-600" : "text-orange-600"}`}>
                        <CurrencyDisplay value={(summary.change && summary.change > 0) ? summary.change : summary.amountRemaining} />
                    </span>
                </div>
            </div>
        );
    }

    const hasChange = Boolean(summary.change && summary.change > 0);

    return (
        <tfoot className="border-t-2 border-slate-100">
            <tr className="bg-slate-50/30">
                <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Total de Taxa</th>
                <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">V. T. do Pedido</th>
                <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Total Pago</th>
                <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {hasChange ? "Troco a Devolver" : "Valor Restante"}
                </th>
            </tr>
            <tr>
                <td className="px-4 py-3 text-right text-sm font-bold text-slate-600">
                    <CurrencyDisplay value={summary.totalPaymentsFee} />
                </td>
                <td className="px-4 py-3 text-right text-sm font-black text-slate-900 bg-slate-50/50">
                    <CurrencyDisplay value={summary.totalOrderValue} />
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                    <CurrencyDisplay value={summary.totalAmountPaid} />
                </td>
                <td className={`px-4 py-3 text-right text-sm font-bold ${hasChange ? "text-emerald-600 font-black" : "text-orange-600"}`}>
                    <CurrencyDisplay value={hasChange ? summary.change! : summary.amountRemaining} />
                </td>
            </tr>
        </tfoot>
    )
}
export default Footer;
