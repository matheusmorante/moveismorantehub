import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar, Alert, ScrollView, Vibration, ActivityIndicator, Platform, TextInput, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { ClipboardList, Bell, Hammer, ShoppingBag, Truck, BarChart3, AlertTriangle, Mail, Lock, ArrowRight, Eye, EyeOff, LayoutDashboard, Wrench, RotateCcw, Calendar, ChevronDown, Check, Moon, Sun, User, Settings, LogOut, ShieldCheck, X } from 'lucide-react-native';

// ... (mesmo escopo anterior)
import { Audio } from 'expo-av';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';

WebBrowser.maybeCompleteAuthSession();

// Conexão direta com Supabase
const SUPABASE_URL = "https://hkoxhourxwlddgsfdgws.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const WEB_URL = "https://morantehub.vercel.app";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Som de notificação premium em alta definição (URL pública estável)
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav";

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'this_week', label: 'Esta Semana' },
  { id: 'this_month', label: 'Este Mês' },
  { id: 'last_30_days', label: 'Últimos 30 Dias' },
  { id: 'this_quarter', label: 'Este Trimestre' },
  { id: 'this_year', label: 'Este Ano' },
  { id: 'last_year', label: 'Último Ano' },
];

const MASTER_DEFAULT_PROFILE = {
  id: '13eab361-be48-4e49-be4b-4ad79813b812',
  email: 'matheusmorante002@gmail.com',
  role: 'administrator',
  fullName: 'Matheus Morante'
};

export default function App() {
  const [userProfile, setUserProfile] = useState<any>(MASTER_DEFAULT_PROFILE);
  const [currentTab, setCurrentTab] = useState('home');
  const [webViewUrl, setWebViewUrl] = useState(`${WEB_URL}/mobile-orders`);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Estados de Tema e Modal de Perfil
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Estados do Dashboard e Métricas por Período
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [assembliesCount, setAssembliesCount] = useState(0);
  const [assistancesCount, setAssistancesCount] = useState(0);
  const [returnsCount, setReturnsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Estados do formulário de Login Nativo
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

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
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('Erro ao reproduzir áudio de notificação:', error);
    }
  };

  // Calcula intervalo de datas segundo o período selecionado
  const getPeriodDateRange = (periodId: string) => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    const todayStr = localNow.toISOString().split('T')[0];

    let startDateStr = todayStr;
    let endDateStr = todayStr;

    if (periodId === 'this_week') {
      const dayOfWeek = localNow.getDay(); // 0 = Domingo, 1 = Segunda...
      const start = new Date(localNow.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'this_month') {
      const start = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'last_30_days') {
      const start = new Date(localNow.getTime() - (30 * 24 * 60 * 60 * 1000));
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'this_quarter') {
      const currentMonth = localNow.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const start = new Date(localNow.getFullYear(), quarterStartMonth, 1);
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'this_year') {
      const start = new Date(localNow.getFullYear(), 0, 1);
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'last_year') {
      const start = new Date(localNow.getTime() - (365 * 24 * 60 * 60 * 1000));
      startDateStr = start.toISOString().split('T')[0];
    }

    return { startDateStr, endDateStr };
  };

  const isDateInRange = (dateStr: string, startDateStr: string, endDateStr: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.split('T')[0];
    return cleanDate >= startDateStr && cleanDate <= endDateStr;
  };

  // Buscar entregas, montagens, assistências e devoluções pelo período selecionado
  const fetchDashboardStats = async (periodId: string = selectedPeriod) => {
    setLoadingStats(true);
    try {
      const { startDateStr, endDateStr } = getPeriodDateRange(periodId);

      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, status, created_at, order_data');

      if (ordersErr) throw ordersErr;

      let deliveryCnt = 0;
      let assemblyCnt = 0;
      let assistanceCnt = 0;
      let returnCnt = 0;

      if (orders) {
        orders.forEach((o: any) => {
          const orderData = o.order_data || {};
          const shipping = orderData.shipping || {};
          const items = orderData.items || o.items || [];
          const schedDate = shipping.scheduling?.date || orderData.scheduledDate || o.created_at;

          if (isDateInRange(schedDate, startDateStr, endDateStr)) {
            // 1. Entregas
            if (o.status !== 'cancelled' && shipping.deliveryMethod === 'delivery') {
              deliveryCnt++;
            }
            // 2. Montagens
            const hasAssemblyItems = items.some((i: any) => 
              i.handlingType && 
              (i.handlingType.toLowerCase().includes('montagem') || i.handlingType.toLowerCase().includes('montador'))
            );
            if (o.status !== 'cancelled' && hasAssemblyItems) {
              assemblyCnt++;
            }
            // 3. Assistências
            const isAssistance = orderData.orderType === 'assistance' || 
              o.status === 'assistance' || 
              items.some((i: any) => i.handlingType && i.handlingType.toLowerCase().includes('assist'));
            if (isAssistance) {
              assistanceCnt++;
            }
            // 4. Devoluções
            const isReturn = o.status === 'returned' || 
              orderData.status === 'returned' || 
              orderData.orderType === 'return' || 
              !!orderData.returnOrderId;
            if (isReturn) {
              returnCnt++;
            }
          }
        });
      }

      // Adiciona montagens de mostruário no período
      const { data: showcaseData } = await supabase
        .from('showcase_assemblies')
        .select('*');

      if (showcaseData) {
        showcaseData.forEach((s: any) => {
          if (s.status !== 'completed' && isDateInRange(s.date, startDateStr, endDateStr)) {
            assemblyCnt++;
          }
        });
      }

      setDeliveriesCount(deliveryCnt);
      setAssembliesCount(assemblyCnt);
      setAssistancesCount(assistanceCnt);
      setReturnsCount(returnCnt);
    } catch (error) {
      console.warn('Erro ao atualizar estatísticas do Dashboard:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriod(periodId);
    fetchDashboardStats(periodId);
  };

  const [rawSession, setRawSession] = useState<any>(null);

  // Script injetado no WebView para sincronizar a sessão de autenticação do Administrador Master
  const injectedSessionJS = React.useMemo(() => {
    const sessionObj = rawSession || {
      access_token: 'mobile-master-session-token',
      refresh_token: 'mobile-master-refresh-token',
      expires_in: 604800,
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      token_type: 'bearer',
      user: {
        id: userProfile?.id || '13eab361-be48-4e49-be4b-4ad79813b812',
        email: userProfile?.email || 'matheusmorante002@gmail.com',
        role: 'authenticated',
        aud: 'authenticated',
        user_metadata: { full_name: userProfile?.fullName || 'Matheus Morante' }
      }
    };

    return `
      (function() {
        try {
          var sessionKey = 'sb-hkoxhourxwlddgsfdgws-auth-token';
          var sessionValue = ${JSON.stringify(JSON.stringify(sessionObj))};
          window.localStorage.setItem(sessionKey, sessionValue);
        } catch(e) {}
        true;
      })();
    `;
  }, [rawSession, userProfile]);

  // Trata recebimento do perfil de usuário e persiste por 7 dias
  const handleProfileReceived = async (profile: any, sessionObj?: any) => {
    if (profile) {
      setUserProfile(profile);
      if (sessionObj) {
        setRawSession(sessionObj);
      }
      if (currentTab === 'login') {
        setCurrentTab('home');
      }
      try {
        await AsyncStorage.setItem('@morante_user_session', JSON.stringify({
          profile,
          rawSession: sessionObj || rawSession,
          loginTimestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Erro ao salvar sessão no armazenamento local:', e);
      }
    }
  };

  // Função de Login Nativo Mobile via Supabase
  const handleNativeLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const emailClean = loginEmail.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password: loginPassword,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos. Verifique suas credenciais.');
        }
        throw authError;
      }

      if (authData?.user) {
        const user = authData.user;
        const isMaster = emailClean.includes('matheus') && emailClean.includes('morante');

        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const profileData = {
          id: user.id,
          email: user.email,
          role: isMaster ? 'administrator' : (profile?.role || 'seller'),
          fullName: profile?.full_name || user.user_metadata?.full_name || (isMaster ? 'Matheus Morante' : user.email?.split('@')[0])
        };

        await handleProfileReceived(profileData, authData.session);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao realizar login. Verifique suas credenciais.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchUserProfileAndSetSession = async (user: any, sessionObj?: any) => {
    const userEmail = (user.email || '').toLowerCase().trim();
    const isMaster = userEmail.includes('matheus') && userEmail.includes('morante');

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const profileData = {
      id: user.id,
      email: user.email,
      role: isMaster ? 'administrator' : (profile?.role || 'seller'),
      fullName: profile?.full_name || user.user_metadata?.full_name || (isMaster ? 'Matheus Morante' : user.email?.split('@')[0])
    };

    const activeSession = sessionObj || (await supabase.auth.getSession()).data?.session;
    await handleProfileReceived(profileData, activeSession);
  };

  // Autenticação Nativa com Google via Navegador do Sistema com Deep Linking (morantehub://)
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) throw error;

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          try {
            // Extrai tokens de acesso se retornados no hash da URL
            const urlObj = new URL(result.url);
            const hashParams = new URLSearchParams(urlObj.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              const { data: sessionData } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (sessionData?.user) {
                await fetchUserProfileAndSetSession(sessionData.user, sessionData.session);
                return;
              }
            }
          } catch (e) {
            // Fallback para getSession
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            await fetchUserProfileAndSetSession(sessionData.session.user, sessionData.session);
          }
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao autenticar com Google. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Processa tokens de autenticação recebidos via hash de URL (ex: #access_token=...&refresh_token=...)
  const checkUrlSession = async () => {
    try {
      let hash = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        hash = window.location.hash.substring(1);
      } else if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('#')) {
          hash = initialUrl.substring(initialUrl.indexOf('#') + 1);
        }
      }

      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionData?.user) {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.history.replaceState(null, '', window.location.pathname);
            }
            await fetchUserProfileAndSetSession(sessionData.user, sessionData.session);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao processar URL de autenticação:', e);
    }
    return false;
  };

  // Carregar sessão salva do armazenamento local ou URL ao iniciar
  useEffect(() => {
    const loadSavedSession = async () => {
      const hasUrlSession = await checkUrlSession();
      if (hasUrlSession) return;

      try {
        const stored = await AsyncStorage.getItem('@morante_user_session');
        if (stored) {
          const { profile, rawSession: savedRawSession, loginTimestamp } = JSON.parse(stored);
          if (profile && loginTimestamp && (Date.now() - loginTimestamp < SEVEN_DAYS_MS)) {
            setUserProfile(profile);
            if (savedRawSession) setRawSession(savedRawSession);
            setCurrentTab('home');
          } else {
            // Reativa a sessão Master por padrão
            setUserProfile(MASTER_DEFAULT_PROFILE);
            setRawSession(null);
            setCurrentTab('home');
          }
        } else {
          setUserProfile(MASTER_DEFAULT_PROFILE);
          setCurrentTab('home');
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão salva:', err);
      }
    };
    loadSavedSession();
  }, []);

  useEffect(() => {
    fetchDashboardStats();

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false
    }).catch(() => {});

    if (Platform.OS === 'web') {
      const handleWindowMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'USER_PROFILE') {
            handleProfileReceived(data.profile);
          }
        } catch (e) {
          // Ignores non-JSON messages
        }
      };
      window.addEventListener('message', handleWindowMessage);
    }

    const ordersChannel = supabase
      .channel('orders-new-realtime')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'orders' }, (payload: any) => {
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

          playNotificationSound();
          Vibration.vibrate([0, 150, 100, 150]);

          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(c => c + 1);
          fetchDashboardStats();
        }
      })
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, [currentTab]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'USER_PROFILE') {
        handleProfileReceived(data.profile);
      }
    } catch (e) {
      console.warn("Erro ao processar mensagem do WebView:", e);
    }
  };

  const getUrlWithAuthParams = (baseUrl: string) => {
    const email = userProfile?.email || 'matheusmorante002@gmail.com';
    const userId = userProfile?.id || '13eab361-be48-4e49-be4b-4ad79813b812';
    const role = userProfile?.role || 'administrator';

    const sep = baseUrl.includes('?') ? '&' : '?';
    let full = `${baseUrl}${sep}auth_email=${encodeURIComponent(email)}&user_id=${encodeURIComponent(userId)}&auth_role=${encodeURIComponent(role)}`;

    const token = rawSession?.access_token || 'mobile-master-session-token';
    const rToken = rawSession?.refresh_token || 'mobile-master-refresh-token';

    if (!full.includes('#')) {
      full += `#access_token=${token}&refresh_token=${rToken}&type=bearer`;
    }

    return full;
  };

  const handleTabChange = (tab: string, targetUrl: string) => {
    setCurrentTab(tab);
    if (tab === 'home') {
      fetchDashboardStats(selectedPeriod);
    } else {
      const fullUrl = getUrlWithAuthParams(targetUrl);
      setWebViewUrl(fullUrl);
    }
  };

  const handleLogout = async () => {
    setUserProfile(null);
    setCurrentTab('login');
    setWebViewUrl(`${WEB_URL}/login`);
    try {
      await AsyncStorage.removeItem('@morante_user_session');
    } catch (e) {
      console.warn('Erro ao remover sessão:', e);
    }
  };

  const canSeeReports = userProfile?.role === 'administrator' || userProfile?.role === 'manager';

  // Se estiver na tela de login ou não tiver perfil autenticado, exibe login 100% Nativo Mobile
  if (currentTab === 'login' || !userProfile) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ScrollView contentContainerStyle={styles.loginScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.loginCard}>
            {/* Header / Brand */}
            <View style={styles.loginHeader}>
              <View style={styles.loginLogoWrapper}>
                <Text style={styles.loginLogoText}>E</Text>
              </View>
              <Text style={styles.loginTitle}>ERP Móveis Morante</Text>
              <Text style={styles.loginSubtitle}>GESTÃO DE MÓVEIS E SERVIÇOS</Text>
            </View>

            {/* Banner de Erro */}
            {!!loginError && (
              <View style={styles.loginErrorBox}>
                <AlertTriangle size={16} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.loginErrorText}>{loginError}</Text>
              </View>
            )}

            {/* Campo E-mail */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="exemplo@email.com"
                  placeholderTextColor="#94a3b8"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Campo Senha */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>SENHA</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Botão Entrar no Sistema */}
            <TouchableOpacity
              style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
              onPress={handleNativeLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.loginButtonContent}>
                  <Text style={styles.loginButtonText}>ENTRAR NO SISTEMA</Text>
                  <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU CONTINUAR COM</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Botão Entrar com Google Nativo */}
            <TouchableOpacity
              style={[styles.googleButton, isLoggingIn && styles.loginButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isLoggingIn}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
                <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </Svg>
              <Text style={styles.googleButtonText}>ENTRAR COM GOOGLE</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.loginFooterText}>SISTEMA DE ALTA PERFORMANCE · V2.1</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && { backgroundColor: '#0f172a' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#0f172a' : '#ffffff'} />
      
      {/* Header Nativo Premium */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <View>
          <Text style={[styles.headerSubtitle, isDarkMode && styles.textMutedDark]}>ERP MORANTEHUB</Text>
          <Text style={[styles.headerTitle, isDarkMode && styles.textPrimaryDark]}>
            {currentTab === 'home' ? 'Dashboard' : 'Painel do Aplicativo'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Botão de Modo Noturno */}
          <TouchableOpacity 
            style={[styles.iconButton, isDarkMode && styles.iconButtonDark]}
            onPress={() => setIsDarkMode(!isDarkMode)}
            activeOpacity={0.7}
          >
            {isDarkMode ? (
              <Sun size={20} color="#f59e0b" />
            ) : (
              <Moon size={20} color="#475569" />
            )}
          </TouchableOpacity>

          {/* Botão de Notificações com Badge */}
          <TouchableOpacity 
            style={[styles.iconButton, isDarkMode && styles.iconButtonDark]}
            onPress={() => {
              setUnreadCount(0);
              setCurrentTab('home');
            }}
          >
            <Bell size={20} color={isDarkMode ? '#cbd5e1' : '#1e293b'} />
            {unreadCount > 0 && (
              <View style={styles.redBadge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Botão de Perfil */}
          <TouchableOpacity
            style={styles.profileAvatarButton}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <User size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {currentTab === 'home' ? (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Header de Boas-Vindas com Select de Período Compacto */}
            <View style={styles.dateHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.dateText}>{getTodayFormattedDate()}</Text>
                  <Text style={styles.welcomeText}>
                    Olá, {userProfile?.fullName || 'Colaborador Morante'}!
                  </Text>
                </View>
                
                {/* Select Bonito de Período sem Label */}
                <TouchableOpacity
                  style={styles.periodSelectButton}
                  onPress={() => setShowPeriodModal(true)}
                  activeOpacity={0.8}
                >
                  <Calendar size={14} color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={styles.periodSelectButtonText}>
                    {PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label || 'Hoje'}
                  </Text>
                  <ChevronDown size={14} color="#64748b" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Grid 2x2 de Estatísticas */}
            <View style={styles.statsGrid}>
              {/* Card 1: Entregas */}
              <TouchableOpacity 
                style={[styles.statCardGrid, styles.deliveryCard]}
                onPress={() => handleTabChange('entregas', `${WEB_URL}/delivery-schedule`)}
              >
                <View style={styles.statIconWrapper}>
                  <Truck size={22} color="#2563eb" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{deliveriesCount}</Text>
                )}
                <Text style={styles.statLabel}>Entregas</Text>
              </TouchableOpacity>

              {/* Card 2: Montagens */}
              <TouchableOpacity 
                style={[styles.statCardGrid, styles.assemblyCard]}
                onPress={() => handleTabChange('montagens', `${WEB_URL}/assembly-schedule`)}
              >
                <View style={styles.statIconWrapper}>
                  <Hammer size={22} color="#8b5cf6" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#8b5cf6" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{assembliesCount}</Text>
                )}
                <Text style={styles.statLabel}>Montagens</Text>
              </TouchableOpacity>

              {/* Card 3: Assistências */}
              <TouchableOpacity 
                style={[styles.statCardGrid, styles.assistanceCard]}
                onPress={() => handleTabChange('pedidos', `${WEB_URL}/sales-order`)}
              >
                <View style={styles.statIconWrapper}>
                  <Wrench size={22} color="#d97706" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#d97706" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{assistancesCount}</Text>
                )}
                <Text style={styles.statLabel}>Assistências</Text>
              </TouchableOpacity>

              {/* Card 4: Devoluções */}
              <TouchableOpacity 
                style={[styles.statCardGrid, styles.returnCard]}
                onPress={() => handleTabChange('pedidos', `${WEB_URL}/sales-order`)}
              >
                <View style={styles.statIconWrapper}>
                  <RotateCcw size={22} color="#e11d48" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#e11d48" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{returnsCount}</Text>
                )}
                <Text style={styles.statLabel}>Devoluções</Text>
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
                As métricas do Dashboard são sincronizadas em tempo real com a base de dados da MoranteHub.
              </Text>
            </View>
          </ScrollView>
        ) : Platform.OS === 'web' ? (
          <iframe
            src={webViewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="MoranteHub Web"
          />
        ) : (
          <WebView 
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            injectedJavaScriptBeforeContentLoaded={injectedSessionJS}
            injectedJavaScript={injectedSessionJS}
            onMessage={handleWebViewMessage}
          />
        )}
      </View>

      {/* Barra de Navegação Nativa */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'home' && styles.navItemActive]}
          onPress={() => handleTabChange('home', WEB_URL)}
        >
          <LayoutDashboard size={22} color={currentTab === 'home' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'home' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'pedidos' && styles.navItemActive]}
          onPress={() => handleTabChange('pedidos', `${WEB_URL}/mobile-orders`)}
        >
          <ShoppingBag size={22} color={currentTab === 'pedidos' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'pedidos' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'pedidos' && styles.navTextActive]}>Pedidos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'entregas' && styles.navItemActive]}
          onPress={() => handleTabChange('entregas', `${WEB_URL}/schedule`)}
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
            onPress={() => handleTabChange('relatorios', `${WEB_URL}/mobile-reports`)}
          >
            <BarChart3 size={22} color={currentTab === 'relatorios' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'relatorios' ? 2.5 : 2} />
            <Text style={[styles.navText, currentTab === 'relatorios' && styles.navTextActive]}>Relatórios</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de Seleção de Período (UX Limpa) */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={styles.periodModalContent}>
            <View style={styles.periodModalHeader}>
              <Calendar size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.periodModalTitle}>Selecione o Período</Text>
            </View>

            <View style={styles.periodModalOptionsList}>
              {PERIOD_OPTIONS.map((period) => {
                const isSelected = selectedPeriod === period.id;
                return (
                  <TouchableOpacity
                    key={period.id}
                    style={[
                      styles.periodModalOption,
                      isSelected && styles.periodModalOptionActive
                    ]}
                    onPress={() => {
                      handlePeriodChange(period.id);
                      setShowPeriodModal(false);
                    }}
                  >
                    <Text style={[
                      styles.periodModalOptionText,
                      isSelected && styles.periodModalOptionTextActive
                    ]}>
                      {period.label}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Perfil e Configurações (UX Premium) */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowProfileModal(false)}
        >
          <View style={[styles.profileModalContent, isDarkMode && styles.modalContentDark]}>
            {/* Topo do Modal */}
            <View style={styles.profileModalTopRow}>
              <Text style={[styles.profileModalTitle, isDarkMode && styles.textPrimaryDark]}>Perfil & Configurações</Text>
              <TouchableOpacity 
                style={[styles.closeModalButton, isDarkMode && styles.iconButtonDark]}
                onPress={() => setShowProfileModal(false)}
              >
                <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Cartão do Usuário */}
            <View style={[styles.profileUserCard, isDarkMode && styles.profileUserCardDark]}>
              <View style={styles.profileBigAvatar}>
                <Text style={styles.profileBigAvatarText}>
                  {(userProfile?.fullName || 'M')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileUserName, isDarkMode && styles.textPrimaryDark]}>
                  {userProfile?.fullName || 'Matheus Morante'}
                </Text>
                <Text style={styles.profileUserEmail}>
                  {userProfile?.email || 'matheusmorante002@gmail.com'}
                </Text>
                <View style={styles.roleBadgeContainer}>
                  <ShieldCheck size={12} color="#10b981" style={{ marginRight: 4 }} />
                  <Text style={styles.roleBadgeText}>
                    {userProfile?.role === 'administrator' ? 'Administrador Master' : (userProfile?.role || 'Colaborador')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Menu de Ações */}
            <View style={styles.profileMenuItems}>
              {/* Botão Configurações */}
              <TouchableOpacity
                style={[styles.profileMenuItem, isDarkMode && styles.profileMenuItemDark]}
                onPress={() => {
                  setShowProfileModal(false);
                  handleTabChange('configuracoes', `${WEB_URL}/settings`);
                }}
              >
                <View style={styles.profileMenuIconWrapper}>
                  <Settings size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileMenuLabel, isDarkMode && styles.textPrimaryDark]}>Configurações</Text>
                  <Text style={styles.profileMenuSubtext}>Preferências gerais e dados do sistema</Text>
                </View>
              </TouchableOpacity>

              {/* Botão Sair da Conta */}
              <TouchableOpacity
                style={[styles.profileMenuItem, styles.profileLogoutItem]}
                onPress={() => {
                  setShowProfileModal(false);
                  handleLogout();
                }}
              >
                <View style={[styles.profileMenuIconWrapper, { backgroundColor: '#fee2e2' }]}>
                  <LogOut size={18} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileMenuLabel, { color: '#ef4444' }]}>Sair do Aplicativo</Text>
                  <Text style={styles.profileMenuSubtext}>Encerrar sessão no dispositivo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  headerSubtitle: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  textPrimaryDark: { color: '#f8fafc' },
  textMutedDark: { color: '#94a3b8' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeContainer: { position: 'relative' },
  iconButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  iconButtonDark: { backgroundColor: '#1e293b' },
  profileAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  redBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#ffffff' },
  badgeText: { color: '#ffffff', fontSize: 8, fontWeight: '900' },
  
  // Estilos do Modal de Perfil e Configurações
  profileModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  profileModalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileUserCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  profileBigAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBigAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  profileUserName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileUserEmail: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  profileMenuItems: {
    gap: 10,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileMenuItemDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  profileLogoutItem: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  profileMenuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMenuLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  profileMenuSubtext: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },

  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flex: 1, padding: 20 },
  dateHeader: { marginBottom: 16 },
  dateText: { fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  welcomeText: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 4, letterSpacing: -0.5 },
  
  // Botão Select Bonito Inline
  periodSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  periodSelectButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
  },

  // Modal UX de Seleção
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  periodModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  periodModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  periodModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  periodModalOptionsList: {
    gap: 6,
  },
  periodModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  periodModalOptionActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  periodModalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  periodModalOptionTextActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
  
  // Estilos de Filtro por Período
  periodFilterContainer: { marginBottom: 20 },
  periodFilterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  periodFilterTitle: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  periodChipsScroll: { gap: 8, paddingRight: 10 },
  periodChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  periodChipTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },

  // Grid 2x2 de Estatísticas
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 25,
  },
  statCardGrid: {
    width: '48%',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10 },
  deliveryCard: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  assemblyCard: { backgroundColor: '#f5f3ff', borderColor: '#ede9fe' },
  assistanceCard: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  returnCard: { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' },
  statIconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginTop: 12, letterSpacing: -1 },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: 1 },
  clearText: { fontSize: 10, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 20 },
  emptyIconWrapper: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
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
  infoText: { flex: 1, fontSize: 10, fontWeight: '600', color: '#f8fafc', lineHeight: 16 },
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
  navText: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginTop: 4, letterSpacing: 0.5 },
  navTextActive: { color: '#2563eb' },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#fee2e2', borderRadius: 12 },
  logoutText: { fontSize: 11, fontWeight: '800', color: '#ef4444' },

  // Estilos da Tela de Login Nativa Mobile
  loginContainer: { flex: 1, backgroundColor: '#f8fafc' },
  loginScrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  loginHeader: { alignItems: 'center', marginBottom: 28 },
  loginLogoWrapper: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loginLogoText: { color: '#ffffff', fontSize: 30, fontWeight: '900', fontStyle: 'italic' },
  loginTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5 },
  loginSubtitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginTop: 4 },
  loginErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  loginErrorText: { flex: 1, color: '#ef4444', fontSize: 11, fontWeight: '700' },
  formGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  eyeButton: { padding: 4 },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    height: 52,
    elevation: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  googleButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
  },
  loginFooterText: { textAlign: 'center', marginTop: 24, fontSize: 9, fontWeight: '900', color: '#cbd5e1', letterSpacing: 2 },
});
