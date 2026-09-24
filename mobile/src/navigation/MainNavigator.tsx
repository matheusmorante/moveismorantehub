import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAppNotifications } from '../contexts/NotificationContext';

import { DashboardHeader } from '../features/dashboard/components/DashboardHeader';
import { NativeBottomNav } from '../features/dashboard/components/NativeBottomNav';

import { NativeOrdersScreen } from '../features/orders/screens/NativeOrdersScreen';
import { NativeLogisticsScreen } from '../features/logistics/screens/NativeLogisticsScreen';
import { DeliveriesHubScreen } from '../features/logistics/screens/DeliveriesHubScreen';
import { NativeAssembliesScreen } from '../features/assemblies/screens/NativeAssembliesScreen';
import { NativeReportsScreen } from '../features/reports/screens/NativeReportsScreen';
import { NativeSettingsScreen } from '../features/settings/screens/NativeSettingsScreen';
import { NativeProductsScreen } from '../features/products';
import { FinanceHubScreen } from '../features/finance/screens/FinanceHubScreen';
import { GlobalAgentScreen } from '../features/agent/screens/GlobalAgentScreen';
import { NativeStockScreen } from '../features/stock/overview/NativeStockScreen';

import { NotificationsModal } from '../components/modals/NotificationsModal';
import { ProfileModal } from '../components/modals/ProfileModal';
import { OrderDetailsModal } from '../components/modals/OrderDetailsModal';
import { OfflineSyncBar } from '../components/shared/OfflineSyncBar';
import { WEB_URL } from '../services/supabaseClient';

interface MainNavigatorProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export const MainNavigator: React.FC<MainNavigatorProps> = ({ isDarkMode, setIsDarkMode }) => {
  const { userProfile, isAdmin, isAssemblerDriver, isSeller, canSeeReports, canSeeProducts, canSeeFinance, handleLogout } = useAuth();
  const { notifications, unreadCount, handleOpenNotificationsModal } = useAppNotifications();

  const [currentTab, setCurrentTab] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tab = p.get('tab');
      if (tab && tab !== 'home') return tab;
    }
    return 'entregas';
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [appSelectedOrder, setAppSelectedOrder] = useState<any>(null);

  const assemblySubTab: 'internal' | 'outside' = 'internal';
  const [deliveriesSubTab, setDeliveriesSubTab] = useState<'today' | 'map'>('today');

  const handleTabChange = (newTab: string, url: string) => {
    if (newTab === 'configuracoes') {
      void url;
      setCurrentTab('configuracoes');
      return;
    }
    if (newTab === 'entregas' && currentTab !== 'entregas') {
      setDeliveriesSubTab('today');
    }
    setCurrentTab(newTab);
  };

  const headerTitle = currentTab === 'entregas' || currentTab === 'montagens'
    ? 'Operações'
    : currentTab === 'agenda' || currentTab === 'logistica' || currentTab === 'cronograma'
      ? 'Agenda'
      : ({
          agente: 'Assistente',
          financeiro: 'Financeiro',
          pedidos: 'Pedidos',
          produtos: 'Produtos',
          configuracoes: 'Configurações',
          estoque: 'Estoque',
          relatorios: 'Relatórios',
        } as Record<string, string>)[currentTab] || 'Morante';

  const handleSelectNotificationOrderWrapper = async (order: any) => {
    if (!order?.__notificationOrderReference) {
      setAppSelectedOrder(order);
      return;
    }

    try {
      // @ts-ignore (import supabase if needed, but it's not imported here yet)
      const { supabase } = require('../services/supabaseClient');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .maybeSingle();
      if (!error && data) setAppSelectedOrder(data);
    } catch (error) {
      console.warn('[Notifications] Não foi possível carregar o pedido:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <DashboardHeader
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        setShowProfileModal={setShowProfileModal}
        title={headerTitle}
        onOpenSettings={() => handleTabChange('configuracoes', `${WEB_URL}/settings`)}
        onLogout={handleLogout}
        handleOpenNotificationsModal={() => {
          setShowNotificationsModal(true);
          handleOpenNotificationsModal();
        }}
        unreadCount={unreadCount}
      />
      <OfflineSyncBar isDarkMode={isDarkMode} />
      
      {currentTab === 'agente' ? (
        <GlobalAgentScreen isDarkMode={isDarkMode} userProfile={userProfile} />
      ) : currentTab === 'financeiro' && canSeeFinance ? (
        <FinanceHubScreen isDarkMode={isDarkMode} userProfile={userProfile} />
      ) : currentTab === 'pedidos' ? (
        <NativeOrdersScreen isDarkMode={isDarkMode} isAdmin={isAdmin} onSelectOrder={setAppSelectedOrder} />
      ) : currentTab === 'produtos' && canSeeProducts ? (
        <NativeProductsScreen isDarkMode={isDarkMode} userProfile={userProfile} />
      ) : currentTab === 'entregas' ? (
        <DeliveriesHubScreen
          isDarkMode={isDarkMode}
          isAdmin={isAdmin}
          userProfile={userProfile}
          initialTab={deliveriesSubTab}
          onSelectOrder={setAppSelectedOrder}
        />
      ) : (currentTab === 'agenda' || currentTab === 'logistica' || currentTab === 'cronograma') ? (
        <NativeLogisticsScreen
          isDarkMode={isDarkMode}
          isAdmin={isAdmin}
          userProfile={userProfile}
          onSelectOrder={setAppSelectedOrder}
          onNavigateToDeliveriesMap={() => {
            setDeliveriesSubTab('map');
            setCurrentTab('entregas');
          }}
        />
      ) : currentTab === 'montagens' ? (
        <NativeAssembliesScreen isDarkMode={isDarkMode} initialSubTab={assemblySubTab} onSelectOrder={setAppSelectedOrder} />
      ) : currentTab === 'configuracoes' ? (
        <NativeSettingsScreen isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} isAdmin={isAdmin} onBack={() => setCurrentTab('entregas')} />
      ) : currentTab === 'estoque' ? (
        <NativeStockScreen isDarkMode={isDarkMode} userProfile={userProfile} />
      ) : canSeeReports ? (
        <NativeReportsScreen isDarkMode={isDarkMode} />
      ) : (
        <NativeOrdersScreen isDarkMode={isDarkMode} isAdmin={isAdmin} onSelectOrder={setAppSelectedOrder} />
      )}

      {/* Navegação Inferior Nativa */}
      <NativeBottomNav
        isDarkMode={isDarkMode}
        currentTab={currentTab}
        canSeeReports={canSeeReports}
        canSeeProducts={canSeeProducts}
        canSeeFinance={canSeeFinance}
        handleTabChange={handleTabChange}
        WEB_URL={WEB_URL}
      />

      {/* Modais Globais */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        isDarkMode={isDarkMode}
        notifications={notifications}
        onSelectOrder={handleSelectNotificationOrderWrapper}
      />

      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        isDarkMode={isDarkMode}
        userProfile={userProfile}
        isAdmin={isAdmin}
        isAssemblerDriver={isAssemblerDriver}
        handleTabChange={handleTabChange}
        handleLogout={handleLogout}
        WEB_URL={WEB_URL}
      />

      <OrderDetailsModal
        order={appSelectedOrder}
        onClose={() => setAppSelectedOrder(null)}
        isDarkMode={isDarkMode}
        userRole={userProfile?.role}
        userProfile={userProfile}
      />
    </View>
  );
};
