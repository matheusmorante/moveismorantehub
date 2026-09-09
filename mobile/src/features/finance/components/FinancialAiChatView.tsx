import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Bot } from 'lucide-react-native';
import { FinancialCategory } from '../../../services/mobileFinanceService';
import { AssistantEmptyState } from './AssistantEmptyState';
import { ChatHeaderToolBar } from './chat/ChatHeaderToolBar';
import { ChatMessageItem } from './chat/ChatMessageItem';
import { FinancialTimelineCard } from './chat/FinancialTimelineCard';
import { RecordingStatusBar } from './chat/RecordingStatusBar';
import { FinancialChatInputBar } from './chat/FinancialChatInputBar';
import { useFinancialAiChat } from '../hooks/useFinancialAiChat';

interface Props {
  categories: FinancialCategory[];
  onTransactionRegistered: () => void;
  userName?: string;
  isDarkMode?: boolean;
}

export const FinancialAiChatView: React.FC<Props> = ({
  categories,
  onTransactionRegistered,
  userName = 'Operador',
  isDarkMode = false,
}) => {
  const chat = useFinancialAiChat({
    categories,
    onTransactionRegistered,
    userName,
  });

  const activeMessages = chat.messages.filter(m => !m.status || m.status === 'ACTIVE');

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Barra de Ferramentas com Botão Limpar Chat */}
      {chat.messages.length > 0 && (
        <ChatHeaderToolBar onClearChat={chat.handleClearChat} isDarkMode={isDarkMode} />
      )}

      <ScrollView
        ref={chat.scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={activeMessages.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {activeMessages.length === 0 ? (
          <AssistantEmptyState isDarkMode={isDarkMode} />
        ) : (
          activeMessages.map(msg => (
            <React.Fragment key={msg.id}>
              <ChatMessageItem
                msg={msg}
                editingMessageId={chat.editingMessageId}
                editText={chat.editText}
                copiedMessageId={chat.copiedMessageId}
                setEditText={chat.setEditText}
                onCopyMessage={chat.handleCopyMessage}
                onStartEditMessage={chat.handleStartEditMessage}
                onCancelEdit={chat.handleCancelEdit}
                onSaveAndResend={chat.handleSaveAndResend}
                isDarkMode={isDarkMode}
              />
              {chat.timelineCards
                .filter(card => card.afterMessageId === msg.id && card.cardState !== 'NEEDS_INPUT')
                .map(card => (
                  <FinancialTimelineCard
                    key={card.id}
                    entry={card}
                    active={card.cardState === 'READY_TO_CONFIRM' || card.cardState === 'SAVING' || card.cardState === 'ERROR'}
                    categories={categories}
                    isDarkMode={isDarkMode}
                    onConfirm={intent => void chat.handleConfirmTimelineCard(card.id, intent)}
                    onSelectCandidate={chat.handleSelectCandidate}
                  />
                ))}
            </React.Fragment>
          ))
        )}

        {chat.loading ? (
          <View style={[styles.messageRow, styles.assistantRow]}>
            <View style={styles.avatarBot}>
              <Bot size={14} color="#7c3aed" />
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator color="#7c3aed" size="small" />
            </View>
          </View>
        ) : null}
      </ScrollView>


      {/* Indicador de Status Discreto da Sessão de Voz */}
      <RecordingStatusBar
        voiceState={chat.voiceState}
        livePill={chat.livePill}
        activeDraft={chat.activeDraft}
        isDarkMode={isDarkMode}
      />

      {/* Barra de Entrada de Texto e Controles da Sessão de Voz */}
      <FinancialChatInputBar
        inputText={chat.inputText}
        isRecordingActive={chat.isRecordingActive}
        loading={chat.loading}
        isDarkMode={isDarkMode}
        onChangeInputText={chat.setInputText}
        onStartVoice={chat.handleStartVoice}
        onStopVoice={chat.handleStopVoice}
        onCancelVoice={chat.handleCancelVoice}
        onSendMessage={chat.handleSendMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarBot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
});
