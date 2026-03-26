import Item from "../../types/items.type";
import CurrencyDisplay from "../../../components/CurrencyDisplay";
import UnitDisplay from "../../../components/UnitDisplay";

interface Props {
    items: Item[],
}

const Body = ({ items }: Props) => {
    return (
        <tbody className="divide-y divide-slate-100 italic">
            {items.map((item, index) => {
                const total = (item.unitPrice - (item.unitDiscount || 0)) * item.quantity;
                return (
                    <tr key={index} className="text-sm">
                        <td className="px-3 py-1 font-bold text-slate-700 uppercase leading-tight text-[13px]">
                            {item.description}
                        </td>
                        <td className="px-1 py-0.5 text-center font-bold text-slate-500 uppercase text-[9px] leading-tight">
                            {item.handlingType || item.condition || "-"}
                        </td>
                        <td className="px-1 py-0.5 text-right font-bold text-slate-600 whitespace-nowrap">
                            <UnitDisplay value={item.quantity} />
                        </td>
                        <td className="px-2 py-0.5 text-right text-slate-500 font-medium whitespace-nowrap">
                            <CurrencyDisplay value={item.unitPrice} />
                        </td>
                        <td className="px-2 py-0.5 text-right text-slate-500 font-medium whitespace-nowrap">
                            <CurrencyDisplay value={item.unitDiscount || 0} />
                        </td>
                        <td className="px-2 py-0.5 text-right font-black text-slate-900 bg-slate-50/10 whitespace-nowrap">
                            <CurrencyDisplay value={total} />
                        </td>
                    </tr>
                );
            })}
        </tbody>
    )
}
export default Body;
