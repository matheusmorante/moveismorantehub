import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Bot } from 'lucide-react-native';
import { FinancialCategory } from '../../../services/mobileFinanceService';
import { AssistantEmptyState } from './AssistantEmptyState';
import { ChatHeaderToolBar } from './chat/ChatHeaderToolBar';
import { ChatMessageItem } from './chat/ChatMessageItem';
import { FinancialTimelineCard } from './chat/FinancialTimelineCard';
import { FinancialChatInputBar } from './chat/FinancialChatInputBar';
import { GeminiLiveOrb } from './chat/GeminiLiveOrb';
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

  const activeMessages = chat.messages.filter((m) => !m.status || m.status === 'ACTIVE');

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Barra de Ferramentas com Botão Limpar Chat */}
      {chat.messages.length > 0 && (
        <ChatHeaderToolBar onClearChat={chat.handleClearChat} isDarkMode={isDarkMode} />
      )}

      <ScrollView
        ref={chat.scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={
          activeMessages.length === 0
            ? { flexGrow: 1, justifyContent: 'center' }
            : { paddingVertical: 12 }
        }
        showsVerticalScrollIndicator={false}
      >
        {activeMessages.length === 0 ? (
          <AssistantEmptyState isDarkMode={isDarkMode} />
        ) : (
          activeMessages.map((msg) => (
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
                .filter((card) => card.afterMessageId === msg.id)
                .map((card) => (
                  <FinancialTimelineCard
                    key={card.id}
                    entry={card}
                    active={!chat.registering && !chat.loading && !chat.mediaBusy && !chat.utilityBusy && (
                      card.cardState === 'NEEDS_INPUT' || card.cardState === 'READY_TO_CONFIRM' ||
                      card.cardState === 'SAVING' ||
                      card.cardState === 'ERROR'
                    )}
                    categories={categories}
                    isDarkMode={isDarkMode}
                    onConfirm={(intent) => void chat.handleConfirmTimelineCard(card.id, intent)}
                    onSelectCandidate={(candidate) => { void chat.handleSelectTimelineCandidate(card.id, candidate); }}
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
      {chat.mediaError ? <Text accessibilityRole="alert" style={{ color: isDarkMode ? '#fca5a5' : '#b91c1c', padding: 12 }}>{chat.mediaError}</Text> : null}
      {chat.mediaBusy ? <View style={{ padding: 12, flexDirection: 'row', gap: 8 }}><ActivityIndicator size="small" /><Text style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Aguardando confirmação do controle de voz...</Text></View> : null}
      {chat.utilityBusy ? <View style={{ padding: 12, flexDirection: 'row', gap: 8 }}><ActivityIndicator size="small" /><Text style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Atualizando a conversa...</Text></View> : null}

      {/* Barra de entrada com Voice Mode e envio de mensagem */}
      <FinancialChatInputBar
        inputText={chat.inputText}
        loading={chat.loading || chat.registering || chat.mediaBusy || chat.utilityBusy}
        isDarkMode={isDarkMode}
        onChangeInputText={chat.setInputText}
        onSendMessage={chat.handleSendMessage}
        onStartLive={chat.handleStartLive}
      />
      {chat.liveState && (
        <GeminiLiveOrb
          active
          paused={chat.liveState === 'paused'}
          muted={chat.liveState === 'muted'}
          remainingMs={chat.liveQuota?.remainingMs ?? 30 * 60 * 1000}
          busy={chat.mediaBusy || chat.liveState === 'connecting'}
          onPause={chat.handleToggleLivePause}
          onMute={chat.handleToggleLiveMute}
          onEnd={chat.handleEndLive}
        />
      )}
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
