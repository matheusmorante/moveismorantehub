import React, { memo } from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';
import type { WhatsAppAiAgentFormData } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

export interface AiAgentPromptSectionProps {
  register: UseFormRegister<WhatsAppAiAgentFormData>;
  watchedPrompt: string;
  isAdministrator: boolean;
  error?: FieldError;
  onRestoreDefault: () => void;
}

export const AiAgentPromptSection: React.FC<AiAgentPromptSectionProps> = memo(({
  register,
  watchedPrompt,
  isAdministrator,
  error,
  onRestoreDefault,
}) => (
  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
    <div className="flex items-center justify-between">
      <div>
        <label
          htmlFor="system-prompt"
          className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5"
        >
          <i className="bi bi-chat-text text-sm text-purple-600 dark:text-purple-400" aria-hidden="true" />
          Instruções do Agente (System Prompt)
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tom de voz, políticas de atendimento, informações da loja e regras de encaminhamento.
        </p>
      </div>
      <button
        type="button"
        onClick={onRestoreDefault}
        disabled={!isAdministrator}
        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
      >
        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
        Restaurar Padrão
      </button>
    </div>

    <div className="relative">
      <textarea
        id="system-prompt"
        rows={8}
        {...register('systemPrompt')}
        disabled={!isAdministrator}
        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all leading-relaxed resize-y disabled:opacity-60"
      />
      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
        {error ? (
          <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            {error.message}
          </span>
        ) : (
          <span>Formato texto em Português</span>
        )}
        <span className={watchedPrompt.length > 9500 ? 'text-amber-600 font-bold' : ''}>
          {watchedPrompt.length} / 10.000 caracteres
        </span>
      </div>
    </div>
  </div>
));

AiAgentPromptSection.displayName = 'AiAgentPromptSection';
