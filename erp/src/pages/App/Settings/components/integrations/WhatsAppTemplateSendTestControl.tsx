import React from 'react';

interface WhatsAppTemplateSendTestControlProps {
  testPhone: string;
  isTesting: boolean;
  disabled: boolean;
  onPhoneChange: (phone: string) => void;
  onSend: () => void;
}

export function WhatsAppTemplateSendTestControl({
  testPhone,
  isTesting,
  disabled,
  onPhoneChange,
  onSend,
}: WhatsAppTemplateSendTestControlProps) {
  return (
    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
          <i className="bi bi-send-check text-base" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
            Testar Modelo de Mensagem
          </p>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
            Envie um teste para o seu número para confirmar que o template está aprovado e ativo no Meta.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input
          type="text"
          value={testPhone}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="DDD + Número (ex: 41999999999)"
          className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs outline-none w-full sm:w-56 dark:text-slate-200 font-medium"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onSend()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
        >
          {isTesting ? 'Enviando...' : 'Testar Envio'}
        </button>
      </div>
    </div>
  );
}
