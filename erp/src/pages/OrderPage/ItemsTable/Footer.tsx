import { ItemsSummary } from "../../types/items.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';
import UnitDisplay from '../../../components/UnitDisplay';

interface Props {
    summary: ItemsSummary,
}

const Footer = ({ summary }: Props) => {

    return (
        <tfoot className="bg-slate-50 border-t-4 border-slate-900 shadow-sm transition-all duration-300">
            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-4 py-2 text-left">Resumo de Itens</th>
                <th className="px-4 py-2 text-center text-slate-500 border-x border-slate-200">Qtd. Itens</th>
                <th className="px-4 py-2 text-right text-slate-400">Items Subtotal</th>
                <th className="px-4 py-2 text-right text-slate-400 border-x border-slate-200">Desconto Total</th>
                <th className="px-4 py-2 text-right text-slate-900">Total Geral de Itens</th>
            </tr>
            <tr className="text-sm font-black text-slate-800">
                <td className="px-4 py-4 italic text-slate-400 text-[10px]">
                    Totais consolidados
                </td>
                <td className="px-4 py-4 text-center border-x border-slate-100">
                    <UnitDisplay value={summary.totalQuantity} />
                </td>
                <td className="px-4 py-4 text-right">
                    <CurrencyDisplay value={summary.itemsSubtotal} />
                </td>
                <td className="px-4 py-4 text-right border-x border-slate-100">
                    <CurrencyDisplay value={summary.totalFixedDiscount} />
                </td>
                <td className="px-4 py-4 text-right text-lg text-slate-900">
                    <CurrencyDisplay value={summary.itemsTotalValue} />
                </td>
            </tr>
        </tfoot>

    )
}
export default Footer;