import React from 'react';

interface PersonImportProgressBarProps {
  progress: number;
}

export const PersonImportProgressBar: React.FC<PersonImportProgressBarProps> = ({ progress }) => {
  return (
    <div className="px-10 py-4 bg-slate-900 border-t border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
          Processando Importação...
        </span>
        <span className="text-[10px] font-black text-blue-400">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
