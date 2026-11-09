import React, { memo, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type {
  WhatsAppAiAgentFormData,
  AiSituationRule,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { RuleCard } from './rules';

export interface AiAgentTabRulesProps {
  rules: AiSituationRule[];
  setValue: UseFormSetValue<WhatsAppAiAgentFormData>;
  isAdministrator: boolean;
}

export const AiAgentTabRules: React.FC<AiAgentTabRulesProps> = memo(({
  rules,
  setValue,
  isAdministrator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(rules[0]?.id || null);

  const filteredRules = rules.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.situationKey.toLowerCase().includes(term) ||
      (r.triggerKeywords || []).some((kw) => kw.toLowerCase().includes(term))
    );
  });

  const handleToggleRule = (ruleId: string) => {
    if (!isAdministrator) return;
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    setValue('situationRules', updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddKeyword = (ruleId: string, val: string) => {
    const updated = rules.map((r) => {
      if (r.id === ruleId) {
        const existing = r.triggerKeywords || [];
        if (!existing.includes(val)) {
          return { ...r, triggerKeywords: [...existing, val] };
        }
      }
      return r;
    });
    setValue('situationRules', updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveKeyword = (ruleId: string, kwToRemove: string) => {
    if (!isAdministrator) return;
    const updated = rules.map((r) => {
      if (r.id === ruleId) {
        return {
          ...r,
          triggerKeywords: (r.triggerKeywords || []).filter((k) => k !== kwToRemove),
        };
      }
      return r;
    });
    setValue('situationRules', updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddMandatoryPhrase = (ruleId: string, val: string) => {
    const updated = rules.map((r) => {
      if (r.id === ruleId) {
        const existing = r.mandatoryPhrases || [];
        return { ...r, mandatoryPhrases: [...existing, val] };
      }
      return r;
    });
    setValue('situationRules', updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveMandatoryPhrase = (ruleId: string, phraseIdx: number) => {
    if (!isAdministrator) return;
    const updated = rules.map((r) => {
      if (r.id === ruleId) {
        return {
          ...r,
          mandatoryPhrases: (r.mandatoryPhrases || []).filter((_, idx) => idx !== phraseIdx),
        };
      }
      return r;
    });
    setValue('situationRules', updated, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      {/* Header com busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Regras de Atendimento e Frases por Situação
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            O motor de regras identifica a intenção do cliente e aplica frases obrigatórias de forma determinística.
          </p>
        </div>
        <div className="relative min-w-[220px]">
          <i
            className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Buscar por situação ou palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Lista de regras de situações */}
      <div className="space-y-3">
        {filteredRules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            isExpanded={expandedRuleId === rule.id}
            isAdministrator={isAdministrator}
            onToggleExpand={() => setExpandedRuleId((prev) => (prev === rule.id ? null : rule.id))}
            onToggleRule={() => handleToggleRule(rule.id)}
            onAddKeyword={(kw) => handleAddKeyword(rule.id, kw)}
            onRemoveKeyword={(kw) => handleRemoveKeyword(rule.id, kw)}
            onAddMandatoryPhrase={(ph) => handleAddMandatoryPhrase(rule.id, ph)}
            onRemoveMandatoryPhrase={(idx) => handleRemoveMandatoryPhrase(rule.id, idx)}
          />
        ))}
      </div>
    </div>
  );
});

AiAgentTabRules.displayName = 'AiAgentTabRules';
