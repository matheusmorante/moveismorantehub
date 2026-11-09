import React, { memo } from 'react';
import { Control, Controller } from 'react-hook-form';
import type { WhatsAppAiAgentFormData } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

export interface AiAgentStatusToggleProps {
  control: Control<WhatsAppAiAgentFormData>;
  enabled: boolean;
  isAdministrator: boolean;
}

export const AiAgentStatusToggle: React.FC<AiAgentStatusToggleProps> = memo(({
  control,
  enabled,
  isAdministrator,
}) => (
  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80">
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Status do Atendimento por IA
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              enabled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {enabled ? 'Ativado' : 'Desativado'}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {enabled
            ? 'O assistente responderá automaticamente às mensagens recebidas nos números autorizados.'
            : 'Nenhuma resposta automática será gerada ou enviada pelo WhatsApp.'}
        </p>
      </div>

      <Controller
        name="enabled"
        control={control}
        render={({ field }) => (
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              disabled={!isAdministrator}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50"></div>
          </label>
        )}
      />
    </div>
  </div>
));

AiAgentStatusToggle.displayName = 'AiAgentStatusToggle';
