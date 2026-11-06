import type { FinancialTransaction } from '../../../types/finance.type';

interface TransactionDetailsModalProps {
  transaction: FinancialTransaction;
  categoryName: string;
  categoryParentName: string;
  isAdmin: boolean;
  formatCurrency: (value: number) => string;
  formatToBRDate: (dateString: string) => string;
  onClose: () => void;
  onEdit: () => void;
  onReverse: () => void;
}

export const TransactionDetailsModal = ({
  transaction,
  categoryName,
  categoryParentName,
  isAdmin,
  formatCurrency,
  formatToBRDate,
  onClose,
  onEdit,
  onReverse,
}: TransactionDetailsModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section role="dialog" aria-modal="true" aria-labelledby="transaction-details-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="transaction-details-title" className="text-xl font-black text-slate-900 dark:text-slate-100">Detalhes da movimentação</h2>
          <p className="mt-1 text-sm text-slate-500">#{transaction.id.slice(0, 8)}</p>
        </div>
        <button type="button" aria-label="Fechar detalhes" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
      </div>
      <div className="mb-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
        <p className={`text-2xl font-black ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {transaction.type === 'income' ? '+ ' : '- '}{formatCurrency(transaction.amount)}
        </p>
        <p className="mt-1 font-bold text-slate-800 dark:text-slate-100">{transaction.description}</p>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          ['Categoria', categoryName],
          ['Categoria pai', categoryParentName],
          ['Natureza', transaction.result_nature === 'NAO_AFETA_RESULTADO' ? 'Não afeta resultado' : transaction.result_nature === 'RECEITA' ? 'Receita' : 'Despesa'],
          ['Data e horário', `${formatToBRDate(transaction.date)}${transaction.transaction_time ? ` às ${transaction.transaction_time.slice(0, 5)}` : ''}`],
          ['Tipo', transaction.type === 'income' ? 'Entrada' : 'Saída'],
          ['Forma de pagamento', transaction.payment_method || 'Não informada'],
          ['Conta / Caixa', transaction.account_id || 'Caixa Geral'],
          ['Finalidade', transaction.purpose === 'PERSONAL_PARTNER' ? 'Uso particular' : 'Operação da empresa'],
          ['Pessoa / Empresa', transaction.counterparty || '—'],
          ['Colaborador', transaction.collaborator_name || '—'],
          ['Veículo', transaction.vehicle_id || '—'],
          ['Origem', transaction.origin === 'AI_ASSISTANT' ? 'IA Assistente' : transaction.origin || 'Manual'],
          ['Registrado por', transaction.created_by || 'Sistema'],
          ['Status', transaction.status || 'ACTIVE'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
      {transaction.notes && (
        <div className="mt-3 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Observações</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{transaction.notes}</p>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onEdit} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Editar</button>
        {isAdmin && transaction.status !== 'REVERSED' && (
          <button type="button" onClick={onReverse} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-bold text-amber-800">Estornar</button>
        )}
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Fechar</button>
      </div>
    </section>
  </div>
);
