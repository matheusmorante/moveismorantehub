import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { aiService } from '@/pages/utils/aiService';
import { attendanceService } from '@/pages/utils/attendanceService';
import { crmIntelligenceService } from '@/pages/utils/crmIntelligenceService';
import { useAuth } from '@/context/AuthContext';
import { AttendanceLog } from '@/pages/types/attendance.type';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { attendanceVoiceFormSchema } from '../../../shared-utils/messagingFormSchemas';
import { withTimeout } from '../../../shared-utils/withTimeout';

export const useAttendanceVoice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { validateAndRun: validateAttendance } = useZodForm(attendanceVoiceFormSchema, { text: transcript, customerPhone: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');
  const [saveUncertain, setSaveUncertain] = useState(false);
  const uncertainRef = useRef(false);
  const activeRef = useRef(true);
  const [suggestedAction, setSuggestedAction] = useState<{
    type: string;
    data: any;
    label: string;
  } | null>(null);
  const { profile } = useAuth();
  const context = useRef({ profileId: profile?.id, generation: 0 });
  if (context.current.profileId !== profile?.id) context.current = { profileId: profile?.id, generation: context.current.generation + 1 };
  const inFlight = useRef(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    activeRef.current = true;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        if (currentTranscript && !inFlight.current && activeRef.current) {
          setTranscript((prev) => (prev + ' ' + currentTranscript).trim());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsRecording(false);
        toast.error('Erro ao capturar voz.');
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
    return () => {
      activeRef.current = false;
      recognitionRef.current?.abort?.();
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (inFlight.current || uncertainRef.current) return;
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activeRef.current || inFlight.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      recognitionRef.current.start();
      toast.info('Gravando... Fale agora.');
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      toast.error('Erro ao acessar microfone.');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    toast.info('Gravação pausada.');
  }, []);

  const clearTranscript = useCallback(() => {
    if (inFlight.current || uncertainRef.current) return;
    setTranscript('');
    setSuggestedAction(null);
    toast.info('Transcrição limpa.');
  }, []);

  const processAttendance = useCallback(
    async (customerPhone: string, text = transcript) => {
      if (uncertainRef.current || !activeRef.current || inFlight.current) return false;
      inFlight.current = true;
      const generation = context.current.generation;
      const isCurrent = () => activeRef.current && context.current.generation === generation;
      setIsProcessing(true);
      pauseRecording();
      try { return await validateAttendance({ text, customerPhone }, async ({ text: transcript, customerPhone }) => {
      if (uncertainRef.current || !activeRef.current) return false;
      setProcessError('');
      setIsProcessing(true);
      setSuggestedAction(null);
      let structuredData = {};
      let nextSuggestion: typeof suggestedAction = null;

      try {
        const phoneDigits = customerPhone.replace(/\D/g, '');
        if (phoneDigits.length >= 10) {
          const intelligence = await withTimeout(crmIntelligenceService.analyzeCustomerIntent(
            customerPhone,
            transcript
          ), 30_000, null, 'atendimento:analisar-cliente');
          if (!isCurrent()) return false;
          if (!intelligence) throw new Error('Análise do cliente indisponível.');
          if (intelligence) {
            structuredData = {
              ...intelligence,
              product:
                intelligence.matched_product?.name || intelligence.extracted_data?.product_name,
              reason: intelligence.summary,
              next_step:
                intelligence.intent === 'ASSISTANCE'
                  ? `Abrir assistência para: ${intelligence.matched_product?.name}`
                  : intelligence.summary,
            };

            if (intelligence.intent === 'ASSISTANCE' && intelligence.matched_product) {
              nextSuggestion = {
                type: 'ASSISTANCE',
                data: intelligence,
                label: `Agendar Assistência: ${intelligence.matched_product.name}`,
              };
            } else if (intelligence.intent === 'DESIRE') {
              nextSuggestion = {
                type: 'DESIRE',
                data: intelligence.extracted_data,
                label: `Registrar Desejo: ${intelligence.extracted_data.product_name}`,
              };
            }
          }
        } else {
          const prompt = `Analise este relato de atendimento de um vendedor de móveis para extrair BI estratégico.
                RELATO: "${transcript}"
                
                Responda APENAS um objeto JSON com estes campos (use "Não informado" se não souber):
                {
                    "customer_name": "Nome do cliente",
                    "product": "Produto de interesse",
                    "closed_sale": boolean (se a venda foi fechada),
                    "lost_reason": "Motivo da não venda (Preço, Prazo, Modelo, etc)",
                    "positive_points": ["lista de elogios"],
                    "negative_points": ["lista de críticas/pontos negativos"],
                    "main_objection": "Por que o cliente não comprou?",
                    "sentiment": "Sentimento (Positivo, Negativo, Neutro)",
                    "priority": "Nível de interesse (Quente, Morno, Frio)",
                    "next_step": "Ação recomendada para o vendedor"
                }`;

          const aiResponse = await withTimeout(aiService.chat(
            prompt,
            'Você é um analista de BI especializado em varejo de móveis.'
          ), 30_000, null, 'atendimento:analisar-relato');
          if (!isCurrent()) return false;
          if (!aiResponse) throw new Error('Análise do relato indisponível.');
          let cleanJson = aiResponse.answer.trim();

          // Extract JSON if AI wrapped it in markdown
          const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
          if (jsonMatch) cleanJson = jsonMatch[0];

          structuredData = JSON.parse(cleanJson);
        }
      } catch (error) {
        console.error('Erro no processamento da IA:', error);
        toast.warn('IA falhou, salvando relato bruto.');
      }

      let audioUrl = '';
      try {
        if (!isCurrent()) return false;
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const uploadedUrl = await withTimeout(attendanceService.uploadAudio(audioBlob), 20_000, null, 'atendimento:audio');
          if (uploadedUrl) audioUrl = uploadedUrl;
        }
      } catch (audioErr) {
        console.error('Erro ao fazer upload do áudio:', audioErr);
      }

      try {
        if (!isCurrent()) return false;
        const log: AttendanceLog = {
          date: new Date().toISOString(),
          salesperson_name: profile?.full_name || 'Vendedor',
          customer_phone: customerPhone || undefined,
          transcript: transcript,
          audio_url: audioUrl || undefined,
          structured_data: structuredData as any,
        };

        const saved = await withTimeout(attendanceService.saveLog(log), 20_000, null, 'atendimento:salvar');
        if (!saved?.id) {
          uncertainRef.current = true;
          if (activeRef.current) {
            setSaveUncertain(true);
            setProcessError('Não foi possível confirmar o registro. Confira os atendimentos antes de repetir.');
          }
          return { success: false, uncertain: true };
        }
        if (!isCurrent()) return false;
        setSuggestedAction(nextSuggestion);
        toast.success('Atendimento registrado com sucesso! ✨');

        return { success: true, suggestedAction: nextSuggestion };
      } catch (saveError) {
        console.error('Erro fatal ao salvar atendimento:', saveError);
        toast.error('Erro crítico ao salvar no banco.');
        // A rejected request can still have reached persistence. Do not repeat a log blindly.
        uncertainRef.current = true;
        if (activeRef.current) {
          setSaveUncertain(true);
          setProcessError('Não foi possível confirmar o registro. Confira os atendimentos antes de repetir. O relato foi preservado.');
        }
        return { success: false };
      } finally {
        if (activeRef.current) setIsProcessing(false);
      }
      }, (errors) => {
        const message = Object.values(flattenFormErrors(errors))[0];
        setProcessError(message);
        toast.warn(message);
      });
      } finally { inFlight.current = false; if (activeRef.current) setIsProcessing(false); }
    },
    [transcript, profile, validateAttendance, pauseRecording]
  );

  return {
    isRecording,
    transcript,
    setTranscript,
    isProcessing,
    processError,
    saveUncertain,
    suggestedAction,
    setSuggestedAction,
    startRecording,
    pauseRecording,
    clearTranscript,
    processAttendance,
  };
};
