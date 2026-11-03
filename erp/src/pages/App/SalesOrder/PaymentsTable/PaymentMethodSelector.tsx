import React from 'react';
import DropdownPortal from '../../../../components/shared/DropdownPortal';
import { formatCurrency } from '../../../utils/formatters';
import paymentMethods from './paymentMethods';

interface Props {
  method: string;
  amount: number;
  isPromissoryPayment: boolean;
  isMobile?: boolean;
  error?: string;
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement>;
  onToggle: () => void;
  onSelect: (method: string) => void;
}

const PaymentMethodSelector = ({
  method,
  amount,
  isPromissoryPayment,
  isMobile,
  error,
  isOpen,
  dropdownRef,
  onToggle,
  onSelect,
}: Props) => {
  const getPaymentIcon = (paymentMethod: string) => {
    if (paymentMethod === 'Pix') return 'bi-qr-code text-teal-500';
    if (paymentMethod === 'Dinheiro') return 'bi-cash-coin text-emerald-500';
    if (paymentMethod === 'Cartão de Débito') return 'bi-credit-card text-blue-500';
    if (paymentMethod.includes('Crédito')) return 'bi-credit-card-2-front text-indigo-500';
    if (paymentMethod.includes('Promissória')) return 'bi-journal-text text-amber-500';
    return 'bi-question-circle text-slate-400';
  };

  const renderMethodItem = (paymentMethod: string) => {
    if (!paymentMethod.trim()) {
      return <span className="text-xs font-bold text-slate-400">Selecione</span>;
    }

    const icon = getPaymentIcon(paymentMethod);
    let detail = '';

    if ((paymentMethod.includes('Crédito') || paymentMethod.includes('Promissória')) && amount > 0) {
      const match = paymentMethod.match(/(\d+)x/);
      if (match) {
        const n = parseInt(match[1]);
        if (n > 0) {
          const installment = amount / n;
          detail = `${n}x de ${formatCurrency(installment)}`;
        }
      }
    }

    return (
      <div className="flex items-center gap-3 w-full">
        <i className={`bi ${icon} text-lg shrink-0`} />
        <div className="flex flex-col items-start text-left min-w-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
            {paymentMethod}
          </span>
          {detail && (
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              {detail}
            </span>
          )}
        </div>
      </div>
    );
  };

  const selector = (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 ${
          isMobile
            ? 'bg-transparent border-b-2 px-3 py-2.5'
            : 'border-b-2 bg-transparent px-3 py-2'
        } outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500 ${error ? 'border-red-500' : 'border-slate-200'}`}
      >
        {renderMethodItem(method)}
        <i
          className={`bi bi-chevron-down text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <DropdownPortal
        anchorRef={dropdownRef}
        isOpen={isOpen}
        className={isMobile ? undefined : 'fixed shadow-2xl z-[9000]'}
      >
        <div
          className={`mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden ${isMobile ? 'max-h-64 p-1 z-[9999]' : 'max-h-80 p-2 z-[9000]'} overflow-y-auto custom-scrollbar flex flex-col`}
        >
          {paymentMethods.map((paymentMethod) => (
            <button
              key={paymentMethod}
              type="button"
              onClick={() => onSelect(paymentMethod)}
              className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${method === paymentMethod ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : ''}`}
            >
              {renderMethodItem(paymentMethod)}
            </button>
          ))}
        </div>
      </DropdownPortal>
    </>
  );

  if (isMobile) {
    return (
      <div className={`relative ${isPromissoryPayment ? 'min-w-0' : 'flex-1'}`} ref={dropdownRef}>
        <label className="mb-1 block text-[9px] font-black uppercase text-slate-400">
          Forma de pagamento <span className="text-red-500">*</span>
        </label>
        {selector}
        {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={`relative group/method ${isPromissoryPayment ? 'min-w-0 flex-1' : 'min-w-[200px]'}`}
      ref={dropdownRef}
    >
      {selector}
    </div>
  );
};

export default PaymentMethodSelector;
