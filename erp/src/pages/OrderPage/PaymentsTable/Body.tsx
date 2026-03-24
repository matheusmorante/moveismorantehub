import { Payment } from "../../types/payments.type";
import CurrencyDisplay from '../../../components/CurrencyDisplay';

interface Props {
    payments: Payment[],
}

const Body = ({ payments }: Props) => {
    return (
        <tbody className="divide-y divide-slate-100 italic">
            {payments.map((payment, index) => (
                <tr key={index} className="text-base font-bold">
                    <td className="px-3 py-0.5 text-slate-700 font-medium">
                        {payment.method.toUpperCase()}
                    </td>
                    <td className="px-3 py-0.5 text-right font-black text-slate-900 whitespace-nowrap">
                        <CurrencyDisplay value={payment.amount} />
                    </td>
                    <td className="px-3 py-0.5 text-center">
                        <span className="text-[10px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 leading-tight inline-block min-w-[80px]">
                            {payment.status}
                        </span>
                    </td>
                </tr>
            ))}
        </tbody>
    )
}
export default Body;
