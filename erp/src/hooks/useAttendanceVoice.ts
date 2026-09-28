import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { aiService } from '@/pages/utils/aiService';
import { attendanceService } from '@/pages/utils/attendanceService';
import { crmIntelligenceService } from '@/pages/utils/crmIntelligenceService';
import { useAuth } from '@/context/AuthContext';
import { AttendanceLog } from '@/pages/types/attendance.type';

export const useAttendanceVoice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState<{
    type: string;
    data: any;
    label: string;
  } | null>(null);
  const { profile } = useAuth();

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
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
        if (currentTranscript) {
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
  }, []);

  const startRecording = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    setTranscript('');
    setSuggestedAction(null);
    toast.info('Transcrição limpa.');
  }, []);

  const processAttendance = useCallback(
    async (customerPhone: string) => {
      if (!transcript.trim()) {
        toast.warn('Nenhum relato capturado.');
        return;
      }

      setIsProcessing(true);
      let structuredData = {};

      try {
        const phoneDigits = customerPhone.replace(/\D/g, '');
        if (phoneDigits.length >= 10) {
          const intelligence = await crmIntelligenceService.analyzeCustomerIntent(
            customerPhone,
            transcript
          );
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
              setSuggestedAction({
                type: 'ASSISTANCE',
                data: intelligence,
                label: `Agendar Assistência: ${intelligence.matched_product.name}`,
              });
            } else if (intelligence.intent === 'DESIRE') {
              setSuggestedAction({
                type: 'DESIRE',
                data: intelligence.extracted_data,
                label: `Registrar Desejo: ${intelligence.extracted_data.product_name}`,
              });
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

          const aiResponse = await aiService.chat(
            prompt,
            'Você é um analista de BI especializado em varejo de móveis.'
          );
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
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const uploadedUrl = await attendanceService.uploadAudio(audioBlob);
          if (uploadedUrl) audioUrl = uploadedUrl;
        }
      } catch (audioErr) {
        console.error('Erro ao fazer upload do áudio:', audioErr);
      }

      try {
        const log: AttendanceLog = {
          date: new Date().toISOString(),
          salesperson_name: profile?.full_name || 'Vendedor',
          customer_phone: customerPhone || undefined,
          transcript: transcript,
          audio_url: audioUrl || undefined,
          structured_data: structuredData as any,
        };

        await attendanceService.saveLog(log);
        toast.success('Atendimento registrado com sucesso! ✨');

        return { success: true, suggestedAction };
      } catch (saveError) {
        console.error('Erro fatal ao salvar atendimento:', saveError);
        toast.error('Erro crítico ao salvar no banco.');
        return { success: false };
      } finally {
        setIsProcessing(false);
      }
    },
    [transcript, profile, suggestedAction]
  );

  return {
    isRecording,
    transcript,
    setTranscript,
    isProcessing,
    suggestedAction,
    setSuggestedAction,
    startRecording,
    pauseRecording,
    clearTranscript,
    processAttendance,
  };
};
