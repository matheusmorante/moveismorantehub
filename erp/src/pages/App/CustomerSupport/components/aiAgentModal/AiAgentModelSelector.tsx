import React, { memo } from 'react';
import { Controller, type Control } from 'react-hook-form';
import type { WhatsAppAiAgentFormData } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

export interface AiAgentModelSelectorProps {
  control: Control<WhatsAppAiAgentFormData>;
  isAdministrator: boolean;
}

export const AiAgentModelSelector: React.FC<AiAgentModelSelectorProps> = memo(({
  control,
  isAdministrator,
}) => (
  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-4 shadow-2xs">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
          <i className="bi bi-cpu text-sm" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Motor de Inteligência Artificial (Modelo)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escolha o modelo de IA que processará as conversas e consultas do Seu Lizandro
          </p>
        </div>
      </div>
      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
        Modelo ativo
      </span>
    </div>

    <Controller
      name="model"
      control={control}
      render={({ field }) => (
        <div className="grid grid-cols-1 gap-3">
          {/* Modelo único do atendimento: GPT-6 Luna */}
          <label
            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
              field.value === 'gpt-6-luna'
                ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ai_model"
                  value="gpt-6-luna"
                  checked={field.value === 'gpt-6-luna'}
                  onChange={() => field.onChange('gpt-6-luna')}
                  disabled={!isAdministrator}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  OpenAI GPT-6 Luna
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-purple-200/80 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                gpt-6-luna
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Modelo padrão para conversas, consultas e uso das ferramentas autorizadas do ERP.
            </p>
            <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <i className="bi bi-shield-lock-fill" aria-hidden="true" />
              <span>Chave OPENAI_API_KEY no servidor Vercel</span>
            </div>
          </label>

        </div>
      )}
    />

    {/* Estado de integração */}
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
      <i className="bi bi-shield-check text-indigo-600 dark:text-indigo-400 text-sm shrink-0 mt-0.5" />
      <div className="space-y-0.5 leading-relaxed text-[11px]">
        <strong className="text-slate-900 dark:text-slate-100 font-semibold block">
          Integração segura
        </strong>
        As chamadas são processadas no servidor com <code>OPENAI_API_KEY</code>. Em caso de indisponibilidade, o sistema preserva os limites e apresenta a falha para tratamento pelo operador.
      </div>
    </div>
  </div>
));

AiAgentModelSelector.displayName = 'AiAgentModelSelector';
