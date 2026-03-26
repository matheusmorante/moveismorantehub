import { ItemsSummary } from "../../types/items.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';
import UnitDisplay from '../../../components/UnitDisplay';

interface Props {
    summary: ItemsSummary,
}

const Footer = ({ summary }: Props) => {

    return (
        <tfoot className="bg-slate-50 border-t-4 border-slate-900 shadow-sm transition-all duration-300">
            <tr className="text-[10px] font-black uppercase tracking-tight text-slate-400 whitespace-nowrap bg-slate-50/50">
                <th colSpan={2} className="px-4 py-1 text-left">Resumo de Itens</th>
                <th className="px-2 py-1 text-right border-x border-slate-300">Qtd</th>
                <th className="px-2 py-1 text-right text-slate-400">Subtotal</th>
                <th className="px-2 py-1 text-right text-slate-400 border-x border-slate-300">Desc.</th>
                <th className="px-2 py-1 text-right text-slate-900">Total. Itens</th>
            </tr>
            <tr className="text-base font-black text-slate-800">
                <td colSpan={2} className="px-4 py-1 italic text-slate-400 text-xs">
                    Totais consolidados
                </td>
                <td className="px-2 py-1.5 text-right border-x border-slate-300 whitespace-nowrap">
                    <UnitDisplay value={summary.totalQuantity} />
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap border-r border-slate-300">
                    <CurrencyDisplay value={summary.itemsSubtotal} />
                </td>
                <td className="px-4 py-2 text-right border-x border-slate-300 whitespace-nowrap">
                    <CurrencyDisplay value={summary.totalFixedDiscount} />
                </td>
                <td className="px-4 py-1 text-right text-lg text-slate-900 whitespace-nowrap border-l border-slate-300">
                    <CurrencyDisplay value={summary.itemsTotalValue} />
                </td>
            </tr>
        </tfoot>

    )
}
export default Footer;