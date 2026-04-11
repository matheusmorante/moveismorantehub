import { Payment }  from "../../types/payments.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';
import { calcPaymentTotalValue } from "../../utils/calculations";

interface Props {
    payments: Payment[];
}

const Body= ({ payments }: Props) => {
    return (
        <tbody className="divide-y divide-slate-50">
            {payments.map((payment, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-1.5 text-xs font-bold text-slate-700">
                        {payment.method}
                    </td>
                    <td className="px-4 py-1.5 text-right text-xs font-black text-slate-800">
                        <CurrencyDisplay value={calcPaymentTotalValue(payment)} />
                    </td>
                </tr>
            ))}
        </tbody>
    )
}

export default Body;
