import Item from "../../types/items.type";
import { calcItemTotalValue, getFixedDiscount } from "../../utils/calculations";
import CurrencyDisplay from "../../../components/CurrencyDisplay";
import UnitDisplay from "../../../components/UnitDisplay";

interface Props {
    items: Item[];
}

const Body = ({ items }: Props) => {
    return (
        <tbody className="divide-y divide-slate-50">
            {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-1 text-sm font-bold text-slate-700">{item.description}</td>
                    <td className="px-4 py-1 text-center text-sm text-slate-600">
                        <UnitDisplay value={item.quantity} />
                    </td>
                    <td className="px-4 py-1 text-right text-sm text-slate-600">
                        <CurrencyDisplay value={item.unitPrice} />
                    </td>
                    <td className="px-4 py-1 text-right text-sm text-slate-400 italic">
                        <CurrencyDisplay value={getFixedDiscount(item)} />
                    </td>
                    <td className="px-4 py-1 text-right text-sm font-black text-slate-800">
                        <CurrencyDisplay value={calcItemTotalValue(item)} />
                    </td>
                </tr>
            ))}
        </tbody>
    )
};

export default Body;
