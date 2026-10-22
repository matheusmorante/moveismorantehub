import React from 'react';

export const DropdownGroup = ({ title }: { title: string }) => (
  <div className="px-3 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 select-none">
    {title}
  </div>
);

export default DropdownGroup;
