import React from 'react';

interface ItemsTableDesktopHeaderProps {
  readonly hideHandling: boolean;
  readonly isBudget?: boolean;
  readonly useItemEditorModal?: boolean;
}

export const ItemsTableDesktopHeader: React.FC<ItemsTableDesktopHeaderProps> = ({
  hideHandling,
  isBudget,
  useItemEditorModal,
}) => {
  return (
    <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800">
      <tr>
        <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Item
        </th>
        {!hideHandling && (
          <th className="px-2 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[140px]">
            Manuseio
          </th>
        )}
        <th className="px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[105px]">
          Quant <span className="text-red-500">*</span>
        </th>
        <th className="px-2 py-2.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]">
          Preço un <span className="text-red-500">*</span>
        </th>
        <th colSpan={2} className="w-[150px] px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Desconto UN
        </th>
        <th
          className="px-2 py-2.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]"
          title="Preço final un"
        >
          Preço final un
        </th>
        <th className="px-2 py-2.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[105px]">
          Total
        </th>
        <th className={`px-2 py-2.5 text-center border-none bg-transparent ${useItemEditorModal || isBudget ? 'w-24' : 'w-[50px]'}`}>
          {(useItemEditorModal || isBudget) && <span className="sr-only">Ações</span>}
        </th>
      </tr>
    </thead>
  );
};
