import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { financeService } from '@/pages/services/financeService';
import { AccountReceivable, FinancialCategory, PaymentStatus } from '../../../types/finance.type';
import { useZodForm } from '@/hooks/useZodForm';
import { receivableFormSchema, receivableSettlementFormSchema, financialToday } from '../../../../../../shared-utils/financialFormSchemas';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { useFinancialOperation } from '../useFinancialOperation';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

interface ReceivableModalProps {
  onClose: () => void;
  onSaved: () => void;
  receivable?: AccountReceivable | null;
}

export default function ReceivableModal(props: ReceivableModalProps) {
  return <ReceivableModalForm key={props.receivable?.id || 'new'} {...props} />;
}
function ReceivableModalForm({ onClose, onSaved, receivable }: ReceivableModalProps) {
  const operation = useFinancialOperation();
  const loading = operation.busy;
  const [categoryError, setCategoryError] = useState('');
  const close = () => { if (!operation.isBusy()) onClose(); };
  const [categories, setCategories] = useState<FinancialCategory[]>([]);

  const [formData, setFormData] = useState({
    description: receivable?.description || '',
    amount: receivable?.amount || 0,
    due_date: receivable?.due_date || financialToday(),
    status: receivable?.status || ('pending' as PaymentStatus),
    category_id: receivable?.category_id || '',
    customer_name: receivable?.customer_name || '',
    notes: receivable?.notes || '',
  });
  const form = useZodForm(receivableFormSchema, formData);
  const settlementValues = {
    id: receivable?.id || '', description: receivable?.description || '', amount: receivable?.amount ?? 0,
    category_id: receivable?.category_id, date: financialToday(),
    status: receivable?.status || ('pending' as PaymentStatus),
  };
  const settlementForm = useZodForm(receivableSettlementFormSchema, settlementValues);
  const showValidationError = (errors: FieldErrors) => { if (operation.current()) toast.error(operation.invalid(errors)); };
  useEffect(() => {
    let active = true;
    void withTimeout(financeService.getCategories('income'), 15_000, null, 'financeiro:categorias')
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

  const handleSave = async (data: z.output<typeof receivableFormSchema>) => {
    if (!operation.current()) return;
    await operation.wait(receivable?.id
      ? financeService.updateReceivable(receivable.id, data) : financeService.createReceivable(data));
    if (!operation.current()) return;
    toast.success('Conta a receber salva!');
    onSaved();
  };

  const handleReceive = async (account: z.output<typeof receivableSettlementFormSchema>) => {
    if (!operation.current()) return;
    await operation.wait(financeService.settleAccount({ kind: 'receivable', account }));
    if (!operation.current()) return;
    toast.success('Conta recebida com sucesso!');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close}></div>

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 xl:p-8 border-b border-slate-50 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none">
              <i className="bi bi-file-earmark-plus text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl xl:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {receivable ? 'Editar Recebimento' : 'Novo Recebimento'}
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Preencha os dados do recebimento financeiro
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
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Descrição
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Referente à venda X, Serviço Y..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Valor (R$)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Data de Vencimento
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Cliente
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="Nome do cliente (opcional)"
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Categoria
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="">Sem categoria</option>
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
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </fieldset>

        {/* Footer */}
        <div className="p-6 xl:p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
          {receivable?.id && (receivable.status === 'pending' || receivable.status === 'overdue') ? (
            <button
              onClick={() => void operation.run(() => settlementForm.validateAndRun(settlementValues, handleReceive, showValidationError))}
              disabled={operation.blocked}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="bi bi-arrow-down-circle text-lg"></i>
              Confirmar Recebimento
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
              onClick={() => void operation.run(() => form.validateAndRun(formData, handleSave, showValidationError))}
              disabled={operation.blocked}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
