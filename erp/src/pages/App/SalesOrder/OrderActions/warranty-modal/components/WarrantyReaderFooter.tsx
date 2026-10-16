import React from 'react';

interface WarrantyReaderFooterProps {
  version: number;
  sha256?: string | null;
  actionLoading: boolean;
  isAdministrator?: boolean;
  onPrint: () => void;
  onSendWhatsApp: () => void;
  onSendDirectCloudApi: () => void;
}

export const WarrantyReaderFooter: React.FC<WarrantyReaderFooterProps> = ({
  version,
  sha256,
  actionLoading,
  isAdministrator = true,
  onPrint,
  onSendWhatsApp,
  onSendDirectCloudApi,
}) => {
  return (
    <footer className="h-auto min-h-16 py-3 px-4 sm:px-8 bg-slate-900 border-t border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 shadow-lg">
      {/* Informações de Documento e Autenticidade */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="font-mono text-slate-500">v{version}</span>
        {sha256 && (
          <div
            className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-slate-500 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800"
            title={`Hash SHA-256 de autenticidade jurídica: ${sha256}`}
          >
            <span>SHA-256:</span>
            <span>{sha256.substring(0, 16)}...</span>
          </div>
        )}
      </div>

      {/* Botões de Ação Principais */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
        {/* Botão Imprimir */}
        <button
          type="button"
          disabled={actionLoading}
          onClick={onPrint}
          className="px-3.5 sm:px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm border border-slate-700 disabled:opacity-50 cursor-pointer"
        >
          <i className="bi bi-printer-fill text-sm" />
          <span>Imprimir</span>
        </button>

        {/* Botão Enviar pelo WhatsApp (Web / wa.me) */}
        <button
          type="button"
          disabled={actionLoading}
          onClick={onSendWhatsApp}
          title="Abrir WhatsApp Web com mensagem e link do PDF"
          className="px-3.5 sm:px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-emerald-900/40 disabled:opacity-50 cursor-pointer"
        >
          <i className="bi bi-whatsapp text-sm" />
          <span>Enviar pelo WhatsApp</span>
        </button>

        {/* Botão Enviar diretamente (Cloud WhatsApp) */}
        <button
          type="button"
          disabled={actionLoading || !isAdministrator}
          onClick={onSendDirectCloudApi}
          title={
            !isAdministrator
              ? 'Disponível apenas para administradores (Beta)'
              : 'Enviar PDF do Termo de Garantia diretamente para o cliente via Cloud WhatsApp API'
          }
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer ${
            !isAdministrator
              ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400 border border-slate-700'
              : 'bg-amber-400 hover:bg-amber-300 text-[#3b1900] border border-amber-500 shadow-amber-900/30 hover:-translate-y-0.5'
          } disabled:opacity-50`}
        >
          <i className="bi bi-whatsapp text-sm" />
          <span>Enviar diretamente (Cloud WhatsApp)</span>
          <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded bg-amber-200 text-[#3b1900] border border-amber-400">
            BETA
          </span>
        </button>
      </div>
    </footer>
  );
};
