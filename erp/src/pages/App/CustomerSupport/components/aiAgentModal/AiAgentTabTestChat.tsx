import React, { memo, useMemo, useState } from 'react';
import type {
  AiSituationRule,
  AiKnowledgeArticle,
  AiWorkflowConfig,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import type { WhatsAppMessage } from '../../types';
import { useInteractiveCatalogProductCards } from '../../hooks/useInteractiveCatalogProductCards';
import { AiAgentMessageDiagnosticDrawer } from './AiAgentMessageDiagnosticDrawer';
import { CopySelectedMessageFooter } from '../CopySelectedMessageFooter';
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
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
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
    handleEditSuggestion,
    handleAcceptSuggestion,
    handleRejectSuggestion,
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
  const selectedMessage = messages.find((message) => message.id === selectedMessageId);

  const virtualInteractiveMessages = useMemo<WhatsAppMessage[]>(() => {
    return messages
      .filter((m) => m.nativeCatalogProducts && m.nativeCatalogProducts.length > 0)
      .map((m) => ({
        id: m.id,
        conversationId: 'simulated_test_chat',
        apiMessageId: null,
        direction: 'outbound' as const,
        messageType: 'interactive' as const,
        textContent: null,
        mediaId: null,
        mediaMimeType: null,
        mediaUrl: null,
        mediaFilename: null,
        mediaCaption: null,
        replyToMessageId: null,
        replyToWamid: null,
        status: 'delivered' as const,
        errorCode: null,
        failureReason: null,
        timestamp: m.timestamp.toISOString(),
        createdAt: m.timestamp.toISOString(),
        rawPayload: {
          nativeCatalogProducts: m.nativeCatalogProducts,
          catalog_products: m.nativeCatalogProducts,
          interactive: {
            type: 'product_list',
            header: { type: 'text', text: 'Opções encontradas' },
            body: { text: '' },
            action: {
              sections: [
                {
                  title: 'Produtos',
                  product_items: (m.nativeCatalogProducts || []).map((p) => ({
                    product_retailer_id: p.retailerId,
                  })),
                },
              ],
            },
          },
        },
      }));
  }, [messages]);

  const { catalogProductCards, loadingRetailerIds } = useInteractiveCatalogProductCards(virtualInteractiveMessages);

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
            isSelected={msg.id === selectedMessageId}
            onSelectMessage={(messageId) => {
              setSelectedMessageId((current) => current === messageId ? null : messageId);
            }}
            onEditSuggestion={handleEditSuggestion}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onOpenDiagnostic={(diag) => setSelectedDiagnostic(diag)}
            onRateMessage={handleRateMessage}
            feedbackInputId={feedbackInputId}
            feedbackComment={feedbackComment}
            setFeedbackComment={setFeedbackComment}
            feedbackInputRef={feedbackInputRef}
            feedbackError={feedbackError}
            onSaveFeedbackComment={handleSaveFeedbackComment}
            catalogProductCards={catalogProductCards}
            loadingCatalogRetailerIds={loadingRetailerIds}
          />
        ))}

        {/* Indicador de Digitação da IA */}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-3 shadow-xs border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Seu Lizandro está consultando o ERP e formulando a resposta...</span>
            </div>
          </div>
        )}
      </div>

      {/* Pílulas de Sugestão de Cenários Rápidos */}
      <TestChatQuickScenarios
        isGenerating={isGenerating}
        onSelectScenario={(s) => {
          setSelectedMessageId(null);
          handleSendMessage(s);
        }}
      />

      {selectedMessage && (
        <CopySelectedMessageFooter
          messageText={selectedMessage.text}
          onCancel={() => setSelectedMessageId(null)}
        />
      )}

      {/* Campo de Digitação Fixo */}
      <TestChatInputBar
        inputRef={inputRef}
        inputText={inputText}
        setInputText={setInputText}
        error={messageError}
        isGenerating={isGenerating}
        onSendMessage={() => {
          setSelectedMessageId(null);
          handleSendMessage();
        }}
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
