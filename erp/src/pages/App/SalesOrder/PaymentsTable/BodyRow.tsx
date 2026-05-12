import paymentMethods from "./paymentMethods";
import { PaymentsSummary, Payment } from '../../../types/payments.type'
import CurrencyInput from '../../../../components/CurrencyInput';
import ToggleValueTypeBtn from '../ToggleValueTypeBtn';
import CurrencyOrPercentInput from '../../../../components/CurrencyOrPercentInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import { calcPaymentTotalValue } from '../../../utils/calculations';
import React, { useState, useRef, useEffect } from 'react';
import { PixPaymentModal } from './PixPaymentModal';
import DropdownPortal from '../../../../components/shared/DropdownPortal';
import { formatCurrency } from '../../../utils/formatters';

interface Props {
    payment: Payment,
    summary: PaymentsSummary,
    onChange: (idx: number, key: keyof Payment, value: number | string) => void,
    onToggleFeeType: () => void,
    onDelete: () => void,
    idx: number,
    isMobile?: boolean
}


const BodyRow = ({ payment, summary, onChange, onToggleFeeType, onDelete, idx, isMobile }: Props) => {
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);


    const getPaymentIcon = (method: string) => {
        if (method === 'Pix') return 'bi-qr-code text-teal-500';
        if (method === 'Dinheiro') return 'bi-cash-coin text-emerald-500';
        if (method === 'Cartão de Débito') return 'bi-credit-card text-blue-500';
        if (method.includes('Crédito')) return 'bi-credit-card-2-front text-indigo-500';
        if (method.includes('Promissória')) return 'bi-journal-text text-amber-500';
        return 'bi-question-circle text-slate-400';
    };

    const renderMethodItem = (method: string) => {
        const icon = getPaymentIcon(method);
        let detail = "";

        if ((method.includes('Crédito') || method.includes('Promissória')) && payment.amount > 0) {
            const match = method.match(/(\d+)x/);
            if (match) {
                const n = parseInt(match[1]);
                if (n > 0) {
                    const installment = payment.amount / n;
                    detail = `${n}x de ${formatCurrency(installment)}`;
                }
            }
        }

        return (
            <div className="flex items-center gap-3 w-full">
                <i className={`bi ${icon} text-lg shrink-0`} />
                <div className="flex flex-col items-start text-left min-w-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{method}</span>
                    {detail && <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{detail}</span>}
                </div>
            </div>
        );
    };

    if (isMobile) {
        return (
            <div className="p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                <div className="flex flex-col gap-4">
                    {/* Header: Method & Delete */}
                    <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 px-3 py-2.5 rounded-2xl outline-none transition-all"
                            >
                                {renderMethodItem(payment.method)}
                                <i className={`bi bi-chevron-down text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <DropdownPortal anchorRef={dropdownRef} isOpen={isDropdownOpen}>
                                <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar flex flex-col p-1 z-[9999]">
                                    {paymentMethods.map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => {
                                                onChange(idx, 'method', method);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${payment.method === method ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : ''}`}
                                        >
                                            {renderMethodItem(method)}
                                        </button>
                                    ))}
                                </div>
                            </DropdownPortal>
                        </div>
                        <button
                            type="button"
                            onClick={onDelete}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all grow-0 shrink-0"
                        >
                            <i className="bi bi-trash text-lg" />
                        </button>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Valor</label>
                            <div className="flex items-center gap-1 group/input">
                                <CurrencyInput
                                    value={payment.amount}
                                    onChange={(value: number) => onChange(idx, 'amount', value)}
                                />
                                {summary.amountRemaining > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => onChange(idx, 'amount', payment.amount + summary.amountRemaining)}
                                        className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
                                        title="Puxar saldo"
                                    >
                                        <i className="bi bi-magic" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Taxa</label>
                            <div className='flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl pr-2 border border-slate-100 dark:border-slate-800'>
                                <CurrencyOrPercentInput
                                    value={payment.fee}
                                    prefix={payment.feeType === "fixed" ? "R$ " : ""}
                                    suffix={payment.feeType === "fixed" ? "" : " %"}
                                    onChange={(value: number) => onChange(idx, 'fee', value)}
                                />
                                <ToggleValueTypeBtn onClick={onToggleFeeType}>
                                    {payment.feeType === 'fixed' ? 'R$' : '%'}
                                </ToggleValueTypeBtn>
                            </div>
                        </div>
                    </div>

                    {/* Status & Pix */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Status</label>
                        <div className="relative">
                            <select
                                className="w-full bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 focus:border-indigo-500 px-3 py-2 rounded-xl outline-none transition-all text-sm font-medium appearance-none"
                                value={payment.status}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val && window.confirm(`Tem certeza que quer alterar o status para "${val}"?`)) {
                                        onChange(idx, 'status', val);
                                    }
                                }}
                                required
                            >
                                <option value="" disabled>Selecionar status...</option>
                                <option value="Pago">Pago</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Verificar">Verificar</option>
                                {payment.status && !['Pago', 'Pendente', 'Verificar'].includes(payment.status) && (
                                    <option value={payment.status}>{payment.status}</option>
                                )}
                            </select>
                            <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {payment.method === 'Pix' && (
                            <button
                                type="button"
                                onClick={() => setIsPixModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all mt-2"
                            >
                                <i className="bi bi-qr-code text-sm" />
                                Gerar QR Code
                            </button>
                        )}
                    </div>

                    {/* Footer: Total Row */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800 mt-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Total com Taxas:</span>
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
        <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
            <td className="px-4 py-3">
                <div className="relative group/method min-w-[200px]" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between gap-3 bg-transparent border border-slate-100 dark:border-slate-800 group-hover/method:border-indigo-300 dark:group-hover/method:border-indigo-600 focus:border-indigo-500 px-3 py-2 rounded-2xl outline-none transition-all shadow-sm"
                    >
                        {renderMethodItem(payment.method)}
                        <i className={`bi bi-chevron-down text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <DropdownPortal anchorRef={dropdownRef} isOpen={isDropdownOpen} className="fixed shadow-2xl z-[9000]">
                        <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar flex flex-col p-2 z-[9000]">
                            {paymentMethods.map(method => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => {
                                        onChange(idx, 'method', method);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${payment.method === method ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : ''}`}
                                >
                                    {renderMethodItem(method)}
                                </button>
                            ))}
                        </div>
                    </DropdownPortal>
                </div>

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
                        onChange={
                            (value: number) => onChange(idx, 'amount', value)
                        }
                    />
                    {summary.amountRemaining > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange(idx, 'amount', payment.amount + summary.amountRemaining)}
                            className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                            title={`Puxar saldo restante (R$ ${summary.amountRemaining.toFixed(2)})`}
                        >
                            <i className="bi bi-magic" />
                        </button>
                    )}
                </div>
            </td>
            <td className='px-4 py-2'>
                <div className='flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg pr-2 border border-slate-100/50 dark:border-slate-800/50 group-focus-within:border-indigo-200 dark:group-focus-within:border-indigo-500/30 transition-all'>
                    <CurrencyOrPercentInput
                        value={payment.fee}
                        prefix={payment.feeType === "fixed" ? "R$ " : ""}
                        suffix={payment.feeType === "fixed" ? "" : " %"}
                        onChange={
                            (
                                value: number
                            ) => onChange(
                                idx, 'fee', value
                            )

                        }
                    />
                    <ToggleValueTypeBtn onClick={onToggleFeeType}>
                        {payment.feeType === 'fixed' ? 'R$' : '%'}
                    </ToggleValueTypeBtn>
                </div>
            </td>
            <td className="px-4 py-2 text-right">
                <div className="font-bold text-slate-700 dark:text-slate-200">
                    <CurrencyDisplay value={calcPaymentTotalValue(payment)} />
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="relative group/status min-w-[140px]">
                    <select
                        className="w-full bg-transparent border border-slate-100 dark:border-slate-800 group-hover/status:border-indigo-300 dark:group-hover/status:border-indigo-600 focus:border-indigo-500 px-3 py-1.5 rounded-xl outline-none transition-all text-sm dark:text-slate-200 appearance-none"
                        value={payment.status}
                        onChange={e => {
                            const val = e.target.value;
                            if (val && window.confirm(`Tem certeza que quer alterar o status para "${val}"?`)) {
                                onChange(idx, 'status', val);
                            }
                        }}
                        required
                    >
                        <option value="" disabled className="text-slate-400">Status...</option>
                        <option value="Pago">Pago</option>
                        <option value="Pendente">Pendente</option>
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