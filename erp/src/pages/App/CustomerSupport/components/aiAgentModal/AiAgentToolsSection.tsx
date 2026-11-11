import React, { memo } from 'react';
import type { FieldErrors } from 'react-hook-form';
import {
  WHATSAPP_SAFE_TOOLS,
  type WhatsAppAiAgentFormData,
  type WhatsAppSafeToolDefinition,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

export interface AiAgentToolsSectionProps {
  enabledTools: string[];
  isAdministrator: boolean;
  error?: FieldErrors<WhatsAppAiAgentFormData>['enabledTools'];
  onToggleTool: (toolId: string) => void;
}

export const AiAgentToolsSection: React.FC<AiAgentToolsSectionProps> = memo(({
  enabledTools,
  isAdministrator,
  error,
  onToggleTool,
}) => (
  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
    <div className="flex items-center justify-between">
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <i className="bi bi-tools text-sm text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Ferramentas do WhatsApp Habilitadas
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Defina quais consultas o assistente pode realizar durante o atendimento.
        </p>
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {enabledTools.length} de {WHATSAPP_SAFE_TOOLS.length}
      </span>
    </div>

    {error && (
      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
        {error.message}
      </p>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {WHATSAPP_SAFE_TOOLS.map((tool: WhatsAppSafeToolDefinition) => {
        const isChecked = enabledTools.includes(tool.id);
        return (
          <label
            key={tool.id}
            className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all select-none ${
              isChecked
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-60'
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleTool(tool.id)}
              disabled={!isAdministrator}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
            />
            <div className="space-y-0.5 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {tool.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {tool.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>

    <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
      <i className="bi bi-info-circle-fill text-slate-500 shrink-0" aria-hidden="true" />
      <span>
        Preços de custo, margens de lucro, fornecedores e ferramentas financeiras/administrativas estão permanentemente bloqueadas no WhatsApp.
      </span>
    </div>
  </div>
));

AiAgentToolsSection.displayName = 'AiAgentToolsSection';
