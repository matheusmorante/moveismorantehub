import { requestConfirmation } from '@/components/shared/confirmationService';
import { PaymentsSummary, Payment } from '../../../types/payments.type';
import CurrencyInput from '../../../../components/CurrencyInput';
import CurrencyOrPercentInput from '../../../../components/CurrencyOrPercentInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import { calcPaymentTotalValue } from '../../../utils/calculations';
import React, { useState, useRef, useEffect } from 'react';
import { PixPaymentModal } from './PixPaymentModal';
import PaymentMethodSelector from './PaymentMethodSelector';
import { formatCurrency } from '../../../utils/formatters';
import { ValidationErrors } from '../../../utils/validations';
import {
  getOrderPaymentDueDate,
  isPromissoryPaymentMethod,
} from '../../../../../../shared-utils/orderPaymentState';

interface Props {
  payment: Payment;
  payments: Payment[];
  summary: PaymentsSummary;
  onChange: (idx: number, key: keyof Payment, value: number | string) => void;
  onChangeFee: (idx: number, fee: number, feeType: 'fixed' | 'percentage') => void;
  onDelete: () => void;
  idx: number;
  isMobile?: boolean;
  errors: ValidationErrors;
  deliveryMethod?: 'delivery' | 'pickup';
}

const BodyRow = ({
  payment,
  payments,
  summary,
  onChange,
  onChangeFee,
  onDelete,
  idx,
  isMobile,
  errors,
  deliveryMethod = 'delivery',
}: Props) => {
  const statusError = errors[`payment_${idx}_status`];
  const methodError = errors[`payment_${idx}_method`];
  const paymentDueDate = getOrderPaymentDueDate(payment, undefined);
  const dueDateError = paymentDueDate ? undefined : errors[`payment_${idx}_dueDate`];
  const isPromissoryPayment = isPromissoryPaymentMethod(payment.method);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const otherPaymentAmounts = payments.reduce(
    (total, otherPayment, paymentIdx) =>
      paymentIdx === idx ? total : total + (Number(otherPayment.amount) || 0),
    0
  );
  const targetPaymentAmount = Math.max(
    0,
    Number((summary.totalOrderValue - summary.totalPaymentsFee - otherPaymentAmounts).toFixed(2))
  );
  const paymentAmountDifference = Number((targetPaymentAmount - payment.amount).toFixed(2));
  const shouldAdjustPaymentAmount = Math.abs(paymentAmountDifference) > 0.01;
  const paymentAmountAdjustmentTitle =
    paymentAmountDifference > 0
      ? `Ajustar o restante nos pagamentos (aumentar ${formatCurrency(paymentAmountDifference)})`
      : `Ajustar o restante nos pagamentos (reduzir ${formatCurrency(Math.abs(paymentAmountDifference))})`;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectPaymentMethod = (method: string) => {
    onChange(idx, 'method', method);
    if (isPromissoryPaymentMethod(method)) {
      onChange(idx, 'status', 'N/A');
    } else if (payment.status === 'N/A') {
      onChange(idx, 'status', '');
    }
    setIsDropdownOpen(false);
  };

  const feeReaisVal =
    payment.feeType === 'fixed'
      ? payment.fee
      : payment.amount > 0
        ? (payment.amount * payment.fee) / 100
        : 0;

  const feePercentVal =
    payment.feeType === 'percentage'
      ? payment.fee
      : payment.amount > 0
        ? (payment.fee / payment.amount) * 100
        : 0;

  const [tempFeeReais, setTempFeeReais] = useState<number>(feeReaisVal);
  const [tempFeePercent, setTempFeePercent] = useState<number>(feePercentVal);

  useEffect(() => {
    setTempFeeReais(feeReaisVal);
    setTempFeePercent(feePercentVal);
  }, [payment.fee, payment.feeType, payment.amount]);

  const commitFeeReais = () => {
    onChangeFee(idx, tempFeeReais, 'fixed');
  };

  const commitFeePercent = () => {
    onChangeFee(idx, tempFeePercent, 'percentage');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (isMobile) {
    return (
      <div
        className={`p-4 bg-white dark:bg-slate-900/40 rounded-2xl border shadow-sm relative group overflow-hidden ${statusError || methodError ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'}`}
      >
        <div className="flex flex-col gap-4">
          {/* Header: Method & Delete */}
          <div
            className={
              isPromissoryPayment
                ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3'
                : 'flex items-center justify-between gap-2'
            }
          >
            <PaymentMethodSelector
              method={payment.method}
              amount={payment.amount}
              isPromissoryPayment={isPromissoryPayment}
              isMobile
              error={methodError}
              isOpen={isDropdownOpen}
              dropdownRef={dropdownRef}
              onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
              onSelect={selectPaymentMethod}
            />
            {isPromissoryPayment && (
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor={`payment-${idx}-first-installment-due-date`}
                  className={`block text-[9px] font-black uppercase ${dueDateError ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}
                >
                  Vencimento da 1ª parcela <span className="text-red-500">*</span>
                </label>
                <input
                  id={`payment-${idx}-first-installment-due-date`}
                  type="date"
                  value={paymentDueDate || ''}
                  onChange={(event) => onChange(idx, 'dueDate', event.target.value)}
                  className={`w-full min-w-0 border-b-2 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-blue-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 ${dueDateError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                />
                {dueDateError && <p className="text-[10px] text-red-600">{dueDateError}</p>}
              </div>
            )}
            <button
              type="button"
              onClick={onDelete}
              className={`p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all grow-0 shrink-0 ${isPromissoryPayment ? 'self-start' : ''}`}
            >
              <i className="bi bi-trash text-lg" />
            </button>
          </div>

          {/* Campos compactos: só quebram a linha quando não houver espaço suficiente. */}
          <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
            <div className="w-36 max-w-full space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400">Valor</label>
              <div className="flex items-center gap-1 group/input">
                <CurrencyInput
                  value={payment.amount}
                  onChange={(value: number) => onChange(idx, 'amount', value)}
                  showBadge={true}
                  badgeText="R$"
                />
                {shouldAdjustPaymentAmount && (
                  <button
                    type="button"
                    onClick={() => onChange(idx, 'amount', targetPaymentAmount)}
                    className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all shrink-0"
                    title={paymentAmountAdjustmentTitle}
                  >
                    <i className="bi bi-magic" />
                  </button>
                )}
              </div>
            </div>

            <div className="w-32 max-w-full space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400">Taxa R$</label>
              <CurrencyInput
                value={tempFeeReais}
                onChange={(val: number) => setTempFeeReais(val)}
                onBlur={commitFeeReais}
                showBadge={true}
                badgeText="R$"
              />
            </div>

            <div className="w-32 max-w-full space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400">Taxa %</label>
              <CurrencyOrPercentInput
                value={tempFeePercent}
                onChange={(val: number) => setTempFeePercent(val)}
                onBlur={commitFeePercent}
                showBadge={true}
                badgeText="%"
              />
            </div>
            <div className="w-44 max-w-full space-y-1">
              <label
                className={`text-[9px] font-black uppercase ${statusError ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}
              >
                Status <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none border-b-2 bg-transparent px-3 py-2 text-xs font-bold leading-4 outline-none transition-colors focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-200 dark:focus:border-blue-500 ${statusError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                  value={isPromissoryPayment ? 'N/A' : payment.status}
                  disabled={isPromissoryPayment}
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (val && await requestConfirmation({
                      title: 'Alterar status do pagamento?',
                      message: `Tem certeza que quer alterar o status para "${val}"?`,
                      confirmLabel: 'Alterar status',
                      type: 'warning',
                    })) {
                      onChange(idx, 'status', val);
                    }
                  }}
                  required
                >
                  <option value="" disabled>
                    Selecionar status...
                  </option>
                  {isPromissoryPayment && <option value="N/A">N/A</option>}
                  <option value="Pago">Pago</option>
                  <option value="Pendente">
                    Pendente - na {deliveryMethod === 'delivery' ? 'entrega' : 'retirada'}
                  </option>
                  <option value="Verificar">Verificar</option>
                  {payment.status &&
                    !['Pago', 'Pendente', 'Verificar'].includes(payment.status) && (
                      <option value={payment.status}>{payment.status}</option>
                    )}
                </select>
                <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {payment.method === 'Pix' && (
                <button
                  type="button"
                  onClick={() => setIsPixModalOpen(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <i className="bi bi-qr-code text-sm" />
                  Gerar QR Code
                </button>
              )}
            </div>
          </div>

          {/* Footer: Total Row */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800 mt-2">
            <span className="text-[10px] font-black uppercase text-slate-400">
              Total com Taxas:
            </span>
            <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              <CurrencyDisplay value={calcPaymentTotalValue(payment)} />
            </div>
          </div>
        </div>

        <PixPaymentModal
          isOpen={isPixModalOpen}
          onClose={() => setIsPixModalOpen(false)}
          amount={payment.amount}
          onSuccess={(tx) => {
            onChange(idx, 'status', `PAGO [TID: ${tx.tid}]`);
            setIsPixModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <tr
      key={idx}
      className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
    >
      <td className="px-4 py-3">
        <div className={isPromissoryPayment ? 'flex items-end gap-3' : ''}>
          <PaymentMethodSelector
            method={payment.method}
            amount={payment.amount}
            isPromissoryPayment={isPromissoryPayment}
            error={methodError}
            isOpen={isDropdownOpen}
            dropdownRef={dropdownRef}
            onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
            onSelect={selectPaymentMethod}
          />
          {isPromissoryPayment && (
            <div className="min-w-[180px] flex-1 space-y-1">
              <label
                htmlFor={`payment-${idx}-first-installment-due-date`}
                className={`block text-[9px] font-black uppercase ${dueDateError ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}
              >
                Vencimento da 1ª parcela <span className="text-red-500">*</span>
              </label>
              <input
                id={`payment-${idx}-first-installment-due-date`}
                type="date"
                value={paymentDueDate || ''}
                onChange={(event) => onChange(idx, 'dueDate', event.target.value)}
                className={`w-full border-b-2 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-blue-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 ${dueDateError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
              />
              {dueDateError && <p className="text-[10px] text-red-600">{dueDateError}</p>}
            </div>
          )}
        </div>
        {methodError && <p className="mt-1 text-[10px] text-red-600">{methodError}</p>}

        {payment.method === 'Pix' && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setIsPixModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            >
              <i className="bi bi-qr-code text-sm"></i>
              Gerar QR Code
            </button>

            <PixPaymentModal
              isOpen={isPixModalOpen}
              onClose={() => setIsPixModalOpen(false)}
              amount={payment.amount}
              onSuccess={(tx) => {
                onChange(idx, 'status', `PAGO [TID: ${tx.tid}]`);
                setIsPixModalOpen(false);
              }}
            />
          </div>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1 group/input">
          <CurrencyInput
            value={payment.amount}
            onChange={(value: number) => onChange(idx, 'amount', value)}
            showBadge={true}
            badgeText="R$"
          />
          {shouldAdjustPaymentAmount && (
            <button
              type="button"
              onClick={() => onChange(idx, 'amount', targetPaymentAmount)}
              className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all shrink-0"
              title={paymentAmountAdjustmentTitle}
            >
              <i className="bi bi-magic" />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        <CurrencyInput
          value={tempFeeReais}
          onChange={(val: number) => setTempFeeReais(val)}
          onBlur={commitFeeReais}
          showBadge={true}
          badgeText="R$"
        />
      </td>
      <td className="px-4 py-2">
        <CurrencyOrPercentInput
          value={tempFeePercent}
          onChange={(val: number) => setTempFeePercent(val)}
          onBlur={commitFeePercent}
          showBadge={true}
          badgeText="%"
        />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="font-bold text-slate-700 dark:text-slate-200">
          <CurrencyDisplay value={calcPaymentTotalValue(payment)} />
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="relative group/status min-w-[140px]">
          <select
            className={`w-full appearance-none border-b-2 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-200 dark:focus:border-blue-500 ${statusError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
            value={isPromissoryPayment ? 'N/A' : payment.status}
            disabled={isPromissoryPayment}
            onChange={async (e) => {
              const val = e.target.value;
              if (val && await requestConfirmation({
                title: 'Alterar status do pagamento?',
                message: `Tem certeza que quer alterar o status para "${val}"?`,
                confirmLabel: 'Alterar status',
                type: 'warning',
              })) {
                onChange(idx, 'status', val);
              }
            }}
            required
          >
            <option value="" disabled className="text-slate-400">
              Status...
            </option>
            {isPromissoryPayment && <option value="N/A">N/A</option>}
            <option value="Pago">Pago</option>
            <option value="Pendente">
              Pendente - na {deliveryMethod === 'delivery' ? 'entrega' : 'retirada'}
            </option>
            <option value="Verificar">Verificar</option>
            {payment.status && !['Pago', 'Pendente', 'Verificar'].includes(payment.status) && (
              <option value={payment.status}>{payment.status}</option>
            )}
          </select>
          <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
        </div>
      </td>
      <td className="px-4 py-2 text-center border-none">
        <button
          type="button"
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Excluir pagamento"
        >
          <i className="bi bi-trash" />
        </button>
      </td>
    </tr>
  );
};

export default BodyRow;
