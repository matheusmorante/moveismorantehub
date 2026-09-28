import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { financeService } from '@/pages/services/financeService';
import { AccountReceivable, FinancialCategory, PaymentStatus } from '../../../types/finance.type';

interface ReceivableModalProps {
  onClose: () => void;
  onSaved: () => void;
  receivable?: AccountReceivable | null;
}

export default function ReceivableModal({ onClose, onSaved, receivable }: ReceivableModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);

  const [formData, setFormData] = useState({
    description: receivable?.description || '',
    amount: receivable?.amount || 0,
    due_date: receivable?.due_date || new Date().toISOString().split('T')[0],
    status: receivable?.status || ('pending' as PaymentStatus),
    category_id: receivable?.category_id || '',
    customer_name: receivable?.customer_name || '',
    notes: receivable?.notes || '',
  });

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await financeService.getCategories('income');
        setCategories(cats || []);
      } catch (error) {
        console.error('Erro ao buscar categorias', error);
      }
    };
    fetchCats();
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

  const handleSave = async () => {
    if (!formData.description || formData.amount <= 0 || !formData.due_date) {
      toast.error('Preencha descrição, valor e vencimento.');
      return;
    }

    setLoading(true);
    try {
      if (receivable?.id) {
        await financeService.updateReceivable(receivable.id, formData);
        toast.success('Conta a receber atualizada!');
      } else {
        await financeService.createReceivable(formData);
        toast.success('Conta a receber cadastrada!');
      }
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar conta a receber.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!receivable?.id) return;
    setLoading(true);
    try {
      await financeService.updateReceivable(receivable.id, {
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
      });

      // Generate Transaction Record automaticaly
      await financeService.createTransaction({
        type: 'income',
        amount: receivable.amount,
        date: new Date().toISOString().split('T')[0],
        description: `Recebimento: ${receivable.description}`,
        payment_method: 'Manual/Outros',
        category_id: receivable.category_id,
        receivable_id: receivable.id,
      });

      toast.success('Conta recebida com sucesso!');
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao receber conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

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
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 xl:p-8 space-y-6">
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
        </div>

        {/* Footer */}
        <div className="p-6 xl:p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
          {receivable?.id && receivable.status !== 'paid' ? (
            <button
              onClick={handleReceive}
              disabled={loading}
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
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
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
