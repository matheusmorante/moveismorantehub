import React from 'react';

const ComingSoon = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] bg-slate-50/30 dark:bg-slate-900/10">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-full shadow-2xl shadow-slate-100 dark:shadow-none mb-8 border border-slate-50 dark:border-slate-800">
        <i className="bi bi-hammer text-6xl text-slate-200 dark:text-slate-700" />
      </div>
      <h3 className="text-slate-800 dark:text-slate-100 font-black text-xl mb-2">{title}</h3>
      <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
        Esta funcionalidade está sendo desenvolvida
      </p>
    </div>
  );
};

export default ComingSoon;
