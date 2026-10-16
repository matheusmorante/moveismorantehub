import React from 'react';

export const EmptyChatState: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/60 dark:bg-slate-950/60 text-center select-none">
      <div className="max-w-md flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center text-4xl shadow-inner mb-4">
          <i className="bi bi-chat-dots-fill"></i>
        </div>

        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
          Central de Atendimento MoranteHub
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          Selecione uma conversa na barra lateral para visualizar o histórico de mensagens,
          dados cadastrais do cliente e pedidos vinculados no ERP.
        </p>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-left flex items-start gap-3">
          <i className="bi bi-shield-lock-fill text-emerald-600 dark:text-emerald-400 text-lg mt-0.5 shrink-0"></i>
          <div>
            <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
              Modo de Visualização Gratuita Ativo
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
              Recebimento e armazenamento operando em tempo real através da WhatsApp Cloud API oficial
              da Meta, com proteção estrita para não gerar cobranças adicionais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
