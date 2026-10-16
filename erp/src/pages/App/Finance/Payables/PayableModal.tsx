import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { financeService } from '@/pages/services/financeService';
import { AccountPayable, FinancialCategory, PaymentStatus } from '../../../types/finance.type';
import { useZodForm } from '@/hooks/useZodForm';
import { payableExpenseFormSchema, payableSettlementFormSchema, financialToday, buildPayableInstallments } from '../../../../../../shared-utils/financialFormSchemas';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { useFinancialOperation } from '../useFinancialOperation';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

interface PayableModalProps {
  onClose: () => void;
  onSaved: () => void;
  payable?: AccountPayable | null;
}

export default function PayableModal(props: PayableModalProps) {
  return <PayableModalForm key={props.payable?.id || 'new'} {...props} />;
}
function PayableModalForm({ onClose, onSaved, payable }: PayableModalProps) {
  const operation = useFinancialOperation();
  const loading = operation.busy;
  const [categoryError, setCategoryError] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const close = () => { if (!operation.isBusy()) onClose(); };
  const [categories, setCategories] = useState<FinancialCategory[]>([]);

  const [formData, setFormData] = useState({
    description: payable?.description || '',
    amount: payable?.amount || 0,
    due_date: payable?.due_date || financialToday(),
    status: payable?.status || ('pending' as PaymentStatus),
    category_id: payable?.category_id || '',
    supplier_name: payable?.supplier_name || '',
    notes: payable?.notes || '',
  });

  const [expenseType, setExpenseType] = useState<'single' | 'installments' | 'recurring'>('single');
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const recurringFrequency = 'monthly' as const;
  const values = { payable: formData, expenseType, installmentsCount, recurringFrequency, isEditing: !!payable?.id };
  const form = useZodForm(payableExpenseFormSchema, values);
  const settlementValues = {
    id: payable?.id || '', description: payable?.description || '', amount: payable?.amount ?? 0,
    category_id: payable?.category_id, date: financialToday(),
    status: payable?.status || ('pending' as PaymentStatus),
  };
  const settlementForm = useZodForm(payableSettlementFormSchema, settlementValues);
  const showValidationError = (errors: FieldErrors) => { if (operation.current()) toast.error(operation.invalid(errors)); };
  useEffect(() => {
    let active = true;
    void withTimeout(financeService.getCategories('expense'), 15_000, null, 'financeiro:categorias')
      .then((cats) => {
        if (!active) return;
        if (cats) setCategories(cats);
        else setCategoryError('As categorias não responderam. Feche e reabra para consultar novamente.');
      }).catch(() => { if (active) setCategoryError('Não foi possível carregar as categorias. Feche e reabra para consultar novamente.'); });
    return () => { active = false; };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? Number(value) : value,
    }));
  };

  const handleSave = async (input: z.output<typeof payableExpenseFormSchema>) => {
    if (!operation.current()) return;
    const { payable: data, expenseType, recurringFrequency } = input;
    if (payable?.id) await operation.wait(financeService.updatePayable(payable.id, data));
    else if (expenseType === 'single') await operation.wait(financeService.createPayable(data));
    else if (expenseType === 'installments') await operation.wait(financeService.bulkCreatePayables(buildPayableInstallments(input)));
    else await operation.wait(financeService.createRecurringPayableExpense({ request_id: requestId, payable: data, frequency: recurringFrequency }));
    if (!operation.current()) return;
    toast.success(expenseType === 'recurring' && !payable?.id
      ? 'Despesa fixa ativada e previsão de 12 ocorrências gerada!' : 'Conta a pagar salva!');
    onSaved();
  };

  const handlePay = async (account: z.output<typeof payableSettlementFormSchema>) => {
    if (!operation.current()) return;
    await operation.wait(financeService.settleAccount({ kind: 'payable', account }));
    if (!operation.current()) return;
    toast.success('Conta baixada com sucesso!');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close}></div>

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 xl:p-8 border-b border-slate-50 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none">
              <i className="bi bi-file-earmark-minus text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl xl:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {payable ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Preencha os dados do compromisso
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {operation.error && <p role="alert" className="p-4 text-red-700">{operation.error}</p>}
        {categoryError && <p role="alert" className="p-4 text-red-700">{categoryError}</p>}
        {loading && <p role="status" className="p-4 animate-pulse">Validando e salvando a conta…</p>}
        {/* Body */}
        <fieldset disabled={operation.blocked} className="flex-1 overflow-y-auto p-6 xl:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                Descrição <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Aluguel, Luz, Fornecedor X..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>

            {!payable && (
              <div className="space-y-2 md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row gap-4">
                  <label
                    className={`flex-1 flex items-center justify-center p-3 rounded-2xl cursor-pointer transition-all border ${expenseType === 'single' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      checked={expenseType === 'single'}
                      onChange={() => setExpenseType('single')}
                    />
                    <span className="text-sm font-bold text-center">Único</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center p-3 rounded-2xl cursor-pointer transition-all border ${expenseType === 'installments' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      checked={expenseType === 'installments'}
                      onChange={() => setExpenseType('installments')}
                    />
                    <span className="text-sm font-bold text-center">Parcelado</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center p-3 rounded-2xl cursor-pointer transition-all border ${expenseType === 'recurring' ? 'bg-white border-rose-500 text-rose-600 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      checked={expenseType === 'recurring'}
                      onChange={() => setExpenseType('recurring')}
                    />
                    <span className="text-sm font-bold text-center flex items-center gap-1">
                      <i className="bi bi-arrow-repeat"></i> Todo mês (recorrente)
                    </span>
                  </label>
                </div>

                {expenseType === 'installments' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Quantidade de Parcelas:
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="120"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                      className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                      *O valor total abaixo será dividido por {installmentsCount}
                    </span>
                  </div>
                )}

                {expenseType === 'recurring' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Começa em qual mês?
                      </label>
                      <select
                        value={new Date(formData.due_date).getMonth()}
                        onChange={(e) => {
                          const d = new Date(formData.due_date);
                          d.setMonth(parseInt(e.target.value));
                          setFormData({ ...formData, due_date: d.toISOString().split('T')[0] });
                        }}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        {[
                          'Janeiro',
                          'Fevereiro',
                          'Março',
                          'Abril',
                          'Maio',
                          'Junho',
                          'Julho',
                          'Agosto',
                          'Setembro',
                          'Outubro',
                          'Novembro',
                          'Dezembro',
                        ].map((m, i) => (
                          <option key={i} value={i}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                      *Geraremos automaticamente 12 meses de cobrança no Contas a Pagar
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                {expenseType === 'single'
                  ? 'Data do Pagamento'
                  : expenseType === 'recurring'
                    ? 'Dia do Vencimento'
                    : 'Data de Vencimento'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative group/date">
                {expenseType === 'recurring' ? (
                  <select
                    name="due_day_select"
                    value={new Date(formData.due_date).getDate()}
                    onChange={(e) => {
                      const d = new Date(formData.due_date);
                      d.setDate(parseInt(e.target.value));
                      setFormData({ ...formData, due_date: d.toISOString().split('T')[0] });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-sans"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                  />
                )}
                {expenseType === 'recurring' && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-xl">
                    <i className="bi bi-info-circle-fill text-blue-500 text-xs" />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                      Será lançado e marcado como pago automaticamente ao passar da data
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Credor / Fornecedor
              </label>
              <input
                type="text"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleChange}
                placeholder="Nome da empresa ou pessoa"
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                Categoria <span className="text-rose-500">*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-sans"
              >
                <option value="" disabled>
                  Selecione uma categoria
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Observações adicionais
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </fieldset>

        {/* Footer */}
        <div className="p-6 xl:p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
          {payable?.id && (payable.status === 'pending' || payable.status === 'overdue') ? (
            <button
              onClick={() => void operation.run(() => settlementForm.validateAndRun(settlementValues, handlePay, showValidationError))}
              disabled={operation.blocked}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="bi bi-check2-all text-lg"></i>
              Baixar Pagamento
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex gap-4">
            <button
              onClick={close}
              className="flex-1 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => void operation.run(() => form.validateAndRun(values, handleSave, showValidationError))}
              disabled={operation.blocked}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <i className="bi bi-arrow-repeat animate-spin"></i>
              ) : (
                <i className="bi bi-save"></i>
              )}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
