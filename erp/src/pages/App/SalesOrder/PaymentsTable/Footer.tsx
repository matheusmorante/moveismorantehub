import { PaymentsSummary } from '../../../types/payments.type';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';

interface Props {
  summary: PaymentsSummary;
  isMobile?: boolean;
}

const Footer = ({ summary, isMobile }: Props) => {
  const paymentAllocationDifference =
    summary.paymentAllocationDifference ?? summary.amountRemaining;
  const hasChange = Boolean(summary.change && summary.change > 0);
  const hasPaymentAllocationExcess = !hasChange && paymentAllocationDifference < -0.01;
  const balanceLabel = hasChange
    ? 'Troco a devolver'
    : hasPaymentAllocationExcess
      ? 'Excesso informado'
      : 'Restante a informar';
  const balanceValue = hasChange ? summary.change! : Math.abs(paymentAllocationDifference);
  const balanceColor = hasChange
    ? 'text-emerald-600'
    : hasPaymentAllocationExcess
      ? 'text-red-600'
      : 'text-orange-600';

  if (isMobile) {
    return (
      <div className="grid grid-cols-2 gap-y-4 gap-x-6">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            V. T. das Taxas
          </span>
          <span className="text-sm font-bold text-slate-600">
            <CurrencyDisplay value={summary.totalPaymentsFee} />
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            V. T. do Pedido
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            <CurrencyDisplay value={summary.totalOrderValue} />
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Valor Total Pago
          </span>
          <span className="text-sm font-bold text-green-600">
            <CurrencyDisplay value={summary.totalAmountPaid} />
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            {balanceLabel}
          </span>
          <span className={`text-sm font-bold ${balanceColor}`}>
            <CurrencyDisplay value={balanceValue} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <tfoot className="border-t-2 border-slate-100">
      <tr className="bg-slate-50/30">
        <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
          Valor Total de Taxa
        </th>
        <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
          V. T. do Pedido
        </th>
        <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
          Valor Total Pago
        </th>
        <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
          {balanceLabel}
        </th>
      </tr>
      <tr>
        <td className="px-4 py-3 text-right text-sm font-bold text-slate-600">
          <CurrencyDisplay value={summary.totalPaymentsFee} />
        </td>
        <td className="px-4 py-3 text-right text-sm font-black text-slate-900 bg-slate-50/50">
          <CurrencyDisplay value={summary.totalOrderValue} />
        </td>
        <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
          <CurrencyDisplay value={summary.totalAmountPaid} />
        </td>
        <td className={`px-4 py-3 text-right text-sm font-bold ${balanceColor}`}>
          <CurrencyDisplay value={balanceValue} />
        </td>
      </tr>
    </tfoot>
  );
};
export default Footer;
