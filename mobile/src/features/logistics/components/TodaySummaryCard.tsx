import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import {
  Truck,
  Sun,
  CloudSun,
  MapPin,
  FileText,
  ChevronRight,
  Volume2
} from 'lucide-react-native';
import { generateDeliveryAISummary } from '../../../services/aiSummaryService';
import { playSummaryAudio, stopGeminiAudio, pauseGeminiAudio, resumeGeminiAudio, seekGeminiAudio } from '../../../services/geminiAudioService';
import { getLocalDateString } from '../../../utils/orderUtils';
import { calculateDeliverySummaryMetrics, type DeliveryPeriodFilter } from '../utils/deliverySummaryMetrics';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { AISummaryAudioPlayer } from '../../dashboard/components/AISummaryAudioPlayer';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';

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
  onSelectOrder,
  isDarkMode = false
}) => {
  const [periodFilter, setPeriodFilter] = useState<DeliveryPeriodFilter>('today');
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineType>('gemini');
  const [isGeminiQuotaExceeded, setIsGeminiQuotaExceeded] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const [aiSummaryText, setAiSummaryText] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(true);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [fallbackOrders, setFallbackOrders] = useState<any[]>([]);

  // Ref estável para effectiveOrders — evita re-trigger do effect de geração
  const effectiveOrdersRef = useRef<any[]>([]);

  // Fade-in suave ao montar o card — elimina a piscada visual na primeira carga
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

  // Busca de contingência caso os pedidos recebidos não incluam datas futuras
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

  // Lista efetiva de pedidos: prioriza orders se tiver pedidos futuros ou combina com fallback
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

  // Mantém a ref sincronizada sem disparar re-renders
  useEffect(() => {
    effectiveOrdersRef.current = effectiveOrders;
  });

  // Fingerprint estável baseado em data operacional e status
  const ordersFingerprint = useMemo(() => {
    return (effectiveOrders || [])
      .map(o => `${o.id}_${o.status || o.order_data?.status || ''}_${getOperationalScheduleDate(o)}`)
      .join('|');
  }, [effectiveOrders]);

  // Para o áudio e reseta o player ao trocar de aba
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
    morningClients,
    afternoonClients,
    defaultSummaryText,
  } = useMemo(
    () => calculateDeliverySummaryMetrics(effectiveOrders, periodFilter),
    [effectiveOrders, periodFilter]
  );

  // Texto final a ser exibido e sintetizado
  const activeSummaryText = aiSummaryText || defaultSummaryText;

  // Geração do Resumo Inteligente
  // Deps: apenas periodFilter e ordersFingerprint — effectiveOrders vem via ref
  // para evitar re-trigger duplo quando o fallback carrega assincronamente.
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

  // Reflete imediatamente para todos os aparelhos o texto e o progresso do áudio.
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

  // Ação ao tentar alternar para Voz Gemini
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

  // Reprodução de áudio via geminiAudioService (com suporte a voz ultrarrealista Neural2 do Google AI Studio via expo-av)
  const handleTogglePlayAudio = async (textToPlay?: string) => {
    const textTarget = textToPlay || activeSummaryText;
    if (!textTarget) return;

    if (isPlayingAudio && !isPaused) {
      // Pausar
      await pauseGeminiAudio();
      setIsPlayingAudio(true);
      setIsPaused(true);
    } else if (isPlayingAudio && isPaused) {
      // Retomar
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

      // Falhas de rede/servidor não desativam permanentemente a opção Gemini.
      // A próxima ação do operador cria no máximo uma nova tentativa idempotente.
    }
  };

  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
      {/* 1. Cabeçalho Principal do Card */}
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

      {/* 2. Barra de Controles: Seletor de Voz & Seletor de Período */}
      <View style={styles.controlsRow}>
        {/* Alternância de Voz: Gemini IA vs Voz Nativa */}
        <View style={styles.toggleSwitchContainer}>
          <Volume2 size={14} color="#ffffff" style={{ marginLeft: 8, marginRight: 6 }} />
          <TouchableOpacity
            style={[
              styles.toggleSwitchOption,
              voiceEngine === 'gemini' && styles.toggleSwitchOptionActive,
              isGeminiQuotaExceeded && { opacity: 0.4, backgroundColor: 'rgba(255,255,255,0.1)' }
            ]}
            onPress={handleSelectGeminiVoice}
            disabled={isGeminiQuotaExceeded}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.toggleSwitchText,
              voiceEngine === 'gemini' ? styles.toggleSwitchTextActive : styles.toggleSwitchTextInactive,
              isGeminiQuotaExceeded && { color: '#94a3b8' }
            ]}>
              Gemini IA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleSwitchOption,
              voiceEngine === 'native' && styles.toggleSwitchOptionActive
            ]}
            onPress={() => setVoiceEngine('native')}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.toggleSwitchText,
              voiceEngine === 'native' ? styles.toggleSwitchTextActive : styles.toggleSwitchTextInactive
            ]}>
              Voz Nativa
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alternância de Período: Hoje vs Dias Seguintes */}
        <View style={styles.toggleSwitchContainer}>
          <TouchableOpacity
            style={[
              styles.toggleSwitchOption,
              periodFilter === 'today' && styles.toggleSwitchOptionActive
            ]}
            onPress={() => setPeriodFilter('today')}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.toggleSwitchText,
              periodFilter === 'today' ? styles.toggleSwitchTextActive : styles.toggleSwitchTextInactive
            ]}>
              Hoje
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleSwitchOption,
              periodFilter === 'next_days' && styles.toggleSwitchOptionActive
            ]}
            onPress={() => setPeriodFilter('next_days')}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.toggleSwitchText,
              periodFilter === 'next_days' ? styles.toggleSwitchTextActive : styles.toggleSwitchTextInactive
            ]}>
              Dias Seguintes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Grid de 3 Métricas por Turno */}
      <View style={styles.metricsGrid}>
        {/* Card Manhã */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <Sun size={20} color="#facc15" />
            <Text style={styles.metricNumber}>{morningCount}</Text>
          </View>
          <Text style={styles.metricLabel}>pela manhã</Text>
          <Text style={styles.metricTime}>08:00 – 12:00</Text>
        </View>

        {/* Card Tarde */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <CloudSun size={20} color="#facc15" />
            <Text style={styles.metricNumber}>{afternoonCount}</Text>
          </View>
          <Text style={styles.metricLabel}>à tarde</Text>
          <Text style={styles.metricTime}>13:00 – 18:00</Text>
        </View>

        {/* Card Total */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <MapPin size={20} color="#ffffff" />
            <Text style={styles.metricNumber}>{totalCount}</Text>
          </View>
          <Text style={styles.metricLabel}>total de</Text>
          <Text style={styles.metricSubLabel}>entregas</Text>
        </View>
      </View>

      {/* 3. Card Interno de Resumo do Dia */}
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

      {/* 4. Player de Áudio Reformulado */}
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap'
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
  toggleSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 20,
    padding: 3,
    alignItems: 'center'
  },
  toggleSwitchOption: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 17
  },
  toggleSwitchOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2
  },
  toggleSwitchText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '700'
  },
  toggleSwitchTextActive: {
    color: '#0055ff',
    fontWeight: '900'
  },
  toggleSwitchTextInactive: {
    color: '#dbeafe',
    fontWeight: '700'
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center'
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metricNumber: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800'
  },
  metricLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  },
  metricSubLabel: {
    color: '#dbeafe',
    fontSize: 10
  },
  metricTime: {
    color: '#dbeafe',
    fontSize: 9,
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
  audioBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0055ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  audioTitle: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700'
  },
  audioSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 1
  },
  progressTrack: {
    width: 60,
    height: 6,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0055ff'
  },
  audioTime: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500'
  }
});
