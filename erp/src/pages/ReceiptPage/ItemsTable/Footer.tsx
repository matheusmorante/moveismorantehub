import { ItemsSummary } from "../../types/items.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';
import UnitDisplay from '../../../components/UnitDisplay';

interface Props {
    summary: ItemsSummary,
}

const Footer = ({summary} : Props ) => {
    return (
        <tfoot className="border-t-2 border-slate-900 bg-slate-950 text-white">
            <tr>
                <td className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Totais dos Itens</td>
                <td className="px-4 py-3 text-center text-sm font-black">
                    <UnitDisplay value={summary.totalQuantity} />
                </td>
                <td className="px-4 py-3 text-right text-xs font-medium text-slate-400">
                    <CurrencyDisplay value={summary.itemsSubtotal}/>
                </td>
                <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                    <CurrencyDisplay value={summary.totalFixedDiscount}/>
                </td>
                <td className="px-4 py-3 text-right text-base font-black text-amber-400">
                    <CurrencyDisplay value={summary.itemsTotalValue}/>
                </td>
            </tr>
        </tfoot>
    )
}
export default Footer;