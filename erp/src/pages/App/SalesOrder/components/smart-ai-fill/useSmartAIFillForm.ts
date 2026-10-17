import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { aiService } from '@/pages/utils/aiService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { assistedOrderFormSchema, textPromptFormSchema } from '../../../../../../../shared-utils/assistedFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { SmartAIFillModalProps, SmartAIFillParsedResult, SmartAIFillTab } from './types';

export const useSmartAIFillForm = ({
  isOpen,
  onClose,
  onApplyData,
  contextKey = 'new',
  sellerList = [],
}: SmartAIFillModalProps) => {
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [applyBlocked, setApplyBlocked] = useState(false);
  const [lastParsedResult, setLastParsedResult] = useState<SmartAIFillParsedResult | null>(null);
  const [activeTab, setActiveTab] = useState<SmartAIFillTab>('ai');
  const [manualJSON, setManualJSON] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');

  const promptForm = useZodForm(textPromptFormSchema, { text: `${promptText} ${liveTranscript}` });
  const jsonForm = useZodForm(textPromptFormSchema, { text: manualJSON });
  const dataForm = useZodForm(assistedOrderFormSchema, {});

  const recognitionRef = useRef<any>(null);
  const readerRef = useRef<FileReader | null>(null);
  const actionRef = useRef<symbol | null>(null);
  const blockedContexts = useRef(new Set<string>());
  const contextRef = useRef({ isOpen, contextKey, sellerKey: JSON.stringify(sellerList), version: 0 });
  const sellerKey = JSON.stringify(sellerList);

  if (
    contextRef.current.isOpen !== isOpen ||
    contextRef.current.contextKey !== contextKey ||
    contextRef.current.sellerKey !== sellerKey
  ) {
    contextRef.current = { isOpen, contextKey, sellerKey, version: contextRef.current.version + 1 };
  }

  useEffect(() => {
    actionRef.current = null;
    setBusy(false);
    setIsProcessingAI(false);
    setSubmitError('');
    setLastParsedResult(null);
    setPromptText('');
    setManualJSON('');
    setLiveTranscript('');
    setIsListening(false);
    setApplyBlocked(blockedContexts.current.has(contextKey));
    readerRef.current?.abort();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
  }, [isOpen, contextKey]);

  useEffect(() => () => {
    contextRef.current.isOpen = false;
    actionRef.current = null;
    readerRef.current?.abort();
  }, []);

  useEffect(() => {
    setLastParsedResult(null);
    setIsListening(false);
    setLiveTranscript('');
  }, [sellerKey]);

  const showError = (message: string) => {
    setSubmitError(message);
    toast.error(message);
  };

  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    showError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados informados.');

  const runAction = async (
    processing: boolean,
    operation: (current: () => boolean) => Promise<unknown>
  ) => {
    if (actionRef.current || !isOpen || applyBlocked || blockedContexts.current.has(contextKey)) return;
    const action = Symbol();
    const version = contextRef.current.version;
    actionRef.current = action;
    const current = () =>
      contextRef.current.isOpen && contextRef.current.version === version && actionRef.current === action;
    setBusy(true);
    setIsProcessingAI(processing);
    setSubmitError('');
    try {
      await operation(current);
    } catch (error: unknown) {
      if (current()) showError(error instanceof Error ? error.message : 'Não foi possível concluir o preenchimento.');
    } finally {
      if (actionRef.current === action) {
        actionRef.current = null;
        setBusy(false);
        setIsProcessingAI(false);
      }
    }
  };

  const applyData = async (data: unknown, current: () => boolean) =>
    dataForm.validateAndRun(
      data as never,
      async (values) => {
        if (!current()) return;
        const timeout = Symbol('timeout');
        blockedContexts.current.add(contextKey);
        let receipt: void | boolean | symbol;
        try {
          receipt = await withTimeout<void | boolean | symbol>(
            Promise.resolve(onApplyData(values)),
            30_000,
            timeout,
            'aplicação do pedido assistido'
          );
        } catch (error) {
          blockedContexts.current.delete(contextKey);
          throw error;
        }
        if (receipt !== timeout) blockedContexts.current.delete(contextKey);
        if (!current()) return;
        if (receipt === timeout) {
          setApplyBlocked(true);
          throw new Error('A aplicação demorou além do esperado. Confira o pedido antes de tentar novamente.');
        }
        if (receipt === false) {
          throw new Error('O pedido não confirmou a aplicação dos dados. Confira o formulário.');
        }
        setApplyBlocked(true);
        const closed = await withTimeout(
          Promise.resolve(onClose()).then(() => true),
          15_000,
          false,
          'fechamento do preenchimento assistido'
        );
        if (current() && !closed) throw new Error('Dados aplicados. Feche esta janela para conferir o pedido.');
      },
      (errors) => {
        if (current()) invalid(errors);
      }
    );

  // Inicialização da Web Speech API para Transcrição de Áudio ao Vivo
  useEffect(() => {
    if (!isOpen) return;
    const version = contextRef.current.version;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        if (
          !contextRef.current.isOpen ||
          contextRef.current.version !== version ||
          actionRef.current ||
          blockedContexts.current.has(contextRef.current.contextKey)
        )
          return;
        setLastParsedResult(null);
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }

        if (currentFinal) {
          setPromptText((prev) => {
            const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + spacer + currentFinal;
          });
        }
        setLiveTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        if (!contextRef.current.isOpen || contextRef.current.version !== version) return;
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          toast.warn(
            `Microfone: ${event.error === 'not-allowed' ? 'Permissão de microfone negada no navegador' : event.error}`
          );
        }
      };

      recognition.onend = () => {
        if (!contextRef.current.isOpen || contextRef.current.version !== version) return;
        setIsListening(false);
        setLiveTranscript('');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [isOpen, contextKey, sellerKey]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.warn(
        'Seu navegador não suporta reconhecimento de voz nativo. Use o Google Chrome ou digite/cole o texto no campo.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setLiveTranscript('');
      toast.info('Gravação de áudio pausada.');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Ouvindo! Pode ditar os dados do pedido...');
      } catch (err: any) {
        console.error('Erro ao iniciar reconhecimento:', err);
        setIsListening(false);
      }
    }
  };

  const handleGenerateAI = () =>
    runAction(true, async (current) => {
      const fullText = promptText + (liveTranscript ? ` ${liveTranscript}` : '');
      await promptForm.validateAndRun(
        { text: fullText },
        async (values) => {
          if (!current()) return;
          try {
            recognitionRef.current?.stop();
          } catch {
            /* already stopped */
          }
          setIsListening(false);
          const result = await withTimeout<Awaited<ReturnType<typeof aiService.parseOrderFreeText>> | null>(
            aiService.parseOrderFreeText(values.text, sellerList),
            45_000,
            null,
            'análise do pedido assistido'
          );
          if (!current()) return;
          if (!result) throw new Error('A análise demorou além do esperado. Tente novamente.');
          await dataForm.validateAndRun(
            result.rawJSON,
            (parsed) => {
              if (!current()) return;
              setLastParsedResult({ ...result, rawJSON: parsed });
              toast.success('Pedido analisado com sucesso pela IA Gemini!');
            },
            (errors) => {
              if (current()) invalid(errors);
            }
          );
        },
        (errors) => {
          if (current()) invalid(errors);
        }
      );
    });

  const handleConfirmApply = () =>
    runAction(false, async (current) => {
      await applyData(lastParsedResult?.rawJSON, current);
    });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void runAction(false, async (current) => {
      const reader = new FileReader();
      readerRef.current = reader;
      try {
        const content = await withTimeout<string | null>(
          new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Não foi possível ler o arquivo JSON.'));
            reader.onabort = () => reject(new Error('Leitura do arquivo interrompida.'));
            reader.readAsText(file);
          }),
          10_000,
          null,
          'leitura do pedido JSON'
        );
        if (!current()) return;
        if (content === null) throw new Error('A leitura do arquivo demorou além do esperado.');
        await jsonForm.validateAndRun(
          { text: content },
          async (values) => {
            if (current()) await applyData(JSON.parse(values.text), current);
          },
          (errors) => {
            if (current()) invalid(errors);
          }
        );
      } finally {
        if (reader.readyState === FileReader.LOADING) reader.abort();
        if (readerRef.current === reader) readerRef.current = null;
      }
    });
  };

  const handleProcessManualJSON = () =>
    runAction(false, async (current) => {
      await jsonForm.validateAndRun(
        { text: manualJSON },
        async (values) => {
          if (current()) await applyData(JSON.parse(values.text), current);
        },
        (errors) => {
          if (current()) invalid(errors);
        }
      );
    });

  const closeModal = async () => {
    if (actionRef.current) return;
    try {
      await onClose();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Não foi possível fechar a janela.');
    }
  };

  const clearPrompt = () => {
    setPromptText('');
    setLiveTranscript('');
    setLastParsedResult(null);
  };

  return {
    promptText,
    setPromptText,
    liveTranscript,
    isListening,
    isProcessingAI,
    busy,
    submitError,
    applyBlocked,
    lastParsedResult,
    setLastParsedResult,
    activeTab,
    setActiveTab,
    manualJSON,
    setManualJSON,
    toggleListening,
    handleGenerateAI,
    handleConfirmApply,
    handleFileUpload,
    handleProcessManualJSON,
    closeModal,
    clearPrompt,
  };
};
