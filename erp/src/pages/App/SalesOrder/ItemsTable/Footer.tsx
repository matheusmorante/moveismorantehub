import { ItemsSummary } from "../../../types/items.type";
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import UnitDisplay from '../../../../components/UnitDisplay';

interface Props {
    summary: ItemsSummary;
    isMobile?: boolean;
}

const Footer = ({ summary, isMobile }: Props) => {

    if (isMobile) {
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <CurrencyDisplay value={summary.itemsSubtotal} />
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-red-500">
                    <span>Total Desconto:</span>
                    <CurrencyDisplay value={summary.totalFixedDiscount} />
                </div>
                <div className="flex justify-between items-center text-lg font-black text-blue-600 dark:text-blue-400 border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                    <span>Total Final:</span>
                    <CurrencyDisplay value={summary.itemsTotalValue} />
                </div>
            </div>
        );
    }

    return (
        <tfoot className="bg-slate-50/30 dark:bg-slate-800/20">
            <tr className="border-t border-slate-100 dark:border-slate-800">
                <td colSpan={3} className="px-4 py-3 bg-transparent"></td>
                <td colSpan={2} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Subtotal:
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        <CurrencyDisplay value={summary.itemsSubtotal} />
                    </div>
                </td>
                <td></td>
            </tr>

            <tr>
                <td colSpan={3} className="px-4 py-3 bg-transparent"></td>
                <td colSpan={2} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-red-400 dark:text-red-500/50">
                    Total Desconto:
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="text-sm font-bold text-red-500/80">
                        <CurrencyDisplay value={summary.totalFixedDiscount} />
                    </div>
                </td>
                <td></td>
            </tr>

            <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                <td colSpan={3} className="px-4 py-3 bg-transparent"></td>
                <td colSpan={2} className="px-4 py-1 text-right text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    Total Final:
                </td>
                <td className="px-4 py-1 text-right">
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400 drop-shadow-sm font-sans">
                        <CurrencyDisplay value={summary.itemsTotalValue} />
                    </div>
                </td>
                <td></td>
            </tr>
        </tfoot>
    )
}

export default Footer;