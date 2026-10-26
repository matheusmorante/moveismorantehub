import React from 'react';

interface UsageConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  enableDevelopmentTestMode?: boolean;
}

export const UsageConsumptionModal: React.FC<UsageConsumptionModalProps> = ({ isOpen, onClose, enableDevelopmentTestMode = false }) => {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="support-policy-title" className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg"><i className="bi bi-shield-lock-fill" /></div>
            <div>
              <h3 id="support-policy-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">Política de envio da Central</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Decisão operacional da empresa</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg text-sm" /></button>
        </div>

        <div className="my-5 rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-amber-950 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <i className="bi bi-lock-fill mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <strong className="block text-xs font-bold">
                Envio controlado por permissão e janela de atendimento
              </strong>
              <p className="mt-1 text-[11px] leading-relaxed">
                {enableDevelopmentTestMode
                  ? 'O compositor segue as mesmas validações do ambiente de produção: perfil autorizado, conversa aberta, canal configurado e janela de 24 horas. A mensagem só é enviada após a confirmação explícita do atendente.'
                  : 'Somente perfis autorizados podem enviar mensagens em conversas abertas, pelo canal conectado e durante a janela de 24 horas. O servidor revalida essas condições antes de chamar a Meta; a Central não envia mensagens automaticamente.'}
              </p>
            </div>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Mensagens fora da janela de 24 horas e modelos aprovados ainda não estão disponíveis neste compositor.</p>
        <button type="button" onClick={onClose} className="mt-5 w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs">Entendi</button>
      </div>
    </div>
  );
};
