import React, { memo } from 'react';
import type {
  AiSituationRule,
  AiKnowledgeArticle,
  AiWorkflowConfig,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { AiAgentMessageDiagnosticDrawer } from './AiAgentMessageDiagnosticDrawer';
import {
  TestChatHeader,
  TestChatMessageBubble,
  TestChatQuickScenarios,
  TestChatInputBar,
  useAiAgentTestChat,
  type TestChatMessage,
} from './testChat';

export interface AiAgentTabTestChatProps {
  rules: AiSituationRule[];
  knowledgeBase: AiKnowledgeArticle[];
  workflows: AiWorkflowConfig[];
  enabledTools?: string[];
  systemPrompt?: string;
  supportMode: 'automatico' | 'assistido' | 'humano';
  isAiAgentEnabled: boolean;
  isAgentStatusKnown: boolean;
  onOpenSettings: () => void;
  onBack: () => void;
}

export type { TestChatMessage };

export const AiAgentTabTestChat: React.FC<AiAgentTabTestChatProps> = memo(({
  rules,
  knowledgeBase,
  workflows,
  enabledTools = [],
  systemPrompt,
  supportMode,
  isAiAgentEnabled,
  isAgentStatusKnown,
  onOpenSettings,
  onBack,
}) => {
  const {
    messages,
    inputText,
    setInputText,
    messageError,
    isGenerating,
    selectedDiagnostic,
    setSelectedDiagnostic,
    feedbackInputId,
    feedbackComment,
    setFeedbackComment,
    feedbackInputRef,
    feedbackError,
    chatContainerRef,
    inputRef,
    handleSendMessage,
    handleRateMessage,
    handleSaveFeedbackComment,
    handleSaveTestCase,
  } = useAiAgentTestChat({
    rules,
    knowledgeBase,
    workflows,
    enabledTools,
    systemPrompt,
  });

  return (
    <div className="flex flex-col w-full h-full min-h-0 min-w-0 bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
      {/* Barra Superior do Chat */}
      <TestChatHeader
        onSaveTestCase={handleSaveTestCase}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
        supportMode={supportMode}
        isAiAgentEnabled={isAiAgentEnabled}
        isAgentStatusKnown={isAgentStatusKnown}
      />

      {/* Área Rolável de Mensagens (Visual WhatsApp) */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#efeae2]/40 dark:bg-[#0b141a]/60"
      >
        {messages.map((msg) => (
          <TestChatMessageBubble
            key={msg.id}
            message={msg}
            onOpenDiagnostic={(diag) => setSelectedDiagnostic(diag)}
            onRateMessage={handleRateMessage}
            feedbackInputId={feedbackInputId}
            feedbackComment={feedbackComment}
            setFeedbackComment={setFeedbackComment}
            feedbackInputRef={feedbackInputRef}
            feedbackError={feedbackError}
            onSaveFeedbackComment={handleSaveFeedbackComment}
          />
        ))}

        {/* Indicador de Digitação da IA */}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-3 shadow-xs border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Lizandro está consultando o ERP e formulando a resposta...</span>
            </div>
          </div>
        )}
      </div>

      {/* Pílulas de Sugestão de Cenários Rápidos */}
      <TestChatQuickScenarios
        isGenerating={isGenerating}
        onSelectScenario={(s) => handleSendMessage(s)}
      />

      {/* Campo de Digitação Fixo */}
      <TestChatInputBar
        inputRef={inputRef}
        inputText={inputText}
        setInputText={setInputText}
        error={messageError}
        isGenerating={isGenerating}
        onSendMessage={() => handleSendMessage()}
      />

      {/* Painel Lateral / Drawer de Diagnóstico Detalhado */}
      <AiAgentMessageDiagnosticDrawer
        diagnostic={selectedDiagnostic}
        onClose={() => setSelectedDiagnostic(null)}
      />
    </div>
  );
});

AiAgentTabTestChat.displayName = 'AiAgentTabTestChat';
