import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar, Alert, ScrollView, Vibration, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { ClipboardList, Bell, Hammer, ShoppingBag, Truck, BarChart3, AlertTriangle } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { createClient } from '@supabase/supabase-js';

// Conexão direta com Supabase
const SUPABASE_URL = "https://hkoxhourxwlddgsfdgws.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WEB_URL = "https://morantehub.vercel.app";

// Som de notificação premium em alta definição (URL pública estável)
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav";

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [webViewUrl, setWebViewUrl] = useState(WEB_URL);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deliveriesToday, setDeliveriesToday] = useState(0);
  const [assembliesToday, setAssembliesToday] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Formata data do dia em PT-BR
  const getTodayFormattedDate = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  };

  // Tocar som de notificação diferenciado
  const playNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URL },
        { shouldPlay: true }
      );
      // Descarrega o som da memória após tocar
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('Erro ao reproduzir áudio de notificação:', error);
    }
  };

  // Buscar entregas e montagens agendadas para hoje
  const fetchTodayStats = async () => {
    setLoadingStats(true);
    try {
      const now = new Date();
      // Lida com fuso horário local
      const offset = now.getTimezoneOffset();
      const localDate = new Date(now.getTime() - (offset * 60 * 1000));
      const todayStr = localDate.toISOString().split('T')[0];

      // 1. Contar entregas agendadas para hoje na tabela de pedidos (status de entrega não-cancelada)
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, shipping, items')
        .neq('status', 'cancelled')
        .eq('shipping->scheduling->>date', todayStr);

      if (ordersErr) throw ordersErr;

      let deliveryCount = 0;
      let assemblyCount = 0;

      if (orders) {
        orders.forEach((o: any) => {
          if (o.shipping?.deliveryMethod === 'delivery') {
            deliveryCount++;
          }
          // Verifica se o pedido possui itens que requerem montagem
          const hasAssemblyItems = o.items?.some((i: any) => 
            i.handlingType && 
            (i.handlingType.toLowerCase().includes('montagem') || i.handlingType.toLowerCase().includes('montador'))
          );
          if (hasAssemblyItems) {
            assemblyCount++;
          }
        });
      }

      // 2. Adicionar as montagens de mostruário marcadas para hoje
      const { count: showcaseCount, error: showcaseErr } = await supabase
        .from('showcase_assemblies')
        .select('*', { count: 'exact', head: true })
        .eq('date', todayStr)
        .neq('status', 'completed');

      if (!showcaseErr && showcaseCount !== null) {
        assemblyCount += showcaseCount;
      }

      setDeliveriesToday(deliveryCount);
      setAssembliesToday(assemblyCount);
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dia:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchTodayStats();

    // Iniciar áudio para que o Expo prepare o player em segundo plano
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldRouteThroughEarpieceAndroid: false
    }).catch(() => {});

    // Escutar novos pedidos em tempo real no Supabase
    const ordersChannel = supabase
      .channel('orders-new-realtime')
      .on('postgres_changes', { event: 'INSERT', table: 'orders' }, (payload: any) => {
        const newOrder = payload.new;
        if (newOrder) {
          const clientName = newOrder.customerData?.fullName || "Cliente não informado";
          const orderVal = newOrder.totalValue ? `R$ ${Number(newOrder.totalValue).toFixed(2)}` : "Valor não informado";
          
          const notif = {
            id: newOrder.id,
            title: "Novo Pedido Recebido! 🛍️",
            message: `Pedido #${newOrder.id?.slice(-8).toUpperCase()} · ${orderVal}\nCliente: ${clientName}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };

          // Toca o som diferenciado e vibra o dispositivo
          playNotificationSound();
          Vibration.vibrate([0, 150, 100, 150]);

          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(c => c + 1);
          
          // Atualiza as estatísticas do dia caso o pedido seja agendado para hoje
          fetchTodayStats();
        }
      })
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, []);

  // Escuta dados do WebView (como cargo do usuário ao logar)
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'USER_PROFILE') {
        setUserProfile(data.profile);
      }
    } catch (e) {
      console.warn("Erro ao processar mensagem do WebView:", e);
    }
  };

  const handleTabChange = (tab: string, targetUrl: string) => {
    setCurrentTab(tab);
    if (tab === 'home') {
      fetchTodayStats();
    } else {
      setWebViewUrl(targetUrl);
    }
  };

  // Verifica se o perfil do usuário é Administrador ou Gerente para exibir relatórios
  const canSeeReports = userProfile?.role === 'administrator' || userProfile?.role === 'manager';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header Nativo Premium */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>ERP MORANTEHUB</Text>
          <Text style={styles.headerTitle}>Painel do Aplicativo</Text>
        </View>
        
        <View style={styles.badgeContainer}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              setUnreadCount(0);
              setCurrentTab('home');
            }}
          >
            <Bell size={22} color="#1e293b" />
            {unreadCount > 0 && (
              <View style={styles.redBadge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {currentTab === 'home' ? (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Header de Data */}
            <View style={styles.dateHeader}>
              <Text style={styles.dateText}>{getTodayFormattedDate()}</Text>
              <Text style={styles.welcomeText}>
                Olá, {userProfile?.fullName || 'Colaborador Morante'}!
              </Text>
            </View>

            {/* Resumo do Dia (Cards) */}
            <View style={styles.statsRow}>
              <TouchableOpacity 
                style={[styles.statCard, styles.deliveryCard]}
                onPress={() => handleTabChange('entregas', `${WEB_URL}/delivery-schedule`)}
              >
                <View style={styles.statIconWrapper}>
                  <Truck size={24} color="#2563eb" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{deliveriesToday}</Text>
                )}
                <Text style={styles.statLabel}>Entregas de Hoje</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statCard, styles.assemblyCard]}
                onPress={() => handleTabChange('montagens', `${WEB_URL}/assembly-schedule`)}
              >
                <View style={styles.statIconWrapper}>
                  <Hammer size={24} color="#8b5cf6" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#8b5cf6" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{assembliesToday}</Text>
                )}
                <Text style={styles.statLabel}>Montagens de Hoje</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Notificações em Tempo Real */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Novos Pedidos do Dia</Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={() => setNotifications([])}>
                  <Text style={styles.clearText}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                  <Bell size={32} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>Tudo calmo por aqui</Text>
                <Text style={styles.emptyText}>Novos pedidos feitos no site web acionarão alertas sonoros em tempo real nesta tela.</Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {notifications.map((notif) => (
                  <View key={notif.id} style={styles.notificationCard}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notif.title}</Text>
                      <Text style={styles.notificationTime}>{notif.timestamp}</Text>
                    </View>
                    <Text style={styles.notificationMessage}>{notif.message}</Text>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleTabChange('pedidos', `${WEB_URL}/sales-order`)}
                    >
                      <Text style={styles.actionButtonText}>Visualizar Pedido</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Aviso de Catálogo */}
            <View style={styles.infoBox}>
              <AlertTriangle size={18} color="#e2e8f0" style={{ marginRight: 8 }} />
              <Text style={styles.infoText}>
                As entregas e montagens de hoje são sincronizadas com o fuso local da sua empresa.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <WebView 
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onMessage={handleWebViewMessage}
            injectedJavaScript={`
              // Envia o perfil do usuário para o React Native WebView periodicamente
              (function() {
                function checkProfile() {
                  if (window.userProfile) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'USER_PROFILE',
                      profile: window.userProfile
                    }));
                  }
                }
                setInterval(checkProfile, 2000);
              })();
            `}
          />
        )}
      </View>

      {/* Barra de Navegação Nativa */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'home' && styles.navItemActive]}
          onPress={() => handleTabChange('home', WEB_URL)}
        >
          <Bell size={22} color={currentTab === 'home' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'home' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'pedidos' && styles.navItemActive]}
          onPress={() => handleTabChange('pedidos', `${WEB_URL}/sales-order`)}
        >
          <ShoppingBag size={22} color={currentTab === 'pedidos' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'pedidos' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'pedidos' && styles.navTextActive]}>Pedidos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'entregas' && styles.navItemActive]}
          onPress={() => handleTabChange('entregas', `${WEB_URL}/delivery-schedule`)}
        >
          <Truck size={22} color={currentTab === 'entregas' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'entregas' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'entregas' && styles.navTextActive]}>Entregas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'montagens' && styles.navItemActive]}
          onPress={() => handleTabChange('montagens', `${WEB_URL}/assembly-schedule`)}
        >
          <Hammer size={22} color={currentTab === 'montagens' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'montagens' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'montagens' && styles.navTextActive]}>Montagens</Text>
        </TouchableOpacity>

        {canSeeReports && (
          <TouchableOpacity 
            style={[styles.navItem, currentTab === 'relatorios' && styles.navItemActive]}
            onPress={() => handleTabChange('relatorios', `${WEB_URL}/sales-order/reports`)}
          >
            <BarChart3 size={22} color={currentTab === 'relatorios' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'relatorios' ? 2.5 : 2} />
            <Text style={[styles.navText, currentTab === 'relatorios' && styles.navTextActive]}>Relatórios</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerSubtitle: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: '850', color: '#0f172a', letterSpacing: -0.5 },
  badgeContainer: { position: 'relative' },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  redBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#ffffff' },
  badgeText: { color: '#ffffff', fontSize: 8, fontWeight: '900' },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flex: 1, padding: 20 },
  dateHeader: { marginBottom: 25 },
  dateText: { fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  welcomeText: { fontSize: 20, fontWeight: '850', color: '#1e293b', marginTop: 4, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10 },
  deliveryCard: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  assemblyCard: { backgroundColor: '#f5f3ff', borderColor: '#ede9fe' },
  statIconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginTop: 12, letterSpacing: -1 },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: 1 },
  clearText: { fontSize: 10, fontWeight: '950', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 20 },
  emptyIconWrapper: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 14, fontWeight: '850', color: '#1e293b' },
  emptyText: { fontSize: 11, fontWeight: '600', color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  notificationsList: { gap: 12 },
  notificationCard: { backgroundColor: '#ffffff', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  notificationTitle: { fontSize: 13, fontWeight: '900', color: '#1e293b' },
  notificationTime: { fontSize: 10, color: '#64748b', fontWeight: '800' },
  notificationMessage: { fontSize: 11, fontWeight: '600', color: '#475569', lineHeight: 17 },
  actionButton: { marginTop: 14, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 12 },
  actionButtonText: { fontSize: 10, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', padding: 16, borderRadius: 20, marginTop: 25 },
  infoText: { flex: 1, fontSize: 10, fontWeight: '650', color: '#f8fafc', lineHeight: 16 },
  bottomNav: {
    height: 75,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: 15,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  navItemActive: { margin: 2 },
  navText: { fontSize: 9, fontWeight: '850', color: '#94a3b8', marginTop: 4, letterSpacing: 0.5 },
  navTextActive: { color: '#2563eb' }
});
