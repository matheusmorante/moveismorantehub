import { useState, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';
import { generateDeliveryAISummary } from '../../../services/aiSummaryService';
import { speakWithNavigationVoice } from '../../../services/navigationVoiceService';

import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { isDateInPeriod } from '../../../utils/orderUtils';

export const useAISummary = (rawOrders: any[] = []) => {
  const [aiSummaryTab, setAiSummaryTab] = useState<'today' | 'tomorrow'>('today');
  const [hasTodayDeliveries, setHasTodayDeliveries] = useState<boolean>(true);
  const [aiSummaryToday, setAiSummaryToday] = useState<string>('');
  const [aiSummaryTomorrow, setAiSummaryTomorrow] = useState<string>('');
  const [isGeneratingAISummary, setIsGeneratingAISummary] = useState(false);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);
  const [speechIsPaused, setSpeechIsPaused] = useState(false);
  const [speechCurrentTime, setSpeechCurrentTime] = useState(0);
  const [speechTotalDuration, setSpeechTotalDuration] = useState(0);
  const speechIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (rawOrders.length > 0) {
      const todayOrders = rawOrders.filter(o => {
        const isExplicitlyPending = (
          o.status?.toLowerCase() === 'pending' || 
          o.order_data?.status?.toLowerCase() === 'pending'
        );
        if (isExplicitlyPending) return false;
        const rawSchedDate = getOperationalScheduleDate(o);
        if (!rawSchedDate || rawSchedDate === 'sem_data') return false;
        return isDateInPeriod(rawSchedDate, 'today');
      });
      const hasToday = todayOrders.length > 0;
      setHasTodayDeliveries(hasToday);
      if (!hasToday) setAiSummaryTab('tomorrow');

      generateDeliveryAISummary('today', true, setAiSummaryToday, setAiSummaryTomorrow, setIsGeneratingAISummary, rawOrders);
      generateDeliveryAISummary('tomorrow', false, setAiSummaryToday, setAiSummaryTomorrow, setIsGeneratingAISummary, rawOrders);
    }
  }, [rawOrders]);

  const stopSpeechTimer = () => {
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
  };

  const formatAudioTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  };

  const handleToggleSpeech = (text: string) => {
    if (!text) return;

    if (isSpeakingSummary) {
      Speech.stop();
      stopSpeechTimer();
      setIsSpeakingSummary(false);
      setSpeechIsPaused(false);
      setSpeechCurrentTime(0);
      return;
    }

    const words = text.split(/\s+/).length;
    const estimatedSecs = Math.max(5, Math.ceil(words / 2.3));
    setSpeechTotalDuration(estimatedSecs);
    setSpeechCurrentTime(0);
    setIsSpeakingSummary(true);
    setSpeechIsPaused(false);

    void speakWithNavigationVoice(text, {
      language: 'pt-BR',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => {
        setIsSpeakingSummary(false);
        setSpeechIsPaused(false);
        stopSpeechTimer();
        setSpeechCurrentTime(0);
      },
      onStopped: () => {
        setIsSpeakingSummary(false);
        setSpeechIsPaused(false);
        stopSpeechTimer();
        setSpeechCurrentTime(0);
      },
      onError: () => {
        setIsSpeakingSummary(false);
        setSpeechIsPaused(false);
        stopSpeechTimer();
        setSpeechCurrentTime(0);
      }
    });

    stopSpeechTimer();
    speechIntervalRef.current = setInterval(() => {
      setSpeechCurrentTime(prev => {
        if (prev >= estimatedSecs) {
          stopSpeechTimer();
          return estimatedSecs;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const finishSeekToPosition = (targetSecs: number, fullText: string) => {
    Speech.stop();
    stopSpeechTimer();
    setSpeechCurrentTime(targetSecs);

    const words = fullText.split(/\s+/);
    const fraction = targetSecs / (speechTotalDuration || 1);
    const startWordIndex = Math.floor(fraction * words.length);
    const remainingText = words.slice(startWordIndex).join(' ');

    if (!remainingText.trim()) {
      setIsSpeakingSummary(false);
      return;
    }

    setIsSpeakingSummary(true);
    setSpeechIsPaused(false);

    void speakWithNavigationVoice(remainingText, {
      language: 'pt-BR',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => {
        setIsSpeakingSummary(false);
        setSpeechIsPaused(false);
        stopSpeechTimer();
        setSpeechCurrentTime(0);
      },
      onStopped: () => {
        setIsSpeakingSummary(false);
        setSpeechIsPaused(false);
        stopSpeechTimer();
      },
      onError: () => {
        setIsSpeakingSummary(false);
        setSpeechIsPaused(false);
        stopSpeechTimer();
      }
    });

    speechIntervalRef.current = setInterval(() => {
      setSpeechCurrentTime(prev => {
        if (prev >= speechTotalDuration) {
          stopSpeechTimer();
          return speechTotalDuration;
        }
        return prev + 1;
      });
    }, 1000);
  };

  return {
    aiSummaryTab,
    setAiSummaryTab,
    hasTodayDeliveries,
    aiSummaryToday,
    aiSummaryTomorrow,
    isGeneratingAISummary,
    isSpeakingSummary,
    speechIsPaused,
    speechCurrentTime,
    speechTotalDuration,
    formatAudioTime,
    handleToggleSpeech,
    finishSeekToPosition
  };
};
