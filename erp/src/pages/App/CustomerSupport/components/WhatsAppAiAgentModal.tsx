import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  AiAgentModalHeader,
  AiAgentModalTabs,
  type AiAgentTabKey,
  AiAgentTabOverview,
  AiAgentTabRules,
  AiAgentTabKnowledge,
  AiAgentTabWorkflows,
  AiAgentToolsSection,
  AiAgentPromptSection,
  AiAgentTabQuotas,
  AiAgentTabTestChat,
  AiAgentModalFooter,
} from './aiAgentModal';
import { useWhatsAppAiAgentForm } from './aiAgentModal/useWhatsAppAiAgentForm';

export interface WhatsAppAiAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppAiAgentModal: React.FC<WhatsAppAiAgentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isAdministrator } = useAuth();
  const [activeTab, setActiveTab] = useState<AiAgentTabKey>('visao_geral');

  const {
    register,
    control,
    setValue,
    errors,
    isSaving,
    phoneInput,
    phoneError,
    setPhoneInput,
    setPhoneError,
    watchedEnabled,
    watchedNumbers,
    watchedPrompt,
    watchedTools,
    watchedKnowledge,
    watchedRules,
    watchedWorkflows,
    handleAddPhone,
    handleRemovePhone,
    handleToggleTool,
    handleRestoreDefaultPrompt,
    submitForm,
  } = useWhatsAppAiAgentForm({
    isOpen,
    isAdministrator,
    onClose,
  });

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('visao_geral');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-agent-modal-title"
      className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-slide-up"
      >
        <AiAgentModalHeader onClose={onClose} />

        <AiAgentModalTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          knowledgeCount={watchedKnowledge.filter((k) => k.active !== false).length}
          rulesCount={watchedRules.filter((r) => r.enabled !== false).length}
        />

        <form
          id="whatsapp-ai-agent-form"
          onSubmit={submitForm}
          className="flex-1 overflow-y-auto p-4 sm:p-6"
        >
          {activeTab === 'visao_geral' && (
            <AiAgentTabOverview
              control={control}
              enabled={watchedEnabled}
              isAdministrator={isAdministrator}
              phoneNumbers={watchedNumbers}
              phoneInput={phoneInput}
              phoneError={phoneError}
              onPhoneInputChange={(val) => {
                setPhoneInput(val);
                if (phoneError) setPhoneError('');
              }}
              onAddPhone={handleAddPhone}
              onRemovePhone={handleRemovePhone}
            />
          )}

          {activeTab === 'regras_situacoes' && (
            <AiAgentTabRules
              rules={watchedRules}
              setValue={setValue}
              isAdministrator={isAdministrator}
            />
          )}

          {activeTab === 'base_conhecimento' && (
            <AiAgentTabKnowledge
              articles={watchedKnowledge}
              setValue={setValue}
              isAdministrator={isAdministrator}
            />
          )}

          {activeTab === 'fluxos' && (
            <AiAgentTabWorkflows
              workflows={watchedWorkflows}
              setValue={setValue}
              isAdministrator={isAdministrator}
            />
          )}

          {activeTab === 'ferramentas' && (
            <AiAgentToolsSection
              enabledTools={watchedTools}
              isAdministrator={isAdministrator}
              error={errors.enabledTools}
              onToggleTool={handleToggleTool}
            />
          )}

          {activeTab === 'limites_cotas' && (
            <AiAgentTabQuotas isAdministrator={isAdministrator} />
          )}

          {activeTab === 'prompt' && (
            <AiAgentPromptSection
              register={register}
              watchedPrompt={watchedPrompt}
              isAdministrator={isAdministrator}
              error={errors.systemPrompt}
              onRestoreDefault={handleRestoreDefaultPrompt}
            />
          )}

          {activeTab === 'chat_testes' && (
            <AiAgentTabTestChat
              rules={watchedRules}
              knowledgeBase={watchedKnowledge}
              workflows={watchedWorkflows}
              enabledTools={watchedTools}
              systemPrompt={watchedPrompt}
              isAdministrator={isAdministrator}
            />
          )}
        </form>

        <AiAgentModalFooter
          isSaving={isSaving}
          isAdministrator={isAdministrator}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
