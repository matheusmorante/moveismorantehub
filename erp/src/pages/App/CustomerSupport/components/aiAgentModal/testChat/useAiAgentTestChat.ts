import { useState, useRef, useEffect, useCallback } from 'react';
import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import type {
  AiSituationRule,
  AiKnowledgeArticle,
  AiWorkflowConfig,
} from '../../../../../../../../shared-utils/whatsappAiAgentSchemas';
import {
  simulateWhatsAppAiTurn,
  createSimulatorOpenAiFetch,
  type SimulationTurnResult,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settings';
import type { TestChatMessage } from './TestChatMessageBubble';

const testMessageSchema = z.object({
  message: z.string().trim().min(1, 'Digite uma mensagem para enviar.'),
});
const feedbackSchema = z.object({
  comment: z.string().trim().min(1, 'Descreva a falha antes de salvar.'),
});

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

  const messageForm = useForm<z.infer<typeof testMessageSchema>>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: { message: '' },
  });
  const { field: messageField, fieldState: messageFieldState } = useController({
    control: messageForm.control,
    name: 'message',
  });
  const messageInputRef = messageField.ref;
  const feedbackForm = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { comment: '' },
  });
  const { field: feedbackField, fieldState: feedbackFieldState } = useController({
    control: feedbackForm.control,
    name: 'comment',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<SimulationTurnResult | null>(null);
  const [feedbackInputId, setFeedbackInputId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sending = useRef(false);
  const setInputRef = useCallback((element: HTMLInputElement | null) => {
    inputRef.current = element;
    messageInputRef(element);
  }, [messageInputRef]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSendMessage = (textToSend?: string) => {
    if (isGenerating || sending.current) return;
    if (textToSend !== undefined) messageForm.setValue('message', textToSend);
    sending.current = true;
    void messageForm.handleSubmit(async ({ message: text }) => {
      const userMessageId = `usr_${Date.now()}`;
      const newUserMessage: TestChatMessage = {
        id: userMessageId,
        role: 'user',
        text,
        timestamp: new Date(),
      };

      const nextMessages = [...messages, newUserMessage];
      setMessages(nextMessages);
      messageForm.reset({ message: '' });
      setIsGenerating(true);

      try {
        const currentSettings = getSettings();
        const historyTurns = nextMessages
          .filter((m) => m.id !== 'welcome-msg')
          .map((m) => ({ role: m.role, text: m.text }));

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
          { fetchOpenAi: createSimulatorOpenAiFetch(supabase) },
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
    })().finally(() => { sending.current = false; });
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
      feedbackForm.reset({ comment: '' });
    } else {
      setFeedbackInputId(null);
      toast.success('Resposta avaliada como correta!');
    }
  };

  const handleSaveFeedbackComment = (messageId: string) => {
    void feedbackForm.handleSubmit(({ comment }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, ratingComment: comment } : m)
      );
      setFeedbackInputId(null);
      toast.success('Comentário de avaliação registrado!');
    })();
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
    inputText: messageField.value,
    setInputText: messageField.onChange,
    messageError: messageFieldState.error?.message,
    isGenerating,
    selectedDiagnostic,
    setSelectedDiagnostic,
    feedbackInputId,
    feedbackComment: feedbackField.value,
    setFeedbackComment: feedbackField.onChange,
    feedbackInputRef: feedbackField.ref,
    feedbackError: feedbackFieldState.error?.message,
    chatContainerRef,
    inputRef: setInputRef,
    handleSendMessage,
    handleRateMessage,
    handleSaveFeedbackComment,
    handleSaveTestCase,
  };
}
