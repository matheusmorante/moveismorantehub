import React from 'react';
import { ImportStep } from './types';

interface PersonImportHeaderProps {
  title: string;
  step: ImportStep;
  encoding: 'UTF-8' | 'ISO-8859-1';
  setEncoding: (enc: 'UTF-8' | 'ISO-8859-1') => void;
  busy: boolean;
  onClose: () => void;
}

export const PersonImportHeader: React.FC<PersonImportHeaderProps> = ({
  title,
  step,
  encoding,
  setEncoding,
  busy,
  onClose,
}) => {
  return (
    <div className="px-10 py-6 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
          Importação de {title}
        </h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
          Carregue sua planilha CSV para processamento em lote
        </p>
      </div>

      <div className="flex items-center gap-4">
        {step === 'upload' && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[9px] font-black uppercase text-slate-400 px-2">
              Encoding:
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEncoding('UTF-8')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                encoding === 'UTF-8' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              UTF-8
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEncoding('ISO-8859-1')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                encoding === 'ISO-8859-1' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              ANSI
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label="Fechar importação"
          onClick={onClose}
          disabled={busy}
          className="p-2 text-slate-400 hover:text-red-500"
        >
          <i className="bi bi-x-lg text-xl"></i>
        </button>
      </div>
    </div>
  );
};
