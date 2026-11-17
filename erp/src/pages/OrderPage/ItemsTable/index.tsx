import Item from '../../types/items.type';
import Footer from './Footer';
import { ItemsSummary } from '../../types/items.type';
import Body from './Body';

interface Props {
  items: Item[];
  summary: ItemsSummary;
  compact?: boolean;
}

const ItemsTable = ({ items, summary, compact = false }: Props) => {
  const borderClasses = compact
    ? 'border-b border-slate-200 [&_td]:border-b [&_th]:border-b [&_td]:border-slate-100 [&_th]:border-slate-200'
    : '[&_td]:border-2 [&_th]:border-2 [&_td]:border-slate-300 [&_th]:border-slate-300 dark:[&_td]:border-slate-800 dark:[&_th]:border-slate-800';

  return (
    <table className={`break-words w-full border-collapse transition-colors duration-300 ${compact ? 'compact-print-items-table' : ''} ${borderClasses}`}>
      <colgroup>
        <col className="w-full" /> {/* Descrição greedy */}
        <col className="w-[1px]" /> {/* Qtd maximal minimal */}
        <col className="w-[1px]" /> {/* Preço Un. minimal */}
        <col className="w-[1px]" /> {/* Desc. Un. minimal */}
        <col className="w-[1px]" /> {/* Valor Total minimal */}
      </colgroup>
      <thead>
        <tr className={`${compact ? 'text-[10px] text-slate-600' : 'text-xs text-slate-400'} font-black uppercase tracking-tight bg-slate-50/50`}>
          <th className={`${compact ? 'px-2' : 'px-3'} py-1 text-left whitespace-nowrap`}>Desc. produto/serviço</th>
          <th className={`${compact ? 'px-2 py-1 text-center' : 'px-1 py-1 text-right'} whitespace-nowrap`}>Qtd</th>
          <th className="px-2 py-1 text-right whitespace-nowrap">Preço Un.</th>
          <th className="px-2 py-1 text-right whitespace-nowrap">Desc. Un.</th>
          <th className="px-2 py-1 text-right whitespace-nowrap">Valor Total</th>
        </tr>
      </thead>

      <Body items={items} compact={compact} />
      <Footer summary={summary} compact={compact} />
    </table>
  );
};

export default ItemsTable;
