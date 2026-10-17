import React from 'react';

interface SmartAIFillManualJsonTabProps {
  manualJSON: string;
  setManualJSON: (val: string) => void;
  busy: boolean;
  applyBlocked: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessManualJSON: () => void;
}

export const SmartAIFillManualJsonTab: React.FC<SmartAIFillManualJsonTabProps> = ({
  manualJSON,
  setManualJSON,
  busy,
  applyBlocked,
  onFileUpload,
  onProcessManualJSON,
}) => {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Carregue um arquivo JSON gerado anteriormente ou cole a estrutura JSON diretamente abaixo.
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-sm">
          <i className="bi bi-cloud-upload-fill text-xs" /> Carregar Arquivo JSON
          <input
            type="file"
            accept=".json"
            onChange={onFileUpload}
            disabled={busy || applyBlocked}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={manualJSON}
          onChange={(e) => setManualJSON(e.target.value)}
          disabled={busy || applyBlocked}
          placeholder="Cole aqui o JSON estruturado..."
          rows={8}
          className="w-full p-3.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none custom-scrollbar text-slate-800 dark:text-slate-200"
        />
        <button
          type="button"
          onClick={onProcessManualJSON}
          disabled={busy || applyBlocked}
          className="self-end px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
        >
          Processar e Preencher
        </button>
      </div>
    </div>
  );
};
