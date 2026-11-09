import React from 'react';
import type { AiSituationRule } from '../../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { RuleKeywordsEditor } from './RuleKeywordsEditor';
import { RuleMandatoryPhrasesEditor } from './RuleMandatoryPhrasesEditor';

interface RuleCardProps {
  rule: AiSituationRule;
  isExpanded: boolean;
  isAdministrator: boolean;
  onToggleExpand: () => void;
  onToggleRule: () => void;
  onAddKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
  onAddMandatoryPhrase: (phrase: string) => void;
  onRemoveMandatoryPhrase: (index: number) => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  isExpanded,
  isAdministrator,
  onToggleExpand,
  onToggleRule,
  onAddKeyword,
  onRemoveKeyword,
  onAddMandatoryPhrase,
  onRemoveMandatoryPhrase,
}) => {
  return (
    <div
      className={`rounded-2xl border transition-all ${
        rule.enabled
          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-2xs'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-70'
      }`}
    >
      {/* Barra do item */}
      <div
        onClick={onToggleExpand}
        className="p-3.5 flex items-center justify-between cursor-pointer select-none gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${
              rule.action === 'handoff_human'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400'
                : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400'
            }`}
          >
            <i
              className={`bi ${rule.action === 'handoff_human' ? 'bi-person-badge' : 'bi-chat-dots-fill'}`}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {rule.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {rule.situationKey}
              </span>
              {rule.action === 'handoff_human' && (
                <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Transferência Humana
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {rule.description || `${(rule.triggerKeywords || []).length} palavras-chave configuradas`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRule();
            }}
            disabled={!isAdministrator}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer ${
              rule.enabled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
            }`}
          >
            {rule.enabled ? 'Ativa' : 'Inativa'}
          </button>
          <i
            className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-xs text-slate-400 transition-transform`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Corpo expandido */}
      {isExpanded && (
        <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
          <RuleKeywordsEditor
            keywords={rule.triggerKeywords || []}
            isAdministrator={isAdministrator}
            onAddKeyword={onAddKeyword}
            onRemoveKeyword={onRemoveKeyword}
          />

          <RuleMandatoryPhrasesEditor
            phrases={rule.mandatoryPhrases || []}
            isAdministrator={isAdministrator}
            onAddPhrase={onAddMandatoryPhrase}
            onRemovePhrase={onRemoveMandatoryPhrase}
          />
        </div>
      )}
    </div>
  );
};
