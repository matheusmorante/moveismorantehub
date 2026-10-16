import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { parseReceiptWithAI, ReceiptAIResult } from '@/pages/utils/receiptAiService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { assistedReceiptFormSchema, textPromptFormSchema } from '../../../../../../../shared-utils/assistedFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

export interface ReceiptAIFillModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onApply: (result: ReceiptAIResult) => Promise<void>;
}

// Definição tipada segura para SpeechRecognition do navegador
interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

/**
 * Modal com inteligência artificial para interpretação de texto e fala em recebimentos.
 */
export const ReceiptAIFillModal: React.FC<ReceiptAIFillModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [applicationUncertain, setApplicationUncertain] = useState(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const contextRef = useRef({ isOpen, onApply, onClose, generation: 0 });
  const previousContext = contextRef.current;
  contextRef.current = {
    isOpen, onApply, onClose,
    generation: previousContext.generation + Number(previousContext.isOpen !== isOpen || previousContext.onApply !== onApply),
  };
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const promptForm = useZodForm(textPromptFormSchema, { text });
  const resultForm = useZodForm(assistedReceiptFormSchema, { items: [], warnings: [] });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const close = useCallback(() => {
    if (!busyRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const globalWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const Recognition = globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    try {
      const instance = new Recognition();
      instance.lang = 'pt-BR';
      instance.continuous = true;
      instance.interimResults = false;

      instance.onresult = (event: ISpeechRecognitionEvent) => {
        if (busyRef.current || !contextRef.current.isOpen || !mountedRef.current) return;
        const transcripts: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const resultItem = event.results[i];
          if (resultItem && resultItem[0]) {
            transcripts.push(resultItem[0].transcript);
          }
        }
        const speechText = transcripts.join(' ');
        setText((current) => `${current} ${speechText}`.trim());
      };

      instance.onend = () => setListening(false);
      instance.onerror = () => setListening(false);
      recognitionRef.current = instance;

      return () => {
        instance.onresult = null;
        instance.onend = null;
        instance.onerror = null;
        instance.stop();
        recognitionRef.current = null;
      };
    } catch {
      // Navegadores sem suporte silenciosamente ignorados
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const toggleVoice = useCallback(() => {
    if (busyRef.current) return;
    if (!recognitionRef.current) {
      toast.warn('Use o Chrome ou digite o texto: este navegador não oferece transcrição por voz.');
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  const analyze = async () => {
    if (busyRef.current || applicationUncertain) return;
    busyRef.current = true;
    const context = contextRef.current;
    const isCurrent = () => mountedRef.current && contextRef.current.isOpen
      && contextRef.current.generation === context.generation;
    const showError = (message: string) => {
      if (!isCurrent()) return;
      setErrorMessage(message);
      toast.error(message);
    };
    setErrorMessage('');
    setLoading(true);
    recognitionRef.current?.stop();
    setListening(false);
    try {
      await promptForm.validateAndRun({ text }, async (input) => {
        if (!isCurrent()) return;
        const parsed = await withTimeout(parseReceiptWithAI(input.text), 30_000, null, 'Interpretação do recebimento');
        if (!isCurrent()) return;
        if (parsed === null) throw new Error('A interpretação demorou demais. Tente novamente.');
        await resultForm.validateAndRun(parsed, async (values) => {
          if (!isCurrent()) return;
          setApplying(true);
          const applied = await withTimeout(Promise.resolve(context.onApply(values)).then(() => true), 30_000, false, 'Aplicação do recebimento assistido');
          if (!mountedRef.current) return;
          if (!applied) {
            setApplicationUncertain(true);
            showError('A aplicação não foi confirmada. Confira o recebimento antes de repetir o preenchimento.');
            return;
          }
          if (isCurrent()) contextRef.current.onClose();
        }, (errors) => showError(Object.values(flattenFormErrors(errors))[0] || 'Revise os itens interpretados.'));
      }, (errors) => showError(Object.values(flattenFormErrors(errors))[0] || 'Informe o texto para continuar.'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao preencher com IA.';
      showError(message);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setApplying(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-fill-title"
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Fechar janela de preenchimento com IA"
        onClick={close}
        disabled={loading}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full"
      />
      <section className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3
              id="ai-fill-title"
              className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center"
            >
              <i className="bi bi-stars mr-2 text-violet-600" aria-hidden="true" />
              Preencher com IA
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Diga fornecedor/fábrica, produto, modelo, cor/variação, quantidade e custo base. IPI e
              frete aceitam % ou R$.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={loading}
            aria-label="Fechar janela"
            className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <i className="bi bi-exclamation-triangle-fill mr-2" aria-hidden="true" />O
          fornecedor/fábrica é obrigatório para evitar produtos iguais de fabricantes diferentes.
        </div>

        <textarea
          value={text}
          disabled={loading || applicationUncertain}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? 'receipt-ai-error' : undefined}
          aria-label="Texto descritivo do recebimento para inteligência artificial"
          onChange={(event) => setText(event.target.value)}
          placeholder="Ex.: Recebi da Fábrica Alfa 4 cadeiras Roma cor preta, custo base 120 reais cada; IPI 5% e frete R$ 80."
          className="mt-4 min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />

        {errorMessage && <p id="receipt-ai-error" role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{errorMessage}</p>}
        {loading && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300"><i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />{applying ? 'Aplicando os dados ao recebimento...' : 'Interpretando os dados do recebimento...'}</p>}

        <div className="mt-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={toggleVoice}
            disabled={loading || applicationUncertain}
            className={`rounded-xl px-4 py-3 text-xs font-black uppercase transition-colors cursor-pointer ${
              listening
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-300'
            }`}
          >
            <i className={`bi ${listening ? 'bi-stop-fill' : 'bi-mic-fill'} mr-2`} />
            {listening ? 'Parar áudio' : 'Falar'}
          </button>

          <button
            type="button"
            disabled={loading || applicationUncertain}
            onClick={analyze}
            className="rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
          >
            {loading ? 'Interpretando...' : 'Interpretar e preencher'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ReceiptAIFillModal;
