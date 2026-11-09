import React, { memo } from 'react';
import { Control, Controller } from 'react-hook-form';
import type { WhatsAppAiAgentFormData } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

export interface AiAgentSupportModeSelectorProps {
  control: Control<WhatsAppAiAgentFormData>;
  isAdministrator: boolean;
}

export const AiAgentSupportModeSelector: React.FC<AiAgentSupportModeSelectorProps> = memo(({
  control,
  isAdministrator,
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Modo de Operação da IA
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Escolha como a inteligência artificial interage com os clientes no WhatsApp.
        </p>
      </div>
    </div>

    <Controller
      name="supportMode"
      control={control}
      render={({ field }) => (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Modo Automático */}
          <button
            type="button"
            disabled={!isAdministrator}
            onClick={() => field.onChange('automatico')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              field.value === 'automatico'
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 shadow-xs ring-1 ring-indigo-500'
                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
                  <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
                </span>
                {field.value === 'automatico' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                )}
              </div>
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Automático
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                A IA responde e envia a mensagem diretamente ao cliente pelo WhatsApp nos números autorizados.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Recomendado para Testes
              </span>
            </div>
          </button>

          {/* Modo Assistido */}
          <button
            type="button"
            disabled={!isAdministrator}
            onClick={() => field.onChange('assistido')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              field.value === 'assistido'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 shadow-xs ring-1 ring-amber-500'
                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">
                  <i className="bi bi-person-check-fill" aria-hidden="true" />
                </span>
                {field.value === 'assistido' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                )}
              </div>
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Assistido (Copiloto)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                A IA elabora a resposta como sugestão na tela. O atendente humano aprova ou edita antes do envio.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Supervisão Humana
              </span>
            </div>
          </button>

          {/* Modo Somente Humano */}
          <button
            type="button"
            disabled={!isAdministrator}
            onClick={() => field.onChange('humano')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              field.value === 'humano'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-500 dark:border-slate-500 shadow-xs ring-1 ring-slate-500'
                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold">
                  <i className="bi bi-pause-fill" aria-hidden="true" />
                </span>
                {field.value === 'humano' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600 dark:bg-slate-400"></span>
                )}
              </div>
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Pausado (Somente Humano)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                A IA fica pausada em todas as conversas. O atendimento é conduzido exclusivamente pelos atendentes.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                IA Suspensa
              </span>
            </div>
          </button>
        </div>
      )}
    />
  </div>
));

AiAgentSupportModeSelector.displayName = 'AiAgentSupportModeSelector';
