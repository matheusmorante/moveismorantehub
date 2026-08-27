import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Speech from 'expo-speech';
import * as Updates from 'expo-updates';

import { supabase, MASTER_DEFAULT_PROFILE, WEB_URL } from './src/services/supabaseClient';
import { registerPushToken, triggerLocalNotification } from './src/services/notificationService';
import { generateDeliveryAISummary } from './src/services/aiSummaryService';
import { isAssemblyOutsideType, isAssemblyInternalType } from './src/utils/aiSummaryHelper';
import { isDateInPeriod, parseOrderDateStr } from './src/utils/orderUtils';
import { DashboardHeader } from './src/features/dashboard/components/DashboardHeader';
import { AISummaryCard } from './src/features/dashboard/components/AISummaryCard';
import { OperationalStatsGrid } from './src/features/dashboard/components/OperationalStatsGrid';
import { NativeBottomNav } from './src/features/dashboard/components/NativeBottomNav';

import { NativeOrdersScreen } from './src/features/orders/screens/NativeOrdersScreen';
import { NativeLogisticsScreen } from './src/features/logistics/screens/NativeLogisticsScreen';
import { NativeAssembliesScreen } from './src/features/assemblies/screens/NativeAssembliesScreen';
import { NativeReportsScreen } from './src/features/reports/screens/NativeReportsScreen';

import { NotificationsModal } from './src/components/modals/NotificationsModal';
import { ProfileModal } from './src/components/modals/ProfileModal';
import { OrderDetailsModal } from './src/components/modals/OrderDetailsModal';

WebBrowser.maybeCompleteAuthSession();

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'this_week', label: 'Esta Semana' },
  { id: 'this_month', label: 'Este Mês' },
  { id: 'last_30_days', label: 'Últimos 30 Dias' },
  { id: 'this_quarter', label: 'Este Trimestre' },
];

export default function App() {
  const [userProfile] = useState<any>(MASTER_DEFAULT_PROFILE);
  const [currentTab, setCurrentTab] = useState('home');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [appSelectedOrder, setAppSelectedOrder] = useState<any>(null);

  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [assembliesInternalCount, setAssembliesInternalCount] = useState(0);
  const [assembliesOutsideCount, setAssembliesOutsideCount] = useState(0);
  const [assistancesCount, setAssistancesCount] = useState(0);
  const [returnsCount, setReturnsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [assemblySubTab, setAssemblySubTab] = useState<'internal' | 'outside'>('internal');

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
    async function checkOTAUpdates() {
      try {
        if (__DEV__) return;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('OTA Check:', e);
      }
    }
    void checkOTAUpdates();
  }, []);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'master';
  const isAssemblerDriver = userProfile?.role === 'assembler' || userProfile?.role === 'driver' || userProfile?.role === 'entregador';
  const canSeeReports = isAdmin || userProfile?.role === 'manager' || userProfile?.role === 'seller';

  const formatAudioTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  };

  const handleOpenNotificationsModal = async () => {
    setShowNotificationsModal(true);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await supabase.from('app_notifications').update({ read: true }).eq('read', false);
    } catch (err) {}
  };

  const handleTabChange = (newTab: string, url: string) => {
    setCurrentTab(newTab);
  };

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriod(periodId);
    fetchDashboardStats(periodId);
  };

  const stopSpeechTimer = () => {
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
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

    Speech.speak(text, {
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

    Speech.speak(remainingText, {
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

  const fetchDashboardStats = async (periodId: string = selectedPeriod) => {
    try {
      setLoadingStats(true);
      
      let rawOrders: any[] = [];
      let settingsData: any = null;

      try {
        const { data } = await supabase.from('orders').select('*');
        if (data) rawOrders = data;
      } catch (e) {
        console.warn('[DashboardStats] Erro ao buscar pedidos:', e);
      }

      try {
        const { data } = await supabase.from('settings').select('*').limit(1);
        if (data && data.length > 0) settingsData = data[0]?.data || data[0];
      } catch (e) {
        console.warn('[DashboardStats] Erro ao buscar configurações:', e);
      }

      if (!rawOrders || rawOrders.length === 0) {
        setDeliveriesCount(0);
        setAssembliesInternalCount(0);
        setAssembliesOutsideCount(0);
        setAssistancesCount(0);
        setReturnsCount(0);
        return;
      }

      const allHandlingOptions = [
        ...(settingsData?.deliveryHandlingOptions || []),
        ...(settingsData?.pickupHandlingOptions || [])
      ];

      const activeOrders = rawOrders.filter((o: any) => {
        const oData = o.order_data || {};
        return !oData.deleted && !o.deleted;
      });

      let dCount = 0;
      let aIntCount = 0;
      let aOutCount = 0;
      let astCount = 0;
      let retCount = 0;

      activeOrders.forEach((o: any) => {
        const oData = o.order_data || {};
        const orderStatus = (o.status || oData.status || '').toLowerCase();
        if (orderStatus === 'draft' || orderStatus === 'rascunho') return;

        const shipping = oData.shipping || {};
        const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
        const rawSchedDate = sched.date || sched.startDate || o.scheduled_date || o.date || '';

        const isInPeriod = isDateInPeriod(rawSchedDate || o.created_at, periodId);
        if (!isInPeriod) return;

        const items = oData.items || o.items || [];
        const orderType = (oData.orderType || o.order_type || '').toLowerCase();

        if (orderType === 'assistance') astCount++;
        if (orderType === 'return') retCount++;

        if (rawSchedDate || sched.date || orderType === 'delivery' || (!orderType || orderType === 'sale' || orderType === 'venda')) {
          dCount++;
        }

        const orderHandling = (
          oData.handlingType ||
          oData.handling ||
          oData.deliveryType ||
          shipping.handlingType ||
          shipping.handling ||
          o.handling ||
          o.handlingType ||
          ''
        ).toString();

        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item: any) => {
            const itemHandling = (
              item.handlingType ||
              item.handling ||
              item.handling_type ||
              item.deliveryType ||
              ''
            ).toString();

            const qty = Number(item.quantity || item.qty || 1);
            const effectiveHandling = itemHandling || orderHandling;

            if (isAssemblyOutsideType(effectiveHandling, allHandlingOptions)) {
              aOutCount += qty;
            } else if (isAssemblyInternalType(effectiveHandling, allHandlingOptions)) {
              aIntCount += qty;
            }
          });
        } else {
          if (isAssemblyOutsideType(orderHandling, allHandlingOptions)) aOutCount += 1;
          else if (isAssemblyInternalType(orderHandling, allHandlingOptions)) aIntCount += 1;
        }
      });

      // Calcular se há alguma entrega para hoje especificamente
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const todayOrders = activeOrders.filter((o: any) => {
        const oData = o.order_data || {};
        const orderStatus = (o.status || oData.status || '').toLowerCase();
        if (orderStatus === 'draft' || orderStatus === 'rascunho' || orderStatus === 'cancelado') return false;

        const shipping = oData.shipping || {};
        const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
        
        const isExplicitlyPending = Boolean(
          sched.pendingScheduling ||
          oData.pendingScheduling ||
          o.pending_scheduling ||
          orderStatus === 'pending_scheduling' ||
          orderStatus === 'agendar_depois'
        );
        if (isExplicitlyPending) return false;

        const rawSchedDate = sched.date || sched.startDate || o.scheduled_date || o.date || '';
        if (!rawSchedDate || rawSchedDate === 'sem_data') return false;

        const cleanDate = parseOrderDateStr(rawSchedDate);
        return cleanDate === todayStr;
      });

      const hasToday = todayOrders.length > 0;
      setHasTodayDeliveries(hasToday);
      if (!hasToday) {
        setAiSummaryTab('tomorrow');
      }

      setDeliveriesCount(dCount);
      setAssembliesInternalCount(aIntCount);
      setAssembliesOutsideCount(aOutCount);
      setAssistancesCount(astCount);
      setReturnsCount(retCount);
    } catch (err) {
      console.warn('[DashboardStats] Erro:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // 1. Carregar Notificações e Inicialização
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (!error && Array.isArray(data)) {
        const formatted = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.created_at,
          timestamp: new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          scheduleText: n.schedule_text,
          order: n.order_data,
          read: n.read
        }));
        setNotifications(formatted);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch (err) {}
  };

  useEffect(() => {
    registerPushToken();
    fetchDashboardStats();
    fetchNotifications();

    generateDeliveryAISummary('today', false, setAiSummaryToday, setAiSummaryTomorrow, setIsGeneratingAISummary);
    generateDeliveryAISummary('tomorrow', false, setAiSummaryToday, setAiSummaryTomorrow, setIsGeneratingAISummary);

    // 2. Realtime Listener + Disparo de Notificação Nativa na Barra do Celular
    const notifChannel = supabase
      .channel('realtime-app-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, async (payload) => {
        const newNotif = payload.new;
        if (!newNotif) return;

        setNotifications(prev => [{
          id: newNotif.id,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          createdAt: newNotif.created_at || new Date().toISOString(),
          timestamp: new Date(newNotif.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          scheduleText: newNotif.schedule_text,
          order: newNotif.order_data,
          read: false
        }, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Dispara banner com som e vibração na barra de status do celular
        triggerLocalNotification(
          newNotif.title || 'Móveis Morante',
          newNotif.message || 'Nova notificação de pedido',
          newNotif
        );

        fetchDashboardStats();
        generateDeliveryAISummary('today', true, setAiSummaryToday, setAiSummaryTomorrow, setIsGeneratingAISummary);
      })
      .subscribe();

    const pollingInterval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => {
      notifChannel.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'} />

        {/* Conteúdo Principal com Cabeçalho Global */}
        <View style={{ flex: 1 }}>
          <DashboardHeader
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            userProfile={userProfile}
            setShowProfileModal={setShowProfileModal}
            handleOpenNotificationsModal={handleOpenNotificationsModal}
            unreadCount={unreadCount}
          />
          {currentTab === 'home' ? (
            <ScrollView style={{ flex: 1 }}>

              <AISummaryCard
                isDarkMode={isDarkMode}
                aiSummaryTab={aiSummaryTab}
                setAiSummaryTab={setAiSummaryTab}
                hasTodayDeliveries={hasTodayDeliveries}
                aiSummaryToday={aiSummaryToday}
                aiSummaryTomorrow={aiSummaryTomorrow}
                isGeneratingAISummary={isGeneratingAISummary}
                onRefreshSummary={() => generateDeliveryAISummary(aiSummaryTab, true, setAiSummaryToday, setAiSummaryTomorrow, setIsGeneratingAISummary)}
                isSpeakingSummary={isSpeakingSummary}
                speechIsPaused={speechIsPaused}
                speechCurrentTime={speechCurrentTime}
                speechTotalDuration={speechTotalDuration}
                handleToggleSpeech={handleToggleSpeech}
                finishSeekToPosition={finishSeekToPosition}
                setSpeechCurrentTime={setSpeechCurrentTime}
                formatAudioTime={formatAudioTime}
              />

              <OperationalStatsGrid
                isDarkMode={isDarkMode}
                selectedPeriod={selectedPeriod}
                setShowPeriodModal={setShowPeriodModal}
                showPeriodModal={showPeriodModal}
                PERIOD_OPTIONS={PERIOD_OPTIONS}
                handlePeriodChange={handlePeriodChange}
                deliveriesCount={deliveriesCount}
                assembliesInternalCount={assembliesInternalCount}
                assembliesOutsideCount={assembliesOutsideCount}
                assistancesCount={assistancesCount}
                returnsCount={returnsCount}
                loadingStats={loadingStats}
                handleTabChange={handleTabChange}
                setAssemblySubTab={setAssemblySubTab}
                WEB_URL={WEB_URL}
              />
            </ScrollView>
          ) : currentTab === 'pedidos' ? (
            <NativeOrdersScreen isDarkMode={isDarkMode} isAdmin={isAdmin} onSelectOrder={setAppSelectedOrder} />
          ) : (currentTab === 'entregas' || currentTab === 'logistica') ? (
            <NativeLogisticsScreen isDarkMode={isDarkMode} isAdmin={isAdmin} onSelectOrder={setAppSelectedOrder} />
          ) : currentTab === 'montagens' ? (
            <NativeAssembliesScreen isDarkMode={isDarkMode} initialSubTab={assemblySubTab} onSelectOrder={setAppSelectedOrder} />
          ) : canSeeReports ? (
            <NativeReportsScreen isDarkMode={isDarkMode} />
          ) : (
            <NativeOrdersScreen isDarkMode={isDarkMode} isAdmin={isAdmin} onSelectOrder={setAppSelectedOrder} />
          )}
        </View>

        {/* Navegação Inferior Nativa */}
        <NativeBottomNav
          isDarkMode={isDarkMode}
          currentTab={currentTab}
          canSeeReports={canSeeReports}
          handleTabChange={handleTabChange}
          WEB_URL={WEB_URL}
        />

        {/* Modais */}
        <NotificationsModal
          visible={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          isDarkMode={isDarkMode}
          notifications={notifications}
          onSelectOrder={setAppSelectedOrder}
        />

        <ProfileModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          isDarkMode={isDarkMode}
          userProfile={userProfile}
          isAdmin={isAdmin}
          isAssemblerDriver={isAssemblerDriver}
          handleTabChange={handleTabChange}
          handleLogout={() => {}}
          WEB_URL={WEB_URL}
        />

        <OrderDetailsModal
          order={appSelectedOrder}
          onClose={() => setAppSelectedOrder(null)}
          isDarkMode={isDarkMode}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
