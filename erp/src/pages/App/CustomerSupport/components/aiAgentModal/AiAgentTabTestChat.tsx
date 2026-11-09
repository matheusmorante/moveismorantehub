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
  isAdministrator: boolean;
}

export type { TestChatMessage };

export const AiAgentTabTestChat: React.FC<AiAgentTabTestChatProps> = memo(({
  rules,
  knowledgeBase,
  workflows,
  enabledTools = [],
  systemPrompt,
}) => {
  const {
    messages,
    inputText,
    setInputText,
    isGenerating,
    selectedDiagnostic,
    setSelectedDiagnostic,
    feedbackInputId,
    feedbackComment,
    setFeedbackComment,
    chatContainerRef,
    inputRef,
    handleSendMessage,
    handleNewConversation,
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
    <div className="flex flex-col h-[68vh] min-h-[500px] bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
      {/* Barra Superior do Chat */}
      <TestChatHeader
        onSaveTestCase={handleSaveTestCase}
        onNewConversation={handleNewConversation}
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
