import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Send, Mic, Bot, MicOff, Square } from 'lucide-react-native';
import { FinancialCategory, createFinancialTransaction, payPayableAccount, confirmFinancialDraft } from '../../../services/mobileFinanceService';
import {
  ChatMessage,
  ParsedFinancialIntent,
  parseFinancialIntentWithGemini,
  extractLocalSemanticDelta,
  hasSignificantSemanticChange,
  parseIncrementalDraftDelta,
  LocalSemanticDelta,
} from '../../../services/financialAiAssistantService';
import { VoiceSessionState } from '../types/VoiceSessionState';
import { AssistantEmptyState } from './AssistantEmptyState';
import { TransactionPreviewCard, CardVisualState } from './TransactionPreviewCard';
import { TransactionEditModal } from './TransactionEditModal';
import { ChatHeaderToolBar } from './chat/ChatHeaderToolBar';
import { ChatMessageItem } from './chat/ChatMessageItem';
import { RecordingStatusBar } from './chat/RecordingStatusBar';
import { startVoiceRecording, stopVoiceRecording } from '../../../services/voiceRecorderService';

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
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<ParsedFinancialIntent | null>(null);
  const [activeDraft, setActiveDraft] = useState<ParsedFinancialIntent | null>(null);
  const [registering, setRegistering] = useState(false);
  const [cardVisualState, setCardVisualState] = useState<CardVisualState>('READY_TO_CONFIRM');
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Estados de Edição e Cópia de Mensagens
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Estados da Sessão de Voz (Máquina de Estados Explícita)
  const [voiceState, setVoiceState] = useState<VoiceSessionState>('IDLE');
  const [livePill, setLivePill] = useState<LocalSemanticDelta | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const baseInputTextRef = useRef('');
  const speechSessionTextRef = useRef('');
  const lastProcessedTextRef = useRef('');
  const debounceTimerRef = useRef<any>(null);
  const activeDraftRef = useRef<ParsedFinancialIntent | null>(null);

  const voiceSessionIdRef = useRef<number>(0);
  const analysisRevisionRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  activeDraftRef.current = activeDraft;

  React.useEffect(() => {
    return () => {
      stopVoiceRecording();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isRecordingActive = voiceState === 'LISTENING' || voiceState === 'PRE_ANALYZING';

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleClearChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    setPendingIntent(null);
    setActiveDraft(null);
    setLivePill(null);
    setInputText('');
    setEditingMessageId(null);
    setEditText('');
    setVoiceState('IDLE');
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(msg.text);
      }
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.warn('[ChatView] Erro ao copiar:', err);
    }
  };

  const handleStartEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveAndResend = async (targetMsg: ChatMessage) => {
    const newContent = editText.trim();
    if (!newContent || loading) return;

    setEditingMessageId(null);
    setEditText('');

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const targetIndex = messages.findIndex(m => m.id === targetMsg.id);
    if (targetIndex === -1) return;

    const oldVersion = targetMsg.version || 1;
    const newVersion = oldVersion + 1;
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const updatedMessages = messages.map((m, idx) => {
      if (m.id === targetMsg.id) {
        return { ...m, status: 'SUPERSEDED' as const };
      }
      if (idx > targetIndex) {
        return { ...m, status: 'BRANCH_INACTIVE' as const };
      }
      return m;
    });

    const editedMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: newContent,
      timestamp: timeStr,
      parentMessageId: targetMsg.id,
      version: newVersion,
      status: 'ACTIVE',
      editedAt: timeStr,
    };

    const nextMessages = [...updatedMessages, editedMsg];
    setMessages(nextMessages);
    setPendingIntent(null);
    setActiveDraft(null);
    setLoading(true);
    scrollToBottom();

    const activeHistory = nextMessages.filter(m => (!m.status || m.status === 'ACTIVE') && m.id !== editedMsg.id);

    try {
      const intent = await parseFinancialIntentWithGemini(
        newContent,
        activeHistory,
        categories,
        null,
        controller.signal
      );

      setLoading(false);

      if (intent.supplier || intent.totalAmount || intent.amount || intent.installmentsCount) {
        setActiveDraft(intent);
      }

      if (intent.validationStatus === 'needs_input') {
        setPendingIntent(intent);
        setCardVisualState('NEEDS_INPUT');
      } else if (intent.isReadyForConfirmation || intent.validationStatus === 'ready') {
        setPendingIntent(intent);
        setCardVisualState('READY_TO_CONFIRM');
      } else if (intent.questionToUser) {
        setPendingIntent(null);
        setMessages(prev => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: 'assistant',
            text: intent.questionToUser!,
            parsedIntent: intent,
            timestamp: timeStr,
            status: 'ACTIVE',
          },
        ]);
      } else {
        setPendingIntent(null);
      }

      scrollToBottom();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setLoading(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputText).trim();
    if (!messageText || loading) return;

    setInputText('');
    setLivePill(null);
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: timeStr,
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    scrollToBottom();

    const draftToUse = pendingIntent || activeDraft;
    const intent = await parseFinancialIntentWithGemini(messageText, messages, categories, draftToUse);
    setLoading(false);

    if (intent.supplier || intent.totalAmount || intent.amount || intent.installmentsCount) {
      setActiveDraft(intent);
    }

    if (intent.validationStatus === 'needs_input') {
      setPendingIntent(intent);
      setCardVisualState('NEEDS_INPUT');
    } else if (intent.isReadyForConfirmation || intent.validationStatus === 'ready') {
      setPendingIntent(intent);
      setCardVisualState('READY_TO_CONFIRM');
    } else if (intent.questionToUser) {
      setPendingIntent(null);
      setMessages(prev => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'assistant',
          text: intent.questionToUser!,
          parsedIntent: intent,
          timestamp: timeStr,
        },
      ]);
    } else {
      setPendingIntent(null);
      setMessages(prev => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'assistant',
          text: 'Não consegui entender com clareza. Poderia descrever o valor e a finalidade?',
          timestamp: timeStr,
        },
      ]);
    }

    scrollToBottom();
  };

  const handleStartVoice = async () => {
    voiceSessionIdRef.current += 1;
    const currentSessionId = voiceSessionIdRef.current;

    baseInputTextRef.current = inputText.trim();
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    setVoiceState('STARTING');

    const started = await startVoiceRecording({
      onRecordingStart: () => {
        if (voiceSessionIdRef.current === currentSessionId) {
          setVoiceState('LISTENING');
        }
      },
      onRecordingEnd: () => {
        if (voiceSessionIdRef.current === currentSessionId && voiceState === 'LISTENING') {
          handleFinishVoice();
        }
      },
      onSpeechResult: (transcript) => {
        if (voiceSessionIdRef.current !== currentSessionId) return;

        speechSessionTextRef.current = transcript;
        const fullText = (baseInputTextRef.current ? `${baseInputTextRef.current} ${transcript}` : transcript).trim();
        setInputText(fullText);

        const liveDelta = extractLocalSemanticDelta(fullText);
        setLivePill(liveDelta);

        if (hasSignificantSemanticChange(lastProcessedTextRef.current, fullText)) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

          debounceTimerRef.current = setTimeout(async () => {
            if (voiceSessionIdRef.current !== currentSessionId) return;

            setVoiceState('PRE_ANALYZING');

            if (abortControllerRef.current) abortControllerRef.current.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;

            analysisRevisionRef.current += 1;
            const currentRevision = analysisRevisionRef.current;
            const deltaSegment = fullText.slice(lastProcessedTextRef.current.length).trim() || fullText;
            lastProcessedTextRef.current = fullText;

            try {
              const updatedDraft = await parseIncrementalDraftDelta(
                deltaSegment,
                activeDraftRef.current,
                categories,
                controller.signal
              );

              if (
                voiceSessionIdRef.current === currentSessionId &&
                analysisRevisionRef.current === currentRevision
              ) {
                if (updatedDraft.supplier || updatedDraft.totalAmount || updatedDraft.amount || updatedDraft.installmentsCount) {
                  setActiveDraft(updatedDraft);
                }
                setVoiceState('LISTENING');
              }
            } catch (e: any) {
              if (
                voiceSessionIdRef.current === currentSessionId &&
                analysisRevisionRef.current === currentRevision
              ) {
                setVoiceState('LISTENING');
              }
            }
          }, 1800);
        }
      },
      onError: (err) => {
        if (voiceSessionIdRef.current === currentSessionId) {
          setVoiceState('IDLE');
          console.warn('[VoiceRecorder] Erro de voz:', err);
        }
      },
    });

    if (!started && voiceSessionIdRef.current === currentSessionId) {
      setVoiceState('IDLE');
    }
  };

  const handleCancelVoice = async () => {
    voiceSessionIdRef.current += 1;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    await stopVoiceRecording();
    setVoiceState('IDLE');
    setInputText(baseInputTextRef.current);
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    setLivePill(null);
  };

  const handleFinishVoice = async () => {
    const currentSessionId = voiceSessionIdRef.current;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    setVoiceState('FINALIZING');
    await stopVoiceRecording();

    const textToSend = inputText.trim();
    if (!textToSend) {
      setVoiceState('IDLE');
      return;
    }

    setVoiceState('ANALYZING');
    setLoading(true);

    try {
      const draftToUse = pendingIntent || activeDraft;
      const intent = await parseFinancialIntentWithGemini(textToSend, messages, categories, draftToUse);
      setVoiceState('IDLE');
      setLoading(false);

      if (intent.supplier || intent.totalAmount || intent.amount || intent.installmentsCount) {
        setActiveDraft(intent);
      }

      handleSendMessage(textToSend);
    } catch (e) {
      setVoiceState('IDLE');
      setLoading(false);
      handleSendMessage(textToSend);
    }
  };

  const handleConfirmRegister = async () => {
    if (!pendingIntent || registering) return;

    setRegistering(true);
    setCardVisualState('SAVING');

    const draftIdKey = `${pendingIntent.supplier || pendingIntent.description}_${pendingIntent.totalAmount || pendingIntent.amount}_${pendingIntent.installmentList?.length || 1}`;

    const res = await confirmFinancialDraft(pendingIntent, draftIdKey, userName);

    setRegistering(false);

    if (res.success) {
      setCardVisualState('SAVED');
      onTransactionRegistered();
    } else {
      setCardVisualState('ERROR');
      Alert.alert('Erro ao Salvar', res.error || 'Não foi possível registrar a movimentação.');
    }
  };

  const handleSelectCandidate = (candidate: any) => {
    if (!pendingIntent) return;
    const updated: ParsedFinancialIntent = {
      ...pendingIntent,
      matchedAccount: candidate,
      supplier: candidate.counterparty || candidate.description,
      amount: candidate.amount,
      dueDate: candidate.due_date,
      candidateAccounts: null,
      isReadyForConfirmation: true,
      questionToUser: `Selecionado: ${candidate.counterparty || candidate.description} - R$ ${candidate.amount.toFixed(2)} (vencimento em ${candidate.due_date}).`,
    };
    setPendingIntent(updated);
    setCardVisualState('READY_TO_CONFIRM');
  };

  const handleDiscardProposal = () => {
    setCardVisualState('DISCARDED');
    setTimeout(() => {
      setPendingIntent(null);
      setActiveDraft(null);
    }, 2000);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Barra de Ferramentas com Botão Limpar Chat */}
      {messages.length > 0 && (
        <ChatHeaderToolBar onClearChat={handleClearChat} isDarkMode={isDarkMode} />
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={messages.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.filter(m => !m.status || m.status === 'ACTIVE').length === 0 ? (
          <AssistantEmptyState isDarkMode={isDarkMode} />
        ) : (
          messages
            .filter(m => !m.status || m.status === 'ACTIVE')
            .map(msg => (
              <ChatMessageItem
                key={msg.id}
                msg={msg}
                editingMessageId={editingMessageId}
                editText={editText}
                copiedMessageId={copiedMessageId}
                setEditText={setEditText}
                onCopyMessage={handleCopyMessage}
                onStartEditMessage={handleStartEditMessage}
                onCancelEdit={handleCancelEdit}
                onSaveAndResend={handleSaveAndResend}
                isDarkMode={isDarkMode}
              />
            ))
        )}

        {loading ? (
          <View style={[styles.messageRow, styles.assistantRow]}>
            <View style={styles.avatarBot}>
              <Bot size={14} color="#7c3aed" />
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator color="#7c3aed" size="small" />
            </View>
          </View>
        ) : null}

        {pendingIntent ? (
          <TransactionPreviewCard
            intent={pendingIntent}
            cardState={cardVisualState}
            onConfirm={handleConfirmRegister}
            onEdit={() => setEditModalVisible(true)}
            onDiscard={handleDiscardProposal}
            onSelectCandidate={handleSelectCandidate}
            categories={categories}
            isDarkMode={isDarkMode}
          />
        ) : null}
      </ScrollView>

      {/* Modal de Edição Manual de Dados */}
      <TransactionEditModal
        visible={editModalVisible}
        intent={pendingIntent}
        onClose={() => setEditModalVisible(false)}
        onSave={(updatedIntent) => {
          setPendingIntent(updatedIntent);
          setCardVisualState('READY_TO_CONFIRM');
        }}
        isDarkMode={isDarkMode}
      />

      {/* Indicador de Status Discreto da Sessão de Voz */}
      <RecordingStatusBar voiceState={voiceState} livePill={livePill} isDarkMode={isDarkMode} />

      {/* Barra de Entrada de Texto e Controles da Sessão de Voz */}
      <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
        <TextInput
          style={[styles.textInput, isDarkMode && styles.textInputDark]}
          placeholder={isRecordingActive ? 'Ditando mensagem por voz...' : 'Descreva a movimentação ou dúvida...'}
          placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />

        {/* Controles de Gravação Explícitos e Discretos [ X ] [ ■ ] [ Enviar ] */}
        {isRecordingActive ? (
          <View style={styles.recordingControlsGroup}>
            <TouchableOpacity
              style={styles.cancelRecordingBtn}
              onPress={handleCancelVoice}
              accessibilityLabel="Cancelar ditado"
              activeOpacity={0.7}
            >
              <MicOff size={16} color="#ef4444" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopRecordingBtn}
              onPress={handleFinishVoice}
              accessibilityLabel="Concluir fala"
              activeOpacity={0.8}
            >
              <Square size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.micBtn, isDarkMode && styles.micBtnDark]}
            onPress={handleStartVoice}
            accessibilityLabel="Iniciar ditado por voz"
            activeOpacity={0.7}
          >
            <Mic size={18} color="#7c3aed" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.sendBtn,
            !inputText.trim() || loading ? styles.sendBtnDisabled : null,
          ]}
          onPress={() => (isRecordingActive ? handleFinishVoice() : handleSendMessage())}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.8}
          accessibilityLabel="Enviar mensagem"
        >
          <Send size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  inputContainerDark: {
    backgroundColor: '#1e293b',
    borderTopColor: '#334155',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  textInputDark: {
    color: '#f8fafc',
    backgroundColor: '#0f172a',
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnDark: {
    backgroundColor: '#3b0764',
  },
  recordingControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelRecordingBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopRecordingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
