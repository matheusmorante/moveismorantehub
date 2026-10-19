import { Box, CreditCard, MapPin, UserRound } from 'lucide-react';

export type ReturnFormTab = 'customer' | 'items' | 'payment' | 'collection';

type Props = {
  activeTab: ReturnFormTab;
  onChange: (tab: ReturnFormTab) => void;
  variant?: 'linked' | 'unlinked';
};

const ReturnFormTabs = ({ activeTab, onChange, variant = 'linked' }: Props) => (
  <nav
    aria-label="Etapas da devolução"
    className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
  >
    {variant === 'unlinked' && (
      <button
        type="button"
        onClick={() => onChange('customer')}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'customer' ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
      >
        <UserRound className="h-4 w-4" /> Cliente
      </button>
    )}
    <button
      type="button"
      onClick={() => onChange('items')}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'items' ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
    >
      <Box className="h-4 w-4" /> Itens
    </button>
    {variant === 'linked' ? (
      <button
        type="button"
        onClick={() => onChange('collection')}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'collection' ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
      >
        <MapPin className="h-4 w-4" /> Coleta e observações
      </button>
    ) : (
      <button
        type="button"
        onClick={() => onChange('payment')}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'payment' ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
      >
        <CreditCard className="h-4 w-4" /> Pagamento
      </button>
    )}
  </nav>
);

export default ReturnFormTabs;
