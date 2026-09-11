import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Alert } from 'react-native';
import { Truck, FileText, ChevronRight } from 'lucide-react-native';
import { generateDeliveryAISummary } from '../../../services/aiSummaryService';
import { playSummaryAudio, stopGeminiAudio, pauseGeminiAudio, resumeGeminiAudio, seekGeminiAudio } from '../../../services/geminiAudioService';
import { getLocalDateString } from '../../../utils/orderUtils';
import { calculateDeliverySummaryMetrics, type DeliveryPeriodFilter } from '../utils/deliverySummaryMetrics';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { AISummaryAudioPlayer } from '../../dashboard/components/AISummaryAudioPlayer';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { DeliveryShiftMetricsGrid } from './DeliveryShiftMetricsGrid';
import { DeliverySummaryControlsBar } from './DeliverySummaryControlsBar';

export type VoiceEngineType = 'gemini' | 'native';

interface OrderItem {
  id: string;
  order_number?: string;
  orderIndex?: string;
  customer_name?: string;
  client_name?: string;
  delivery_date?: string;
  scheduled_date?: string;
  status?: string;
  items?: any[];
  order_items?: any[];
  shipping?: any;
}

interface TodaySummaryCardProps {
  orders: OrderItem[];
  onSelectOrder?: (order: any) => void;
  isDarkMode?: boolean;
}

export const TodaySummaryCard: React.FC<TodaySummaryCardProps> = ({
  orders,
  isDarkMode = false,
}) => {
  const [periodFilter, setPeriodFilter] = useState<DeliveryPeriodFilter>('today');
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineType>('gemini');
  const [isGeminiQuotaExceeded] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const [aiSummaryText, setAiSummaryText] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(true);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [fallbackOrders, setFallbackOrders] = useState<any[]>([]);

  const effectiveOrdersRef = useRef<any[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    return () => {
      stopGeminiAudio();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const todayStr = getLocalDateString(new Date());
    const hasFuture = (orders || []).some((o) => {
      const d = getOperationalScheduleDate(o);
      return d && d > todayStr;
    });

    if (!orders || orders.length === 0 || !hasFuture) {
      offlineStorageService.getWorkingSet<any[]>('logistics_orders').then((cached) => {
        if (!alive) return;
        if (cached?.data && cached.data.length > 0) {
          setFallbackOrders(cached.data);
        } else {
          supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (alive && data && data.length > 0) setFallbackOrders(data);
            });
        }
      });
    }

    return () => {
      alive = false;
    };
  }, [orders]);

  const effectiveOrders = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const hasFuture = (orders || []).some((o) => {
      const d = getOperationalScheduleDate(o);
      return d && d > todayStr;
    });

    if (hasFuture && orders && orders.length > 0) {
      return orders;
    }
    return fallbackOrders.length > 0 ? fallbackOrders : (orders || []);
  }, [orders, fallbackOrders]);

  useEffect(() => {
    effectiveOrdersRef.current = effectiveOrders;
  });

  const ordersFingerprint = useMemo(() => {
    return (effectiveOrders || [])
      .map(o => `${o.id}_${o.status || o.order_data?.status || ''}_${getOperationalScheduleDate(o)}`)
      .join('|');
  }, [effectiveOrders]);

  useEffect(() => {
    stopGeminiAudio();
    setIsPlayingAudio(false);
    setIsPaused(false);
    setCurrentTime(0);
    setTotalDuration(0);
  }, [periodFilter]);

  const {
    totalCount,
    morningCount,
    afternoonCount,
    defaultSummaryText,
  } = useMemo(
    () => calculateDeliverySummaryMetrics(effectiveOrders, periodFilter),
    [effectiveOrders, periodFilter]
  );

  const activeSummaryText = aiSummaryText || defaultSummaryText;

  useEffect(() => {
    let isMounted = true;
    const mode = periodFilter === 'today' ? 'today' : 'next_days';

    setIsGeneratingSummary(true);

    generateDeliveryAISummary(
      mode,
      false,
      (text) => { if (isMounted && periodFilter === 'today') setAiSummaryText(text); },
      (text) => { if (isMounted && periodFilter !== 'today') setAiSummaryText(text); },
      (gen) => { if (isMounted) setIsGeneratingSummary(gen); },
      effectiveOrdersRef.current
    );

    return () => { isMounted = false; };
  }, [periodFilter, ordersFingerprint]);

  useEffect(() => {
    const channel = supabase
      .channel(`delivery-summary-${periodFilter}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_summaries' }, (payload) => {
        const record = payload.new as any;
        if (record?.scope !== periodFilter) return;
        if (record.text_status === 'READY' && record.text) setAiSummaryText(record.text);
        setIsGeneratingAudio(record.audio_status === 'GENERATING');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [periodFilter]);

  const formatAudioTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  };

  const handleSelectGeminiVoice = async () => {
    if (isGeminiQuotaExceeded) {
      Alert.alert(
        'Voz Gemini IA Indisponível',
        'O serviço de Voz Gemini IA atingiu uma indisponibilidade temporária. O áudio utilizará a Voz Nativa.'
      );
      setVoiceEngine('native');
    } else {
      setVoiceEngine('gemini');
    }
  };

  const handleTogglePlayAudio = async (textToPlay?: string) => {
    const textTarget = textToPlay || activeSummaryText;
    if (!textTarget) return;

    if (isPlayingAudio && !isPaused) {
      await pauseGeminiAudio();
      setIsPlayingAudio(true);
      setIsPaused(true);
    } else if (isPlayingAudio && isPaused) {
      await resumeGeminiAudio();
      setIsPlayingAudio(true);
      setIsPaused(false);
    } else {
      setIsPlayingAudio(true);
      setIsPaused(false);

      await playSummaryAudio(textTarget, voiceEngine, {
        onStart: () => {
          setIsPlayingAudio(true);
          setIsPaused(false);
        },
        onProgress: (currentSec, durSec) => {
          setCurrentTime(currentSec);
          if (durSec > 0) setTotalDuration(durSec);
        },
        onDone: () => {
          setIsPlayingAudio(false);
          setIsPaused(false);
          setCurrentTime(0);
        },
        onError: (err) => {
          console.warn('[TodaySummaryCard] Falha ao sintetizar áudio:', err);
          setIsPlayingAudio(false);
          setIsPaused(false);
          setCurrentTime(0);
        },
      }, periodFilter);
    }
  };

  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Truck size={24} color="#0055ff" />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>
            {periodFilter === 'today' ? 'Operação de Hoje' : 'Operação dos Próximos Dias'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} {totalCount === 1 ? 'atividade programada' : 'atividades programadas'}
          </Text>
        </View>
      </View>

      <DeliverySummaryControlsBar
        voiceEngine={voiceEngine}
        periodFilter={periodFilter}
        isGeminiQuotaExceeded={isGeminiQuotaExceeded}
        onSelectGeminiVoice={handleSelectGeminiVoice}
        onSelectNativeVoice={() => setVoiceEngine('native')}
        onSelectPeriodToday={() => setPeriodFilter('today')}
        onSelectPeriodNextDays={() => setPeriodFilter('next_days')}
      />

      <DeliveryShiftMetricsGrid
        morningCount={morningCount}
        afternoonCount={afternoonCount}
        totalCount={totalCount}
      />

      <View style={styles.resumoBox}>
        <View style={styles.resumoIconBox}>
          <FileText size={18} color="#0055ff" />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.resumoTitle}>
            {periodFilter === 'today' ? 'Resumo do dia' : 'Resumo dos próximos dias'}
          </Text>
          <Text style={styles.resumoText} numberOfLines={4}>
            {activeSummaryText}
          </Text>
        </View>

        <ChevronRight size={18} color="#94a3b8" />
      </View>

      <AISummaryAudioPlayer
        isDarkMode={isDarkMode}
        title={periodFilter === 'today' ? 'Ouvir resumo de hoje' : 'Ouvir resumo dos próximos dias'}
        text={activeSummaryText}
        isLoadingText={isGeneratingSummary && !aiSummaryText}
        isGenerating={isGeneratingAudio}
        isSpeaking={isPlayingAudio}
        isPaused={isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onToggle={(txt) => handleTogglePlayAudio(txt)}
        onSeekEnd={(sec) => {
          setCurrentTime(sec);
          seekGeminiAudio(sec);
        }}
        setCurrentTime={setCurrentTime}
        formatTime={formatAudioTime}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0066ff',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  headerSubtitle: {
    color: '#dbeafe',
    fontSize: 12,
    marginTop: 2
  },
  resumoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 76
  },
  resumoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resumoTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700'
  },
  resumoText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
    minHeight: 32
  },
});
