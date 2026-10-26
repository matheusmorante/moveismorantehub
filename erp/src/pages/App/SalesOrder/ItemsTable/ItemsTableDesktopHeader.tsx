import React from 'react';

interface ItemsTableDesktopHeaderProps {
  readonly hideHandling: boolean;
}

export const ItemsTableDesktopHeader: React.FC<ItemsTableDesktopHeaderProps> = ({
  hideHandling,
}) => {
  return (
    <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800">
      <tr>
        <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Item
        </th>
        {!hideHandling && (
          <th className="px-2 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[140px]">
            Manuseio
          </th>
        )}
        <th className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[105px]">
          Quantidade <span className="text-red-500">*</span>
        </th>
        <th className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]">
          Preço unitário <span className="text-red-500">*</span>
        </th>
        <th colSpan={2} className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Desconto
        </th>
        <th
          className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]"
          title="Preço final unitário"
        >
          Preço final unitário
        </th>
        <th className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[105px]">
          Total
        </th>
        <th className="px-2 py-2.5 text-center border-none bg-transparent w-[50px]"></th>
      </tr>
    </thead>
  );
};
