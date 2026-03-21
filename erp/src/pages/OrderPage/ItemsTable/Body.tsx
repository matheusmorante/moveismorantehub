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
                    <tr key={index} className="text-[12px]">
                        <td className="px-4 py-3 font-semibold text-slate-800 uppercase leading-snug">
                            {item.description}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600">
                            <UnitDisplay value={item.quantity} />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">
                            <CurrencyDisplay value={item.unitPrice} />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">
                            <CurrencyDisplay value={item.unitDiscount || 0} />
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 bg-slate-50/30">
                            <CurrencyDisplay value={total} />
                        </td>
                    </tr>
                );
            })}
        </tbody>
    )
}
export default Body;
