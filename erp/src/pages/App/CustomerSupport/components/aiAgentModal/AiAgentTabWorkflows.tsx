import React, { memo } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type {
  WhatsAppAiAgentFormData,
  AiWorkflowConfig,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

export interface AiAgentTabWorkflowsProps {
  workflows: AiWorkflowConfig[];
  setValue: UseFormSetValue<WhatsAppAiAgentFormData>;
  isAdministrator: boolean;
}

export const AiAgentTabWorkflows: React.FC<AiAgentTabWorkflowsProps> = memo(({
  workflows,
  setValue,
  isAdministrator,
}) => {
  const handleToggleWorkflow = (wfId: string) => {
    if (!isAdministrator) return;
    const updated = workflows.map((w) => (w.id === wfId ? { ...w, enabled: !w.enabled } : w));
    setValue('workflows', updated, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Fluxos Guiados de Atendimento
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sequências estruturadas de passos para orientar a conduta do assistente conforme a jornada do cliente.
        </p>
      </div>

      <div className="space-y-4">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className={`p-4 rounded-2xl border transition-all ${
              wf.enabled
                ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
                  <i className="bi bi-signpost-split" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {wf.name}
                    </h5>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {wf.workflowKey}
                    </span>
                    {wf.handoffTrigger && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Aciona Humano
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {wf.description}
                  </p>
                </div>
              </div>

              {isAdministrator && (
                <button
                  type="button"
                  onClick={() => handleToggleWorkflow(wf.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer shrink-0 ${
                    wf.enabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                >
                  {wf.enabled ? 'Ativo' : 'Pausado'}
                </button>
              )}
            </div>

            {/* Etapas do fluxo */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Etapas Executadas pelo Assistente
              </span>
              <div className="space-y-1.5">
                {(wf.steps || []).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

AiAgentTabWorkflows.displayName = 'AiAgentTabWorkflows';
