import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { FinancialCategory, FinancialTransaction } from '../../../types/finance.type';

const PAGE_SIZE = 15;

interface TransactionsTableProps {
  transactions: FinancialTransaction[];
  categoriesById: Map<string, FinancialCategory>;
  getCategoryParentName: (categoryId?: string | null) => string | undefined;
  isAdmin: boolean;
  formatCurrency: (value: number) => string;
  formatToBRDate: (dateString: string) => string;
  onSelectTransaction: (transaction: FinancialTransaction) => void;
  onEditTransaction: (transaction: FinancialTransaction) => void;
  onReverseTransaction: (transaction: FinancialTransaction) => void;
  onDeleteTransaction: (transaction: FinancialTransaction) => void;
  page: number;
  onPageChange: (page: number) => void;
  totalCount: number;
  loading: boolean;
  loadError: string | null;
}

export function TransactionsTable({
  transactions,
  categoriesById,
  getCategoryParentName,
  isAdmin,
  formatCurrency,
  formatToBRDate,
  onSelectTransaction,
  onEditTransaction,
  onReverseTransaction,
  onDeleteTransaction,
  page,
  onPageChange,
  totalCount,
  loading,
  loadError,
}: TransactionsTableProps) {
  return (
    <>
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
            {transactions.map((transaction) => {
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
                    <button type="button" onClick={() => onSelectTransaction(transaction)} className="mr-2 text-xs font-bold text-blue-600 hover:underline">Detalhes</button>
                    <button type="button" onClick={() => onEditTransaction(transaction)} className="mr-2 text-xs font-bold text-slate-600 hover:underline dark:text-slate-300">Editar</button>
                    {isAdmin && transaction.status !== 'REVERSED' && (
                      <button type="button" onClick={() => onReverseTransaction(transaction)} className="mr-2 text-xs font-bold text-amber-700 hover:underline">Estornar</button>
                    )}
                    <button type="button" onClick={() => onDeleteTransaction(transaction)} className="text-xs font-bold text-rose-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ERPListPagination ariaLabel="Paginação de movimentações financeiras" page={page} pageSize={PAGE_SIZE} fixedPageSize={PAGE_SIZE}
        totalItems={totalCount} onPageChange={onPageChange}
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
    </>
  );
}
