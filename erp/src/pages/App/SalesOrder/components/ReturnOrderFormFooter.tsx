import { Tag } from 'lucide-react';

type Props = {
  total: number;
  itemCount: number;
  relationshipLabel: string;
  submitLabel: string;
  submitStatusLabel?: string;
  disabled: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

const ReturnOrderFormFooter = ({
  total,
  itemCount,
  relationshipLabel,
  submitLabel,
  submitStatusLabel,
  disabled,
  submitting,
  onClose,
  onSubmit,
}: Props) => (
  <footer className="shrink-0 border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-6 flex items-center justify-between px-2">
      <div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
          Total da devolução
        </span>
        <div className="text-2xl font-black text-amber-600">
          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div className="text-right text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
        {itemCount} itens selecionados
        <span className="mt-1 block text-[9px] text-slate-400">{relationshipLabel}</span>
      </div>
    </div>
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="flex-1 rounded-2xl border border-slate-200 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-amber-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-amber-500/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {submitStatusLabel || (submitting ? 'Processando...' : <><Tag className="h-4 w-4" />{submitLabel}</>)}
      </button>
    </div>
  </footer>
);

export default ReturnOrderFormFooter;
