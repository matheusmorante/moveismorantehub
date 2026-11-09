import React, { memo } from 'react';
import type { Control } from 'react-hook-form';
import type { WhatsAppAiAgentFormData } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { AiAgentStatusToggle } from './AiAgentStatusToggle';
import { AiAgentSupportModeSelector } from './AiAgentSupportModeSelector';
import { AiAgentModelSelector } from './AiAgentModelSelector';
import { AiAgentTestModeBanner } from './AiAgentTestModeBanner';
import { AiAgentTestPhoneSection } from './AiAgentTestPhoneSection';

export interface AiAgentTabOverviewProps {
  control: Control<WhatsAppAiAgentFormData>;
  enabled: boolean;
  isAdministrator: boolean;
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
  phoneNumbers,
  phoneInput,
  phoneError,
  onPhoneInputChange,
  onAddPhone,
  onRemovePhone,
}) => (
  <div className="space-y-6">
    <AiAgentStatusToggle
      control={control}
      enabled={enabled}
      isAdministrator={isAdministrator}
    />

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
