import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
  FinancialCategory,
  createFinancialTransaction,
  confirmFinancialDraft,
} from '../../../services/mobileFinanceService';
import {
  ChatMessage,
  ParsedFinancialIntent,
  parseFinancialIntentWithGemini,
  extractLocalSemanticDelta,
  LocalSemanticDelta,
  PRE_ANALYSIS_DEBOUNCE_MS,
  MAX_VOICE_INACTIVITY_MS,
  classifyMultiTurnIntent,
  applyTurnPatch,
  validateParsedIntent,
} from '../../../services/financialAiAssistantService';
import { VoiceSessionState } from '../types/VoiceSessionState';
import { CardVisualState } from '../components/TransactionPreviewCard';
import {
  appendFinancialTimelineCard,
  updateFinancialTimelineCardState,
} from '../components/chat/financialCardTimeline';
import type { FinancialCardTimelineEntry } from '../components/chat/financialCardTimeline';
import { startVoiceRecording, stopVoiceRecording } from '../../../services/voiceRecorderService';
import { advanceFinancialBatch, rebuildFinancialBatch } from '../../../services/financial/financialBatchQueue';

interface UseFinancialAiChatProps {
  categories: FinancialCategory[];
  onTransactionRegistered: () => void;
  userName?: string;
}

export function useFinancialAiChat({
  categories,
  onTransactionRegistered,
  userName = 'Operador',
}: UseFinancialAiChatProps) {
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
  const abortControllerRef = useRef<AbortController | null>(null);

  activeDraftRef.current = activeDraft;

  useEffect(() => {
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
    return (
      (activeMsgs.length ? activeMsgs[activeMsgs.length - 1]?.id : null) ||
      (timelineCards.length ? timelineCards[timelineCards.length - 1]?.afterMessageId : '') ||
      ''
    );
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

      if (
        intent.description ||
        intent.supplier ||
        intent.totalAmount ||
        intent.amount ||
        intent.installmentsCount ||
        intent.questionToUser ||
        intent.missingFields?.length
      ) {
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

    const currentDraft = activeDraftRef.current || activeDraft || pendingIntent;
    const queuedDrafts = currentDraft?.batchDraftsList?.length
      ? currentDraft.batchDraftsList
      : currentDraft
        ? [currentDraft]
        : [];
    const currentItem = queuedDrafts[0] || null;
    const classifiedTurn = classifyMultiTurnIntent(messageText, currentItem, messages);
    const explicitlyRequestsNewTransaction =
      /\b(?:nova|novo|outra|outro)\b[\s\S]{0,35}\b(?:atualização|atualizacao|movimentação|movimentacao|lançamento|lancamento|entrada|saída|saida)\b|\b(?:cadastrar|registrar|lançar|lancar|criar|adicionar)\b[\s\S]{0,35}\b(?:uma|um)\s+(?:nova|novo|outra|outro)\b/i.test(
        messageText
      );
    const newRequestHasTransactionDetails =
      /r\$|\d|conta\s+de|\b(?:luz|energia|internet|água|agua|aluguel|compra|venda|paguei|recebi|gastei|abasteci)\b/i.test(
        messageText
      );
    const startsBlankTransaction = explicitlyRequestsNewTransaction && !newRequestHasTransactionDetails;
    const triesToStartAnotherTransaction = Boolean(
      currentItem &&
        classifiedTurn !== 'CORRECTION' &&
        !explicitlyRequestsNewTransaction &&
        (/\b(?:quero|gostaria|preciso|vou)\b[\s\S]{0,40}\b(?:cadastrar|registrar|lançar|lancar|adicionar|criar)\b|\b(?:cadastrar|registrar|lançar|lancar|adicionar|criar)\b[\s\S]{0,40}\b(?:conta|movimentação|movimentacao|entrada|saída|saida)\b/i.test(
          messageText
        ))
    );
    const mustKeepCurrentTransaction = Boolean(
      currentItem &&
        !explicitlyRequestsNewTransaction &&
        (classifiedTurn === 'NEW_TRANSACTION' || triesToStartAnotherTransaction)
    );
    const turnIntentType = explicitlyRequestsNewTransaction
      ? 'NEW_TRANSACTION'
      : currentItem && classifiedTurn === 'NEW_TRANSACTION'
        ? 'CONTINUATION'
        : classifiedTurn;
    const todayStr = new Date().toISOString().split('T')[0];

    const singlePatch = startsBlankTransaction
      ? {
          updatedDraft: {
            intentType: 'SINGLE_TRANSACTION' as const,
            type: /\bentrada\b/i.test(messageText) ? ('income' as const) : ('expense' as const),
            description: null,
            amount: null,
            paymentMethod: null,
            businessPurpose: /\bentrada\b/i.test(messageText) ? null : ('UNKNOWN' as const),
            missingFields: ['description', 'amount', 'paymentMethod'],
            questionToUser: /\bentrada\b/i.test(messageText)
              ? 'Qual entrada você quer cadastrar?'
              : 'Qual saída você quer cadastrar?',
            confidence: 1,
            isReadyForConfirmation: false,
            validationStatus: 'needs_input' as const,
          },
          isNewTransaction: true,
        }
      : mustKeepCurrentTransaction
        ? {
            updatedDraft: validateParsedIntent(currentItem!, todayStr),
            isNewTransaction: false,
          }
        : applyTurnPatch(currentItem, messageText, turnIntentType, categories, todayStr);
    const isNewTransaction = singlePatch.isNewTransaction;
    const patchedItem = singlePatch.updatedDraft;
    const updatedDraft =
      !explicitlyRequestsNewTransaction && currentDraft?.batchDraftsList?.length
        ? rebuildFinancialBatch(currentDraft, [patchedItem, ...queuedDrafts.slice(1)])!
        : patchedItem;

    let finalIntent = updatedDraft;

    try {
      const draftToPass = isNewTransaction ? null : currentItem;
      const geminiParsed =
        mustKeepCurrentTransaction || startsBlankTransaction
          ? null
          : await parseFinancialIntentWithGemini(messageText, messages, categories, draftToPass);

      if (geminiParsed && !isNewTransaction && currentItem) {
        const purposeWasPatched = patchedItem.businessPurpose !== currentItem.businessPurpose;
        const paymentWasPatched = patchedItem.paymentMethod !== currentItem.paymentMethod;
        const mergedItem = validateParsedIntent(
          {
            ...patchedItem,
            ...geminiParsed,
            batchDraftsList: null,
            intentType: classifiedTurn === 'CORRECTION' ? geminiParsed.intentType : currentItem.intentType,
            type: classifiedTurn === 'CORRECTION' ? geminiParsed.type || patchedItem.type : currentItem.type,
            description:
              classifiedTurn === 'CORRECTION'
                ? geminiParsed.description || patchedItem.description
                : currentItem.description || geminiParsed.description || patchedItem.description,
            supplier:
              classifiedTurn === 'CORRECTION'
                ? geminiParsed.supplier || patchedItem.supplier
                : currentItem.supplier || geminiParsed.supplier || patchedItem.supplier,
            counterparty:
              classifiedTurn === 'CORRECTION'
                ? geminiParsed.counterparty || patchedItem.counterparty
                : currentItem.counterparty || geminiParsed.counterparty || patchedItem.counterparty,
            amount: geminiParsed.amount || patchedItem.amount,
            categoryName: geminiParsed.categoryName || patchedItem.categoryName,
            businessPurpose: purposeWasPatched
              ? patchedItem.businessPurpose
              : geminiParsed.businessPurpose && geminiParsed.businessPurpose !== 'UNKNOWN'
                ? geminiParsed.businessPurpose
                : patchedItem.businessPurpose,
            paymentMethod: paymentWasPatched
              ? patchedItem.paymentMethod
              : geminiParsed.paymentMethod && geminiParsed.paymentMethod !== 'UNKNOWN'
                ? geminiParsed.paymentMethod
                : patchedItem.paymentMethod,
          },
          todayStr
        );
        finalIntent = currentDraft.batchDraftsList?.length
          ? rebuildFinancialBatch(currentDraft, [mergedItem, ...queuedDrafts.slice(1)])!
          : mergedItem;
      } else if (geminiParsed) {
        finalIntent = geminiParsed;
      }
    } catch (e) {}

    if (finalIntent.batchDraftsList?.length) {
      finalIntent = rebuildFinancialBatch(finalIntent, finalIntent.batchDraftsList)!;
    }

    setLoading(false);

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

    if (
      finalIntent.description ||
      finalIntent.supplier ||
      finalIntent.totalAmount ||
      finalIntent.amount ||
      finalIntent.installmentsCount ||
      finalIntent.questionToUser ||
      finalIntent.missingFields?.length
    ) {
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
      setMessages(prev =>
        prev.map(m =>
          m.sender === 'assistant' && (m.text.includes('?') || m.parsedIntent?.missingFields?.length) && !m.text.includes('Confere')
            ? { ...m, status: 'RESOLVED' }
            : m
        )
      );
    } else if (
      finalIntent.validationStatus === 'needs_input' ||
      (finalIntent.missingFields && finalIntent.missingFields.length > 0) ||
      finalIntent.questionToUser
    ) {
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
        if (voiceSessionIdRef.current === currentSessionId) {
          setVoiceState('IDLE');
        }
      },
      onSpeechResult: transcript => {
        if (voiceSessionIdRef.current !== currentSessionId) return;

        speechSessionTextRef.current = transcript;
        const fullText = (baseInputTextRef.current ? `${baseInputTextRef.current} ${transcript}` : transcript).trim();
        setInputText(fullText);

        const liveDelta = extractLocalSemanticDelta(fullText);
        setLivePill(liveDelta);

        resetInactivityTimer();

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = setTimeout(async () => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          const currentFullText = (
            baseInputTextRef.current ? `${baseInputTextRef.current} ${speechSessionTextRef.current}` : speechSessionTextRef.current
          ).trim();
          if (currentFullText) {
            const semanticDelta = extractLocalSemanticDelta(currentFullText);
            setLivePill(semanticDelta);
            resetInactivityTimer();
          }
        }, PRE_ANALYSIS_DEBOUNCE_MS);
      },
      onError: err => {
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
      setPendingIntent(null);
      setActiveDraft(null);
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

  const handleConfirmRegisterSingle = async (draftToRegister: ParsedFinancialIntent, index: number) => {
    try {
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
        purpose:
          draftToRegister.businessPurpose && draftToRegister.businessPurpose !== 'UNKNOWN'
            ? draftToRegister.businessPurpose
            : null,
      });
      setRegistering(false);
      onTransactionRegistered();
      finishActiveTimelineCard('SAVED');

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

  return {
    inputText,
    messages,
    loading,
    pendingIntent,
    activeDraft,
    registering,
    timelineCards,
    activeTimelineCardId,
    editModalVisible,
    editingMessageId,
    editText,
    copiedMessageId,
    voiceState,
    livePill,
    isRecordingActive,
    scrollViewRef,
    setInputText,
    setEditText,
    setEditModalVisible,
    setPendingIntent,
    handleClearChat,
    handleCopyMessage,
    handleStartEditMessage,
    handleCancelEdit,
    handleSaveAndResend,
    handleSendMessage,
    handleStartVoice,
    handleStopVoice,
    handleCancelVoice,
    handleConfirmRegister,
    handleSelectCandidate,
    handleConfirmRegisterSingle,
    latestTimelineAnchor,
    publishTimelineCard,
  };
}
