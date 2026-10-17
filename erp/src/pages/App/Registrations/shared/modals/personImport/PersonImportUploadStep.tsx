import React from 'react';

interface PersonImportUploadStepProps {
  busy: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileLoad: (file: File) => void;
}

export const PersonImportUploadStep: React.FC<PersonImportUploadStepProps> = ({
  busy,
  fileInputRef,
  onFileLoad,
}) => {
  return (
    <div
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-label="Selecionar arquivo CSV"
      aria-disabled={busy}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!busy) fileInputRef.current?.click();
        }
      }}
      onClick={() => {
        if (!busy) fileInputRef.current?.click();
      }}
      className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-32 flex flex-col items-center justify-center gap-6 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
    >
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform">
        <i className="bi bi-file-earmark-arrow-up text-4xl text-blue-600"></i>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
          Arraste seu arquivo CSV
        </h3>
        <p className="text-slate-400 font-medium max-w-sm">
          Dica: Utilize cabeçalhos claros como Nome, CPF/CNPJ, Email, Telefone, CEP, Cidade.
        </p>
      </div>
      <input
        type="file"
        aria-label="Arquivo CSV"
        disabled={busy}
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void onFileLoad(file);
        }}
        accept=".csv"
        className="hidden"
      />
    </div>
  );
};
