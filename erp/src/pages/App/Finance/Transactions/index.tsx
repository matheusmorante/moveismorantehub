import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { financeService } from '@/pages/services/financeService';
import { FinancialTransaction, FinancialCategory } from '../../../types/finance.type';
import CurrencyInput from '../../../../components/CurrencyInput';
import { useZodForm } from '@/hooks/useZodForm';
import { financialTransactionWriteSchema, financialToday } from '../../../../../../shared-utils/financialFormSchemas';
import { z } from 'zod';
import { useFinancialOperation } from '../useFinancialOperation';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { useAuth } from '@/context/AuthContext';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { TransactionSummaryCards } from './TransactionSummaryCards';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatToBRDate = (dateString: string) => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
};

const paymentMethods = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'TED', 'Não informado'];
const accounts = ['Caixa Geral', 'Banco do Brasil', 'Itaú', 'Bradesco', 'Outro'];
const vehicles = ['Strada', 'HR', 'Outro', 'Não informado'];
const PAGE_SIZE = 15;
const normalizeCategoryName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const requiresVehicle = (name = '') => ['combustivel', 'gasolina', 'veiculo', 'pedagio', 'manutencao de veiculos', 'manutencao do carro'].some((term) => normalizeCategoryName(name).includes(term));
const requiresCollaborator = (name = '') => ['salario', 'adiantamento', 'comissao', 'beneficio', 'reembolso'].some((term) => normalizeCategoryName(name).includes(term));
const isProLabore = (name = '') => ['pro-labore', 'prolabore', 'pro labore', 'retirada', 'socio', 'particular'].some((term) => normalizeCategoryName(name).includes(term));
const directTransactionFormSchema = financialTransactionWriteSchema.extend({
  category_id: z.string().trim().min(1, 'Selecione uma categoria.'),
  category_name: z.string().trim().min(1, 'Selecione uma categoria.'),
  payment_method: z.string().trim().min(1, 'Informe a forma de pagamento.'),
  purpose: z.enum(['BUSINESS', 'PERSONAL', 'PERSONAL_PARTNER']).nullish(),
}).superRefine((values, context) => {
  if (values.type === 'expense' && !values.purpose) {
    context.addIssue({ code: 'custom', path: ['purpose'], message: 'Informe a finalidade da saída.' });
  }
});

type TransactionFormData = {
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  payment_method: string;
  category_id: string;
  category_name: string;
  purpose: 'BUSINESS' | 'PERSONAL_PARTNER';
  vehicle_id: string;
  collaborator_id: string;
  collaborator_name: string;
  account_id: string;
  origin: NonNullable<FinancialTransaction['origin']>;
  notes: string;
};

export default function Transactions() {
  const { isAdmin, profile, user } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(1);

  // Cadastro, edição e detalhe de movimentação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const categoriesRef = useRef<FinancialCategory[]>(categories);
  categoriesRef.current = categories;
  const [collaborators, setCollaborators] = useState<{ id: string; name: string }[]>([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const operation = useFinancialOperation();
  const saving = operation.busy;
  const closeModal = () => { if (!operation.isBusy()) setIsModalOpen(false); };
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense' as 'income' | 'expense',
    amount: 0,
    date: financialToday(),
    description: '',
    payment_method: '',
    category_id: '',
    category_name: '',
    purpose: 'BUSINESS' as 'BUSINESS' | 'PERSONAL_PARTNER',
    vehicle_id: '',
    collaborator_id: '',
    collaborator_name: '',
    account_id: 'Caixa Geral',
    origin: 'MANUAL' as const,
    notes: '',
  });
  const form = useZodForm(directTransactionFormSchema, formData);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const selectedCategory = categories.find((category) => category.id === formData.category_id);
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const getCategoryParentName = (categoryId?: string | null) => {
    const parentId = categoryId ? categoriesById.get(categoryId)?.parent_id : null;
    return parentId ? categoriesById.get(parentId)?.name : undefined;
  };
  const needsCollaborator = formData.type === 'expense' && requiresCollaborator(selectedCategory?.name);
  const needsVehicle = formData.type === 'expense' && requiresVehicle(selectedCategory?.name);

  useEffect(() => {
    if (!isModalOpen || !needsCollaborator || collaborators.length > 0) return;
    let current = true;
    setCollaboratorsLoading(true);
    void financeService.getCollaborators().then(setCollaborators).catch(() => setCollaborators([])).finally(() => {
      if (current) setCollaboratorsLoading(false);
    });
    return () => { current = false; };
  }, [isModalOpen, needsCollaborator, collaborators.length]);

  useEffect(() => {
    let current = true;
    void financeService.getCategories().then((data) => {
      if (current) setCategories(data);
    }).catch(() => {
      if (current) setLoadError('Não foi possível carregar as categorias. Tente novamente.');
    });
    return () => { current = false; };
  }, []);

  const fetchTransactions = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await withTimeout(financeService.getTransactionPage({
        type: typeFilter,
        categoryId: categoryFilter,
        paymentMethod: paymentFilter,
        accountId: accountFilter,
        search: debouncedSearch,
      }, page), 15_000, null, 'financeiro:movimentacoes');
      if (currentRequestId !== requestId.current) return;
      if (!result) throw new Error('Prazo de consulta excedido.');
      const categoryNames = new Map(categoriesRef.current.map((category) => [category.id, category.name]));
      setTransactions(result.rows.map((transaction) => ({
        ...transaction,
        category_name: transaction.category_name || categoryNames.get(transaction.category_id || '') || null,
      })));
      setTotalCount(result.total_count);
      setIncomeTotal(result.income_total);
      setExpenseTotal(result.expense_total);
    } catch {
      if (currentRequestId === requestId.current) {
        setLoadError('Não foi possível carregar as movimentações. Tente novamente.');
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [accountFilter, categoryFilter, debouncedSearch, page, paymentFilter, typeFilter]);

  useEffect(() => {
    void fetchTransactions();
    return () => {
      requestId.current += 1;
    };
  }, [fetchTransactions]);

  const handleSaveTransaction = async (data: z.output<typeof directTransactionFormSchema>) => {
    if (!operation.current()) return;
    const category = categories.find((item) => item.id === data.category_id);
    const editableFields = {
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description,
      payment_method: data.payment_method,
      category_id: data.category_id,
      category_name: category?.name || data.category_name,
      result_nature: category?.result_nature,
      purpose: data.type === 'expense' ? data.purpose : null,
      vehicle_id: needsVehicle ? data.vehicle_id || null : null,
      collaborator_id: needsCollaborator ? data.collaborator_id || null : null,
      collaborator_name: needsCollaborator ? data.collaborator_name || null : null,
    };
    await operation.wait(editingTransaction
      ? financeService.updateTransaction(editingTransaction.id, editableFields)
      : financeService.createTransaction({
        ...data,
        ...editableFields,
        account_id: data.account_id || 'Caixa Geral',
        origin: 'MANUAL',
        created_by: profile?.full_name || user?.email || 'Operador',
        status: 'ACTIVE',
      }));
    if (!operation.current()) return;
    toast.success(editingTransaction ? 'Movimentação atualizada!' : 'Movimentação registrada!');
    setIsModalOpen(false);
    setEditingTransaction(null);
    setFormData({ type: 'expense', amount: 0, date: financialToday(), description: '', payment_method: '', category_id: '', category_name: '', purpose: 'BUSINESS', vehicle_id: '', collaborator_id: '', collaborator_name: '', account_id: 'Caixa Geral', origin: 'MANUAL', notes: '' });
    void fetchTransactions();
  };

  const visible = transactions;
  const availableCategories = categories.filter((category) =>
    category.type === formData.type && (
      formData.type !== 'expense' || (formData.purpose === 'PERSONAL_PARTNER'
        ? isProLabore(category.name)
        : !isProLabore(category.name))
    )
  );

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setFormData({ type: 'expense', amount: 0, date: financialToday(), description: '', payment_method: '', category_id: '', category_name: '', purpose: 'BUSINESS', vehicle_id: '', collaborator_id: '', collaborator_name: '', account_id: 'Caixa Geral', origin: 'MANUAL', notes: '' });
    setIsModalOpen(true);
  };

  const openEditTransaction = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: Number(transaction.amount) || 0,
      date: transaction.date || financialToday(),
      description: transaction.description || '',
      payment_method: transaction.payment_method || '',
      category_id: transaction.category_id || '',
      category_name: transaction.category_name || categories.find((category) => category.id === transaction.category_id)?.name || '',
      purpose: transaction.purpose === 'PERSONAL_PARTNER' ? 'PERSONAL_PARTNER' : 'BUSINESS',
      vehicle_id: transaction.vehicle_id || '',
      collaborator_id: transaction.collaborator_id || '',
      collaborator_name: transaction.collaborator_name || '',
      account_id: transaction.account_id || 'Caixa Geral',
      origin: transaction.origin || 'MANUAL',
      notes: transaction.notes || '',
    });
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const runTransactionAction = async (action: 'delete' | 'reverse', transaction: FinancialTransaction) => {
    const accepted = window.confirm(action === 'delete'
      ? `Excluir definitivamente a movimentação “${transaction.description}”?`
      : `Estornar a movimentação “${transaction.description}”?`);
    if (!accepted) return;
    await operation.run(async () => {
      await operation.wait(action === 'delete'
        ? financeService.deleteTransaction(transaction.id)
        : financeService.reverseTransaction(transaction.id));
      if (!operation.current()) return;
      toast.success(action === 'delete' ? 'Movimentação excluída.' : 'Movimentação estornada.');
      setSelectedTransaction(null);
      await fetchTransactions();
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {!isModalOpen && operation.error && <p role="alert" className="p-4 text-red-700">{operation.error}</p>}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-10">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-6">
          <div className="flex items-start xl:items-center gap-4 xl:gap-6">
            <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
              <i className="bi bi-clock-history text-2xl xl:text-3xl"></i>
            </div>
            <div>
              <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                Movimentações
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                Histórico completo de entradas e saídas de caixa.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={openNewTransaction}
              disabled={operation.blocked}
              className="flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto"
            >
              <i className="bi bi-plus-lg text-sm xl:text-base" />
              Novo Lançamento
            </button>
          </div>
        </div>

        <TransactionSummaryCards
          incomeTotal={incomeTotal}
          expenseTotal={expenseTotal}
          formatCurrency={formatCurrency}
        />

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all flex-col flex h-full">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="Buscar no histórico..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-slate-200"
              />
            </div>
            <div className="flex gap-2 border border-slate-100 dark:border-slate-800 p-1 rounded-xl bg-slate-50 dark:bg-slate-950">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'income', label: 'Entradas' },
                { id: 'expense', label: 'Saídas' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => { setTypeFilter(filter.id as any); setPage(1); }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === filter.id
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              aria-label="Filtrar movimentações por categoria"
              value={categoryFilter}
              onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parent_id ? `　${category.name}` : category.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar movimentações por forma de pagamento"
              value={paymentFilter}
              onChange={(event) => { setPaymentFilter(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">Todas as formas de pagamento</option>
              {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
            <select
              aria-label="Filtrar movimentações por conta ou caixa"
              value={accountFilter}
              onChange={(event) => { setAccountFilter(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">Todas as contas e caixas</option>
              {accounts.map((account) => <option key={account} value={account}>{account}</option>)}
            </select>
          </div>

          {loadError && (
            <div
              role="alert"
              className="mx-6 my-4 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void fetchTransactions()}
                disabled={loading}
                className="font-bold underline disabled:opacity-50"
              >
                Tentar novamente
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                    Cód.
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                    Data
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                    Descrição
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-center">
                    Tipo
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-center">
                    Método
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">
                    Valor
                  </th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {visible.map((transaction) => {
                  const isIncome = transaction.type === 'income';
                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group"
                    >
                      <td className="px-8 py-5 text-xs font-mono font-bold text-slate-400">
                        #{transaction.id?.slice(0, 8)}
                      </td>
                      <td className="px-8 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">
                        {formatToBRDate(transaction.date)}
                      </td>
                      <td className="px-8 py-5">
                        <span className="block font-bold text-slate-700 dark:text-slate-200">
                          {transaction.description}
                        </span>
                        {transaction.category_id && (
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 inline-block">
                            {getCategoryParentName(transaction.category_id)
                              ? `${getCategoryParentName(transaction.category_id)} · `
                              : ''}
                            {transaction.category_name || categoriesById.get(transaction.category_id)?.name ||
                              'Outros'}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20'}`}
                        >
                          {isIncome ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center text-xs font-bold text-slate-500">
                        {transaction.payment_method}
                      </td>
                      <td
                        className={`px-8 py-5 text-right font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                      >
                        {isIncome ? '+ ' : '- '}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-5 text-right whitespace-nowrap">
                        <button type="button" onClick={() => setSelectedTransaction(transaction)} className="mr-2 text-xs font-bold text-blue-600 hover:underline">Detalhes</button>
                        <button type="button" onClick={() => openEditTransaction(transaction)} className="mr-2 text-xs font-bold text-slate-600 hover:underline dark:text-slate-300">Editar</button>
                        {isAdmin && transaction.status !== 'REVERSED' && (
                          <button type="button" onClick={() => void runTransactionAction('reverse', transaction)} className="mr-2 text-xs font-bold text-amber-700 hover:underline">Estornar</button>
                        )}
                        <button type="button" onClick={() => void runTransactionAction('delete', transaction)} className="text-xs font-bold text-rose-600 hover:underline">Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ERPListPagination ariaLabel="Paginação de movimentações financeiras" page={page} pageSize={PAGE_SIZE} fixedPageSize={PAGE_SIZE}
            totalItems={totalCount} onPageChange={setPage}
            itemLabel="movimentações" loading={loading} className="px-4 py-3" />

          {loading && (
            <div className="p-20 flex flex-col items-center justify-center flex-1">
              <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Carregando Histórico...
              </p>
            </div>
          )}

          {totalCount === 0 && !loading && !loadError && (
            <div className="p-20 flex flex-col items-center justify-center text-center flex-1">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6 border border-slate-100 dark:border-slate-800">
                <i className="bi bi-clock-history text-4xl"></i>
              </div>
              <h4 className="text-xl font-black text-slate-400">
                Nenhuma movimentação encontrada com esses filtros.
              </h4>
            </div>
          )}
        </div>
      </div>

      {/* Modal Lançamento Rápido */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          ></div>
          <div role="dialog" aria-modal="true" aria-labelledby="financial-transaction-title" className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col animate-slide-up">
            <div className="p-6 xl:p-8 border-b border-slate-50 dark:border-slate-800">
              {operation.error && <p role="alert" className="p-4 text-red-700">{operation.error}</p>}
              {saving && <p role="status" className="p-4 animate-pulse">Validando e registrando a movimentação…</p>}
              <h2 id="financial-transaction-title" className="text-xl font-black text-slate-800 dark:text-slate-100">
                {editingTransaction ? 'Editar movimentação' : 'Lançamento Direto no Caixa'}
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Sem vínculo com Contas a Pagar/Receber
              </p>
            </div>
            <fieldset disabled={operation.blocked} className="p-6 xl:p-8 space-y-4">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setFormData({ ...formData, type: 'income', category_id: '', category_name: '', purpose: 'BUSINESS', vehicle_id: '', collaborator_id: '', collaborator_name: '' })}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    formData.type === 'income'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                      : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  Entrada
                </button>
                <button
                  onClick={() => setFormData({ ...formData, type: 'expense', category_id: '', category_name: '', purpose: 'BUSINESS', vehicle_id: '', collaborator_id: '', collaborator_name: '' })}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    formData.type === 'expense'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none'
                      : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  Saída
                </button>
              </div>

              {formData.type === 'expense' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Finalidade</label>
                  <div role="group" aria-label="Finalidade da saída" className="flex gap-2">
                    {[
                      { value: 'BUSINESS', label: '🏢 Operação da Empresa' },
                      { value: 'PERSONAL_PARTNER', label: '👤 Uso Particular' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={formData.purpose === option.value}
                        onClick={() => {
                          const purpose = option.value as 'BUSINESS' | 'PERSONAL_PARTNER';
                          const proLabore = purpose === 'PERSONAL_PARTNER'
                            ? categories.find((category) => category.type === 'expense' && isProLabore(category.name))
                            : undefined;
                          setFormData({
                            ...formData,
                            purpose,
                            category_id: proLabore?.id || '',
                            category_name: proLabore?.name || '',
                            vehicle_id: '',
                            collaborator_id: '',
                            collaborator_name: '',
                          });
                        }}
                        className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold ${formData.purpose === option.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-4">
                <CurrencyInput
                  value={formData.amount}
                  onChangeValue={(val) => setFormData({ ...formData, amount: val })}
                  showBadge={false}
                  className="w-1/2 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-1/2 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={formData.category_id}
                onChange={(e) => {
                  const category = availableCategories.find((item) => item.id === e.target.value);
                  setFormData({ ...formData, category_id: e.target.value, category_name: category?.name || '', vehicle_id: '', collaborator_id: '', collaborator_name: '' });
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma categoria</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parent_id ? `　${category.name}` : category.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Forma de pagamento"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione a forma de pagamento</option>
                {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>

              {needsVehicle && (
                <select
                  aria-label="Veículo"
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o veículo (opcional)</option>
                  {vehicles.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
                </select>
              )}

              {needsCollaborator && (
                <select
                  aria-label="Colaborador / Funcionário"
                  value={formData.collaborator_id}
                  onChange={(e) => {
                    const collaborator = collaborators.find((item) => item.id === e.target.value);
                    setFormData({ ...formData, collaborator_id: collaborator?.id || '', collaborator_name: collaborator?.name || '' });
                  }}
                  disabled={collaboratorsLoading}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value="">{collaboratorsLoading ? 'Carregando colaboradores…' : 'Selecione um colaborador (opcional)'}</option>
                  {collaborators.map((collaborator) => <option key={collaborator.id} value={collaborator.id}>{collaborator.name}</option>)}
                </select>
              )}
            </fieldset>
            <div className="p-6 xl:p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
              <button
                onClick={closeModal}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={() => void operation.run(() => form.validateAndRun(formData, handleSaveTransaction, (errors) => {
                  if (operation.current()) toast.error(operation.invalid(errors));
                }))}
                disabled={operation.blocked}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-colors disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none flex justify-center items-center gap-2"
              >
                {saving ? (
                  <i className="bi bi-arrow-repeat animate-spin"></i>
                ) : (
                  <i className="bi bi-check-lg"></i>
                )}
                {editingTransaction ? 'Salvar alterações' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          categoryName={selectedTransaction.category_name || categoriesById.get(selectedTransaction.category_id || '')?.name || 'Sem categoria'}
          categoryParentName={getCategoryParentName(selectedTransaction.category_id) || '—'}
          isAdmin={isAdmin}
          formatCurrency={formatCurrency}
          formatToBRDate={formatToBRDate}
          onClose={() => setSelectedTransaction(null)}
          onEdit={() => openEditTransaction(selectedTransaction)}
          onReverse={() => void runTransactionAction('reverse', selectedTransaction)}
        />
      )}
    </div>
  );
}
