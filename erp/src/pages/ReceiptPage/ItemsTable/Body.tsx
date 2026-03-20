
import Item from "../../types/items.type";
import { calcItemTotalValue, getFixedDiscount } from "../../utils/calculations";
import CurrencyDisplay from "../../../components/CurrencyDisplay";
import UnitDisplay from "../../../components/UnitDisplay";

interface Props {
    items: Item[];
}

const Body = ({ items }: Props) => {
    return (
        <tbody>
            {
                items.map((item, idx) => (
                    <tr key={idx}>

                        <td className="pl-2">{item.description}</td>
                        <td className="text-center">
                            <UnitDisplay value={item.quantity} />
                        </td>
                        <td className="text-center">
                            <CurrencyDisplay value={item.unitPrice} />
                        </td>
                        <td className="text-center">
                            <CurrencyDisplay value={getFixedDiscount(item)} />
                        </td>
                        <td className="text-center">
                            <CurrencyDisplay value={calcItemTotalValue(item)} />
                        </td>
                    </tr>
                ))
            }
        </ tbody>
    )
};

export default Body;
