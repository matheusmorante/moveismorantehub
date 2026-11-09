import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import type {
  AiSituationRule,
  AiKnowledgeArticle,
  AiWorkflowConfig,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import {
  simulateWhatsAppAiTurn,
  type SimulationTurnResult,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settings';
import type { TestChatMessage } from './TestChatMessageBubble';

interface UseAiAgentTestChatParams {
  rules: AiSituationRule[];
  knowledgeBase: AiKnowledgeArticle[];
  workflows: AiWorkflowConfig[];
  enabledTools?: string[];
  systemPrompt?: string;
}

export function useAiAgentTestChat({
  rules,
  knowledgeBase,
  workflows,
  enabledTools = [],
  systemPrompt,
}: UseAiAgentTestChatParams) {
  const [messages, setMessages] = useState<TestChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Olá! Sou o Seu Lizandro, assistente virtual da Móveis Morante. Este é o ambiente de testes oficial. Você pode fazer qualquer pergunta sobre nossos móveis, preços, estoque, entrega ou pagamento para verificar como responderei aos clientes no WhatsApp!',
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<SimulationTurnResult | null>(null);
  const [feedbackInputId, setFeedbackInputId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isGenerating) return;

    const userMessageId = `usr_${Date.now()}`;
    const newUserMessage: TestChatMessage = {
      id: userMessageId,
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setInputText('');
    setIsGenerating(true);

    try {
      const currentSettings = getSettings();
      // Formata histórico anterior para a simulação multi-turnos
      const historyTurns = nextMessages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const simulationResult = await simulateWhatsAppAiTurn(
        supabase,
        text,
        {
          enabled: true,
          testMode: true,
          testPhoneNumbers: ['5541999998888'],
          systemPrompt,
          enabledTools,
          knowledgeBase,
          situationRules: rules,
          workflows,
        },
        currentSettings,
        {},
        historyTurns
      );

      const aiMessage: TestChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'model',
        text: simulationResult.aiResponseText || 'Não foi possível gerar a resposta no momento.',
        timestamp: new Date(),
        diagnostic: simulationResult,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errMessage: TestChatMessage = {
        id: `ai_err_${Date.now()}`,
        role: 'model',
        text: `Erro na simulação do agente: ${err?.message || 'Falha de comunicação com o modelo.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsGenerating(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleNewConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: 'Nova conversa iniciada. O contexto anterior foi reiniciado. Como posso te ajudar?',
        timestamp: new Date(),
      },
    ]);
    setSelectedDiagnostic(null);
    toast.info('Sessão de testes reiniciada.');
  };

  const handleRateMessage = (messageId: string, rating: 'correct' | 'incorrect') => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          return { ...m, rating };
        }
        return m;
      })
    );
    if (rating === 'incorrect') {
      setFeedbackInputId(messageId);
      setFeedbackComment('');
    } else {
      setFeedbackInputId(null);
      toast.success('Resposta avaliada como correta!');
    }
  };

  const handleSaveFeedbackComment = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          return { ...m, ratingComment: feedbackComment.trim() };
        }
        return m;
      })
    );
    setFeedbackInputId(null);
    toast.success('Comentário de avaliação registrado!');
  };

  const handleSaveTestCase = () => {
    const userTurnsCount = messages.filter((m) => m.role === 'user').length;
    if (userTurnsCount === 0) {
      toast.warning('Envie ao menos uma mensagem para salvar um caso de teste.');
      return;
    }

    try {
      const testCasesKey = 'morante_ai_saved_test_cases';
      const existing = JSON.parse(localStorage.getItem(testCasesKey) || '[]');
      const newCase = {
        id: `tc_${Date.now()}`,
        date: new Date().toISOString(),
        title: messages.find((m) => m.role === 'user')?.text.slice(0, 50) || 'Caso de Teste',
        turns: messages,
      };
      localStorage.setItem(testCasesKey, JSON.stringify([newCase, ...existing]));
      toast.success('Caso de teste salvo com sucesso para regressão futura!');
    } catch {
      toast.info('Caso de teste registrado nesta sessão.');
    }
  };

  return {
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
  };
}
