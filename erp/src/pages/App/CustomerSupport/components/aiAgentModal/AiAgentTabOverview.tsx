import React, { memo } from 'react';
import type { Control } from 'react-hook-form';
import type { WhatsAppAiAgentFormData } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { AiAgentStatusNotice } from './AiAgentStatusNotice';
import { AiAgentSupportModeSelector } from './AiAgentSupportModeSelector';
import { AiAgentModelSelector } from './AiAgentModelSelector';
import { AiAgentTestModeBanner } from './AiAgentTestModeBanner';
import { AiAgentTestPhoneSection } from './AiAgentTestPhoneSection';

export interface AiAgentTabOverviewProps {
  control: Control<WhatsAppAiAgentFormData>;
  enabled: boolean;
  isAdministrator: boolean;
  isAgentStatusKnown: boolean;
  isTogglingAiAgent: boolean;
  onToggleAiAgent: () => void;
  phoneNumbers: string[];
  phoneInput: string;
  phoneError: string;
  onPhoneInputChange: (val: string) => void;
  onAddPhone: () => void;
  onRemovePhone: (index: number) => void;
}

export const AiAgentTabOverview: React.FC<AiAgentTabOverviewProps> = memo(({
  control,
  enabled,
  isAdministrator,
  isAgentStatusKnown,
  isTogglingAiAgent,
  onToggleAiAgent,
  phoneNumbers,
  phoneInput,
  phoneError,
  onPhoneInputChange,
  onAddPhone,
  onRemovePhone,
}) => (
  <div className="space-y-6">
    <AiAgentStatusNotice enabled={enabled} />

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Atendimento de clientes por IA
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          O controle vale para os números de teste cadastrados.
        </p>
      </div>
      <button
        type="button"
        aria-label={!isAdministrator
          ? 'Somente administradores podem alterar o atendimento de IA'
          : !isAgentStatusKnown
            ? 'Não foi possível confirmar o status do agente. Recarregue a página.'
            : isAgentStatusKnown && enabled
              ? 'Desligar atendimento de clientes por IA'
              : 'Ligar atendimento de clientes por IA'}
        aria-pressed={isAgentStatusKnown ? enabled : undefined}
        aria-busy={isTogglingAiAgent}
        disabled={!isAdministrator || !isAgentStatusKnown || isTogglingAiAgent}
        onClick={onToggleAiAgent}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          isAgentStatusKnown && enabled
            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        <i className={`bi ${isTogglingAiAgent ? 'bi-arrow-repeat animate-spin' : 'bi-power'}`} aria-hidden="true" />
        <span>{isTogglingAiAgent ? 'Atualizando...' : enabled ? 'Desligar atendimento' : 'Ligar atendimento'}</span>
      </button>
    </div>

    <AiAgentSupportModeSelector
      control={control}
      isAdministrator={isAdministrator}
    />

    <AiAgentModelSelector
      control={control}
      isAdministrator={isAdministrator}
    />

    <AiAgentTestModeBanner />

    <AiAgentTestPhoneSection
      phoneNumbers={phoneNumbers}
      phoneInput={phoneInput}
      phoneError={phoneError}
      isAdministrator={isAdministrator}
      onPhoneInputChange={onPhoneInputChange}
      onAddPhone={onAddPhone}
      onRemovePhone={onRemovePhone}
    />
  </div>
));

AiAgentTabOverview.displayName = 'AiAgentTabOverview';
