import { useState, useRef, useEffect } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
  FinancialCategory,
  createFinancialTransaction,
  confirmFinancialDraft,
} from '../../../services/mobileFinanceService';
import {
  ChatMessage,
  ParsedFinancialIntent,
  extractLocalSemanticDelta,
  LocalSemanticDelta,
  PRE_ANALYSIS_DEBOUNCE_MS,
  MAX_VOICE_INACTIVITY_MS,
} from '../../../services/financialAiAssistantService';
import { MobileAgentService } from '../../../services/aiAgent/mobileAgentService';
import { GeminiContent, ExecutedToolRecord } from '../../../services/aiAgent/mobileAgentTypes';
import { VoiceSessionState } from '../types/VoiceSessionState';
import { CardVisualState } from '../components/TransactionPreviewCard';
import {
  appendFinancialTimelineCard,
  updateFinancialTimelineCardState,
} from '../components/chat/financialCardTimeline';
import type { FinancialCardTimelineEntry } from '../components/chat/financialCardTimeline';
import { startVoiceRecording, stopVoiceRecording } from '../../../services/voiceRecorderService';

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

  // Estados de Edicao e Copia de Mensagens
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Estados da Sessao de Voz
  const [voiceState, setVoiceState] = useState<VoiceSessionState>('IDLE');
  const [livePill, setLivePill] = useState<LocalSemanticDelta | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const baseInputTextRef = useRef('');
  const speechSessionTextRef = useRef('');
  const lastProcessedTextRef = useRef('');
  const debounceTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const geminiHistoryRef = useRef<GeminiContent[]>([]);
  const confirmingTimelineCardIdsRef = useRef(new Set<string>());

  const voiceSessionIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    geminiHistoryRef.current = [];
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

  const publishPreparedTransactionCard = (createdTx: ExecutedToolRecord, asstMsgId: string) => {
    if (!createdTx || !createdTx.result?.success) return;
    const txData = createdTx.result?.data || createdTx.args;
    if (!txData) return;

    const matchedCat = categories.find(c => c.id === txData.categoriaId);
    const catName = txData.categoriaNome || matchedCat?.name || 'Categoria não informada';
    const intent: ParsedFinancialIntent = {
      type: txData.tipo,
      amount: txData.valor,
      totalAmount: txData.valor,
      description: txData.descricao,
      categoryName: catName,
      categoryId: txData.categoriaId || undefined,
      businessPurpose: txData.finalidade || 'BUSINESS',
      paymentMethod: txData.formaPagamento || '',
      vehicle: txData.veiculo || undefined,
      date: txData.data || new Date().toISOString().split('T')[0],
      missingFields: [],
      isReadyForConfirmation: true,
      validationStatus: 'ready',
    };
    setPendingIntent(intent);
    publishTimelineCard(intent, 'READY_TO_CONFIRM', asstMsgId);
  };

  const publishPreparedTransactionCards = (executedTools: ExecutedToolRecord[], asstMsgId: string) => {
    executedTools
      .filter(tool => tool.name === 'criarMovimentacaoFinanceira' && tool.result?.success)
      .forEach(tool => publishPreparedTransactionCard(tool, asstMsgId));
  };

  const handleSaveAndResend = async (targetMsg: ChatMessage) => {
    const newContent = editText.trim();
    if (!newContent || loading) return;

    setEditingMessageId(null);
    setEditText('');

    const targetIndex = messages.findIndex(m => m.id === targetMsg.id);
    if (targetIndex === -1) return;

    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedMessages = messages.map((m, idx) => {
      if (m.id === targetMsg.id) return { ...m, status: 'SUPERSEDED' as const };
      if (idx > targetIndex) return { ...m, status: 'BRANCH_INACTIVE' as const };
      return m;
    });

    const editedMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: newContent,
      timestamp: timeStr,
      parentMessageId: targetMsg.id,
      version: (targetMsg.version || 1) + 1,
      status: 'ACTIVE',
      editedAt: timeStr,
    };

    setMessages([...updatedMessages, editedMsg]);
    setLoading(true);
    scrollToBottom();

    try {
      const { result, updatedHistory } = await MobileAgentService.sendMessage(
        newContent,
        geminiHistoryRef.current
      );
      geminiHistoryRef.current = updatedHistory;

      const asstMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: result.answer,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, asstMsg]);

      publishPreparedTransactionCards(result.executedTools, asstMsg.id);
    } catch (err: any) {
      console.warn('Erro ao reenviar mensagem editada no mobile:', err);
    } finally {
      setLoading(false);
      scrollToBottom();
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

    try {
      const { result, updatedHistory } = await MobileAgentService.sendMessage(
        messageText,
        geminiHistoryRef.current
      );
      geminiHistoryRef.current = updatedHistory;

      const asstMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: result.answer,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, asstMsg]);

      publishPreparedTransactionCards(result.executedTools, asstMsg.id);
    } catch (err: any) {
      console.warn('Erro ao processar mensagem com o agente Gemini no mobile:', err);
      const errorMsg = err?.message || '';
      let userFriendlyText = 'Desculpe, ocorreu uma falha ao consultar o assistente. Por favor, tente novamente.';

      if (errorMsg.includes('Chave de API do Gemini não configurada') || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('403')) {
        userFriendlyText = 'A chave da API do Gemini não foi encontrada ou é inválida. Verifique as configurações do sistema.';
      } else if (errorMsg.includes('Network') || errorMsg.includes('Failed to fetch') || errorMsg.includes('network')) {
        userFriendlyText = 'Não foi possível conectar ao servidor do Gemini. Verifique a sua conexão com a internet.';
      }

      const asstMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: userFriendlyText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isAlert: true,
      };
      setMessages(prev => [...prev, asstMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(async () => {
      await handleStopVoice();
    }, MAX_VOICE_INACTIVITY_MS);
  };

  const handleStartVoice = async () => {
    if (isRecordingActive) {
      await handleStopVoice();
      return;
    }

    baseInputTextRef.current = inputText.trim();
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    voiceSessionIdRef.current += 1;
    const currentSessionId = voiceSessionIdRef.current;

    setVoiceState('STARTING');
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
      Alert.alert('Erro ao Salvar', res.error || 'Nao foi possivel registrar a movimentacao.');
    }
  };

  const handleConfirmTimelineCard = async (cardId: string, intent: ParsedFinancialIntent) => {
    if (confirmingTimelineCardIdsRef.current.has(cardId)) return;

    confirmingTimelineCardIdsRef.current.add(cardId);
    setTimelineCards(current => updateFinancialTimelineCardState(current, cardId, 'SAVING'));

    try {
      const res = await confirmFinancialDraft(intent, `agent-card_${cardId}`, userName);

      if (res.success) {
        setTimelineCards(current => updateFinancialTimelineCardState(current, cardId, 'SAVED'));
        onTransactionRegistered();
        return;
      }

      setTimelineCards(current => updateFinancialTimelineCardState(current, cardId, 'ERROR'));
      Alert.alert('Erro ao Salvar', res.error || 'Nao foi possivel registrar a movimentacao.');
    } finally {
      confirmingTimelineCardIdsRef.current.delete(cardId);
    }
  };

  const handleSelectCandidate = (candidate: any) => {
    if (!pendingIntent) return;
    const updated = {
      ...pendingIntent,
      matchedAccount: candidate,
      supplier: candidate.counterparty || candidate.description,
      amount: candidate.amount,
      dueDate: candidate.due_date,
      isReadyForConfirmation: true,
      candidateAccounts: undefined,
      questionToUser: `Conta selecionada: ${candidate.counterparty || candidate.description} no valor de R$ ${Number(candidate.amount).toFixed(2)}.`,
    };
    setPendingIntent(updated);
  };

  const handleConfirmRegisterSingle = async (intent: ParsedFinancialIntent, index: number) => {
    try {
      const draftToRegister = intent.batchDraftsList?.[index] || intent;
      const amountValue = draftToRegister.amount || draftToRegister.totalAmount || 0;

      if (amountValue <= 0) {
        Alert.alert('Valor Invalido', 'Esta movimentacao nao possui valor informado e nao pode ser registrada.');
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
    } catch (err) {
      setRegistering(false);
      markActiveTimelineCard('ERROR');
      Alert.alert('Erro', 'Nao foi possivel registrar a transacao.');
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
    editingMessageId,
    editText,
    copiedMessageId,
    voiceState,
    livePill,
    isRecordingActive,
    scrollViewRef,
    setInputText,
    setEditText,
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
    handleConfirmTimelineCard,
    handleSelectCandidate,
    handleConfirmRegisterSingle,
    latestTimelineAnchor,
    publishTimelineCard,
  };
}
