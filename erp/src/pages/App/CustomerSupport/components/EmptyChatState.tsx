import React from 'react';

export const EmptyChatState: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f0f2f5]/80 dark:bg-[#111b21] text-center select-none relative overflow-hidden transition-colors">
      {/* Padrão decorativo de fundo sutil estilo WhatsApp Web */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none bg-[radial-gradient(#25d366_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-lg flex flex-col items-center relative z-10">
        {/* Ilustração Vetorial SVG Própria — Central de Mensagens WhatsApp Web */}
        <div className="mb-6 relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500/10 via-emerald-500/20 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <svg
              className="w-14 h-14 text-emerald-600 dark:text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              <path d="M9 10h.01M12 10h.01M15 10h.01" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
            <i className="bi bi-shield-check text-xs"></i>
          </div>
        </div>

        {/* Título & Subtítulo */}
        <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2">
          Central de Atendimento MoranteHub
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
          Visualize mensagens recebidas pela WhatsApp Cloud API oficial da loja, com identificação
          imediata de contatos e pedidos de venda do ERP.
        </p>

        {/* Três Indicadores Compactos de Funcionalidades */}
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
              <i className="bi bi-chat-dots-fill text-sm"></i>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              Conversas
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Tempo real</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
              <i className="bi bi-person-check-fill text-sm"></i>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              Clientes
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Identificados</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5">
              <i className="bi bi-bag-check-fill text-sm"></i>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              Pedidos
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Vinculados</span>
          </div>
        </div>

        {/* Nota Discreta de Modo Visualização e Custo Zero */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-300/40 dark:border-slate-700/40">
          <i className="bi bi-lock-fill text-amber-500 text-xs"></i>
          <span>Modo de visualização gratuito ativo • Envio de saída desativado</span>
        </div>
      </div>
    </div>
  );
};
