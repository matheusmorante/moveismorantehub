import { PaymentsSummary } from '../../types/payments.type';
import CurrencyDisplay from '../../../components/CurrencyDisplay';

interface Props {
  summary: PaymentsSummary;
}

const Footer = ({ summary }: Props) => {
  return (
    <tfoot className="bg-slate-50 border-t-2 border-slate-900 font-sans">
      <tr className="text-[9px] font-black uppercase tracking-tight text-slate-400 whitespace-nowrap">
        <th className="px-2 pt-1 pb-0.5">Saldo Juros</th>
        <th colSpan={2} className="px-2 pt-1 pb-0.5 text-right">
          Total Pedido
        </th>
      </tr>
      <tr className="text-base font-black text-slate-900 whitespace-nowrap">
        <td className="px-2 py-0.5">
          <CurrencyDisplay value={summary.totalPaymentsFee} />
        </td>
        <td colSpan={2} className="px-2 py-0.5 text-right text-slate-900">
          <CurrencyDisplay value={summary.totalOrderValue} />
        </td>
      </tr>
    </tfoot>
  );
};
export default Footer;
