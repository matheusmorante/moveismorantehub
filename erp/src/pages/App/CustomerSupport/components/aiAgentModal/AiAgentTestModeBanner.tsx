import React, { memo } from 'react';

export const AiAgentTestModeBanner: React.FC = memo(() => (
  <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/25 dark:bg-amber-500/5 dark:border-amber-500/30">
    <div className="flex items-start gap-3">
      <i className="bi bi-shield-lock-fill text-amber-600 dark:text-amber-400 text-xl shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
        <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
          Modo de Testes Restrito (Obrigatório nesta fase)
        </p>
        <p className="leading-relaxed">
          Para segurança operacional, o assistente responde <strong>exclusivamente</strong> aos números cadastrados abaixo.
          Contatos não autorizados nunca receberão respostas da IA e aguardarão atendimento humano regular.
        </p>
      </div>
    </div>

    {/* Opção Bloqueada: Atendimento Geral */}
    <div className="mt-3.5 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 opacity-60 cursor-not-allowed">
      <div className="flex items-center gap-2">
        <i className="bi bi-lock-fill text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span>Atendimento Geral para Todos os Contatos (Produção Ampla)</span>
      </div>
      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
        Bloqueado na fase de testes
      </span>
    </div>
  </div>
));

AiAgentTestModeBanner.displayName = 'AiAgentTestModeBanner';
