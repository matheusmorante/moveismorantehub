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
  PRE_ANALYSIS_DEBOUNCE_MS,
  MAX_VOICE_INACTIVITY_MS,
  classifyMultiTurnIntent,
  applyTurnPatch,
  applyTurnPatchWithDraftList,
  buildGroupedQuestion,
} from '../../../services/financialAiAssistantService';
import { VoiceSessionState } from '../types/VoiceSessionState';
import { AssistantEmptyState } from './AssistantEmptyState';
import { CardVisualState } from './TransactionPreviewCard';
import { TransactionEditModal } from './TransactionEditModal';
import { ChatHeaderToolBar } from './chat/ChatHeaderToolBar';
import { ChatMessageItem } from './chat/ChatMessageItem';
import { FinancialTimelineCard } from './chat/FinancialTimelineCard';
import {
  appendFinancialTimelineCard,
  updateFinancialTimelineCardState,
} from './chat/financialCardTimeline';
import type { FinancialCardTimelineEntry } from './chat/financialCardTimeline';
import { RecordingStatusBar } from './chat/RecordingStatusBar';
import { startVoiceRecording, stopVoiceRecording } from '../../../services/voiceRecorderService';
import { advanceFinancialBatch } from '../../../services/financial/financialBatchQueue';

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
  const [timelineCards, setTimelineCards] = useState<FinancialCardTimelineEntry[]>([]);
  const [activeTimelineCardId, setActiveTimelineCardId] = useState<string | null>(null);
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
  const silenceTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
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
    setTimelineCards([]);
    setActiveTimelineCardId(null);
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
        publishTimelineCard(intent, 'NEEDS_INPUT', editedMsg.id);
      } else if (intent.isReadyForConfirmation || intent.validationStatus === 'ready') {
        setPendingIntent(intent);
        publishTimelineCard(intent, 'READY_TO_CONFIRM', editedMsg.id);
      } else if (intent.questionToUser) {
        setPendingIntent(intent);
        publishTimelineCard(intent, 'NEEDS_INPUT', editedMsg.id);
      } else {
        setPendingIntent(null);
        setActiveTimelineCardId(null);
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

    const currentDraft = activeDraftRef.current || activeDraft;
    const turnIntentType = classifyMultiTurnIntent(messageText, currentDraft, messages);
    const todayStr = new Date().toISOString().split('T')[0];

    const batchPatch = currentDraft?.batchDraftsList?.length
      ? applyTurnPatchWithDraftList(currentDraft.batchDraftsList, messageText, turnIntentType, categories, todayStr)
      : null;
    const singlePatch = batchPatch ? null : applyTurnPatch(currentDraft, messageText, turnIntentType, categories, todayStr);
    const isNewTransaction = batchPatch?.isNewTransaction ?? singlePatch!.isNewTransaction;
    const patchedBatch = batchPatch?.updatedDrafts;
    const batchReady = Boolean(patchedBatch?.length && patchedBatch.every(item => item.isReadyForConfirmation || item.validationStatus === 'ready'));
    const updatedDraft: ParsedFinancialIntent = patchedBatch && currentDraft ? {
      ...currentDraft,
      batchDraftsList: patchedBatch,
      questionToUser: buildGroupedQuestion(patchedBatch),
      missingFields: patchedBatch.flatMap(item => item.missingFields || []),
      isReadyForConfirmation: batchReady,
      validationStatus: batchReady ? 'ready' : 'needs_input',
    } : singlePatch!.updatedDraft;

    let finalIntent = updatedDraft;

    try {
      const draftToPass = isNewTransaction ? null : currentDraft;
      const geminiParsed = await parseFinancialIntentWithGemini(messageText, messages, categories, draftToPass);

      if (geminiParsed && !isNewTransaction && currentDraft) {
        const purposeWasPatched = updatedDraft.businessPurpose !== currentDraft.businessPurpose;
        const paymentWasPatched = updatedDraft.paymentMethod !== currentDraft.paymentMethod;
        finalIntent = {
          ...updatedDraft,
          ...geminiParsed,
          // DIV-002 — INVARIANTE: batchDraftsList é a fonte de verdade para N fatos.
          // Se o draft existente já possui batch e o Gemini retornou resposta parcial
          // (ex: questionToUser sem batchDraftsList), preservar o batch original.
          // Nunca deixar uma resposta parcial do Gemini colapsar o lote silenciosamente.
          batchDraftsList: patchedBatch ?? geminiParsed.batchDraftsList ?? currentDraft.batchDraftsList,
          amount: geminiParsed.amount || updatedDraft.amount,
          categoryName: geminiParsed.categoryName || updatedDraft.categoryName,
          businessPurpose: purposeWasPatched ? updatedDraft.businessPurpose : ((geminiParsed.businessPurpose && geminiParsed.businessPurpose !== 'UNKNOWN') ? geminiParsed.businessPurpose : updatedDraft.businessPurpose),
          paymentMethod: paymentWasPatched ? updatedDraft.paymentMethod : ((geminiParsed.paymentMethod && geminiParsed.paymentMethod !== 'UNKNOWN') ? geminiParsed.paymentMethod : updatedDraft.paymentMethod),
        };
      } else if (geminiParsed) {
        finalIntent = geminiParsed;
      }
      if (patchedBatch) {
        finalIntent = {
          ...finalIntent,
          batchDraftsList: patchedBatch,
          questionToUser: buildGroupedQuestion(patchedBatch),
          missingFields: patchedBatch.flatMap(item => item.missingFields || []),
          isReadyForConfirmation: batchReady,
          validationStatus: batchReady ? 'ready' : 'needs_input',
        };
      }
    } catch (e) {
      // Fallback para finalIntent determinístico
    }

    setLoading(false);

    // Se todos os campos obrigatórios foram preenchidos, limpa as dúvidas pendentes e marca como pronto
    if (
      finalIntent.paymentMethod &&
      finalIntent.paymentMethod !== 'UNKNOWN' &&
      finalIntent.businessPurpose &&
      finalIntent.businessPurpose !== 'UNKNOWN' &&
      (finalIntent.amount || finalIntent.totalAmount)
    ) {
      finalIntent.missingFields = [];
      finalIntent.questionToUser = null;
      finalIntent.isReadyForConfirmation = true;
    }

    if (finalIntent.supplier || finalIntent.totalAmount || finalIntent.amount || finalIntent.installmentsCount) {
      setActiveDraft(finalIntent);
    }

    const isComplete =
      finalIntent.isReadyForConfirmation ||
      finalIntent.validationStatus === 'ready' ||
      !finalIntent.missingFields ||
      finalIntent.missingFields.length === 0;

    if (isComplete) {
      setPendingIntent(finalIntent);
      publishTimelineCard(finalIntent, 'READY_TO_CONFIRM', userMsg.id);
      // Remove/Resolve os cards e mensagens de dúvidas pendentes anteriores que foram respondidas
      setMessages(prev =>
        prev.map(m =>
          m.sender === 'assistant' && (m.text.includes('?') || m.parsedIntent?.missingFields?.length) && !m.text.includes('Confere')
            ? { ...m, status: 'RESOLVED' }
            : m
        )
      );
    } else if (finalIntent.validationStatus === 'needs_input' || (finalIntent.missingFields && finalIntent.missingFields.length > 0) || finalIntent.questionToUser) {
      setPendingIntent(finalIntent);
      publishTimelineCard(finalIntent, 'NEEDS_INPUT', userMsg.id);
    } else {
      setPendingIntent(null);
      setActiveTimelineCardId(null);
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

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(async () => {
        if (voiceSessionIdRef.current === currentSessionId) {
          console.log('[VoiceRecorder] Inatividade atingida. Parando microfone (texto preservado no input).');
          await handleStopVoice();
        }
      }, MAX_VOICE_INACTIVITY_MS);
    };

    resetInactivityTimer();

    const started = await startVoiceRecording({
      onRecordingStart: () => {
        if (voiceSessionIdRef.current === currentSessionId) {
          setVoiceState('LISTENING');
        }
      },
      onRecordingEnd: () => {
        // Término espontâneo apenas para o microfone sem enviar a mensagem
        if (voiceSessionIdRef.current === currentSessionId) {
          setVoiceState('IDLE');
        }
      },
      onSpeechResult: (transcript) => {
        if (voiceSessionIdRef.current !== currentSessionId) return;

        speechSessionTextRef.current = transcript;
        const fullText = (baseInputTextRef.current ? `${baseInputTextRef.current} ${transcript}` : transcript).trim();
        setInputText(fullText);

        const liveDelta = extractLocalSemanticDelta(fullText);
        setLivePill(liveDelta);

        // Reinicia o Timer de Inatividade de 15s a cada fala
        resetInactivityTimer();

        // Reinicia o Timer de Pré-Análise de 3.0s (PRE_ANALYSIS_DEBOUNCE_MS = 3000)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = setTimeout(async () => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          const currentFullText = (baseInputTextRef.current ? `${baseInputTextRef.current} ${speechSessionTextRef.current}` : speechSessionTextRef.current).trim();
          if (currentFullText) {
            // Executa pré-análise silenciosa em background SEM enviar ao chat e SEM limpar o input
            const semanticDelta = extractLocalSemanticDelta(currentFullText);
            setLivePill(semanticDelta);
            // O MICROFONE CONTINUA ATIVO (LISTENING), permitindo ao usuário continuar falando
            resetInactivityTimer();
          }
        }, PRE_ANALYSIS_DEBOUNCE_MS);
      },
      onError: (err) => {
        if (voiceSessionIdRef.current === currentSessionId) {
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setVoiceState('IDLE');
          console.warn('[VoiceRecorder] Erro de voz:', err);
        }
      },
    });

    if (!started && voiceSessionIdRef.current === currentSessionId) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      setVoiceState('IDLE');
    }
  };

  const handleStopVoice = async () => {
    voiceSessionIdRef.current += 1;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    await stopVoiceRecording();
    setVoiceState('IDLE');
    // Texto gravado permanece no input para o usuário enviar manualmente
  };

  const handleCancelVoice = async () => {
    voiceSessionIdRef.current += 1;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    await stopVoiceRecording();
    setVoiceState('IDLE');
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    setInputText('');
    setLivePill(null);
  };

  const handleConfirmRegister = async () => {
    if (!pendingIntent || registering) return;

    setRegistering(true);
    markActiveTimelineCard('SAVING');

    const draftIdKey = `${pendingIntent.supplier || pendingIntent.description}_${pendingIntent.totalAmount || pendingIntent.amount}_${pendingIntent.installmentList?.length || 1}`;

    const res = await confirmFinancialDraft(pendingIntent, draftIdKey, userName);

    setRegistering(false);

    if (res.success) {
      finishActiveTimelineCard('SAVED');
      onTransactionRegistered();
    } else {
      markActiveTimelineCard('ERROR');
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
    const anchor = latestTimelineAnchor();
    if (anchor) publishTimelineCard(updated, 'READY_TO_CONFIRM', anchor);
  };

  const handleDiscardProposal = () => {
    finishActiveTimelineCard('DISCARDED');
    setTimeout(() => {
      setPendingIntent(null);
      setActiveDraft(null);
    }, 2000);
  };

  const publishTimelineCard = (intent: ParsedFinancialIntent, cardState: CardVisualState, afterMessageId: string) => {
    const entry = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      afterMessageId,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      intent,
      cardState,
    };
    setTimelineCards(current => appendFinancialTimelineCard(current, entry));
    setActiveTimelineCardId(entry.id);
    scrollToBottom();
  };

  const markActiveTimelineCard = (cardState: CardVisualState) => {
    setTimelineCards(current => updateFinancialTimelineCardState(current, activeTimelineCardId, cardState));
  };

  const finishActiveTimelineCard = (cardState: 'SAVED' | 'DISCARDED') => {
    markActiveTimelineCard(cardState);
    setActiveTimelineCardId(null);
  };

  const latestTimelineAnchor = () => {
    const activeMsgs = messages.filter(message => !message.status || message.status === 'ACTIVE');
    return (activeMsgs.length ? activeMsgs[activeMsgs.length - 1]?.id : null)
      || (timelineCards.length ? timelineCards[timelineCards.length - 1]?.afterMessageId : '')
      || '';
  };

  const handleConfirmRegisterSingle = async (draftToRegister: ParsedFinancialIntent, index: number) => {
    try {
      // DIV-006: amount null não pode virar zero — validar explicitamente antes de criar
      const amountValue = draftToRegister.amount ?? null;
      if (amountValue === null || amountValue === undefined || amountValue <= 0) {
        Alert.alert('Valor Inválido', 'Esta movimentação não possui valor informado e não pode ser registrada.');
        return;
      }

      setRegistering(true);
      await createFinancialTransaction({
        type: draftToRegister.type,
        amount: amountValue,
        description: draftToRegister.description,
        category_name: draftToRegister.categoryName,
        payment_method: draftToRegister.paymentMethod,
        date: draftToRegister.date || new Date().toISOString().split('T')[0],
        purpose: (draftToRegister.businessPurpose && draftToRegister.businessPurpose !== 'UNKNOWN')
          ? draftToRegister.businessPurpose
          : null,
      });
      setRegistering(false);
      onTransactionRegistered();
      finishActiveTimelineCard('SAVED');

      // DIV-002 — INVARIANTE: remover apenas o draft confirmado, preservar os demais
      if (pendingIntent && pendingIntent.batchDraftsList) {
        const nextIntent = advanceFinancialBatch(pendingIntent, index);
        if (!nextIntent) {
          setPendingIntent(null);
          setActiveDraft(null);
        } else {
          setPendingIntent(nextIntent);
          setActiveDraft(nextIntent);
          const nextState = nextIntent.batchDraftsList?.[0]?.isReadyForConfirmation ? 'READY_TO_CONFIRM' : 'NEEDS_INPUT';
          const anchor = latestTimelineAnchor();
          if (anchor) publishTimelineCard(nextIntent, nextState, anchor);
        }
      }
    } catch (err) {
      setRegistering(false);
      markActiveTimelineCard('ERROR');
      Alert.alert('Erro', 'Não foi possível registrar a transação.');
    }
  };

  const handleDiscardSubIntent = (index: number) => {
    if (pendingIntent && pendingIntent.batchDraftsList) {
      finishActiveTimelineCard('DISCARDED');
      const nextIntent = advanceFinancialBatch(pendingIntent, index);
      if (!nextIntent) {
        setPendingIntent(null);
        setActiveDraft(null);
      } else {
        setPendingIntent(nextIntent);
        setActiveDraft(nextIntent);
        const nextState = nextIntent.batchDraftsList?.[0]?.isReadyForConfirmation ? 'READY_TO_CONFIRM' : 'NEEDS_INPUT';
        const anchor = latestTimelineAnchor();
        if (anchor) publishTimelineCard(nextIntent, nextState, anchor);
      }
    }
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
              <React.Fragment key={msg.id}>
                <ChatMessageItem
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
                {timelineCards.filter(card => card.afterMessageId === msg.id).map(card => (
                  <FinancialTimelineCard
                    key={card.id}
                    entry={card}
                    active={card.id === activeTimelineCardId}
                    categories={categories}
                    isDarkMode={isDarkMode}
                    onConfirm={intent => card.intent.batchDraftsList?.length ? void handleConfirmRegisterSingle(intent, 0) : void handleConfirmRegister()}
                    onEdit={() => setEditModalVisible(true)}
                    onDiscard={() => card.intent.batchDraftsList?.length ? handleDiscardSubIntent(0) : handleDiscardProposal()}
                    onSelectCandidate={handleSelectCandidate}
                  />
                ))}
              </React.Fragment>
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

      </ScrollView>

      {/* Modal de Edição Manual de Dados */}
      <TransactionEditModal
        visible={editModalVisible}
        intent={pendingIntent}
        onClose={() => setEditModalVisible(false)}
        onSave={(updatedIntent) => {
          setPendingIntent(updatedIntent);
          const anchor = latestTimelineAnchor();
          if (anchor) publishTimelineCard(updatedIntent, 'READY_TO_CONFIRM', anchor);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Indicador de Status Discreto da Sessão de Voz e Rótulos em Tempo Real */}
      <RecordingStatusBar
        voiceState={voiceState}
        livePill={livePill}
        activeDraft={activeDraft}
        isDarkMode={isDarkMode}
      />

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
              onPress={handleStopVoice}
              accessibilityLabel="Parar gravação"
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
          onPress={async () => {
            if (isRecordingActive) {
              await handleStopVoice();
            }
            handleSendMessage();
          }}
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
