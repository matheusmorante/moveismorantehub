import { Payment } from "../../types/payments.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';

interface Props {
    payments: Payment[],
}

const Body = ({ payments }: Props) => {
    return (
        <tbody className="divide-y divide-slate-100 italic">
            {payments.map((payment, index) => (
                <tr key={index} className="text-sm">
                    <td className="px-4 py-3 text-slate-700 font-medium">
                        {payment.method.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                        <CurrencyDisplay value={payment.amount} />
                    </td>
                    <td className="px-4 py-3 text-center">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                            {payment.status}
                        </span>
                    </td>
                </tr>
            ))}
        </tbody>
    )
}
export default Body;
