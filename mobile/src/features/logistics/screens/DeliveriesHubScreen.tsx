import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LayoutGrid, ListTodo, Map, Wrench } from 'lucide-react-native';
import {
  useDeliveryRoute,
  DeliveryRouteDateScope,
  DeliveryRouteItem,
} from '../hooks/useDeliveryRoute';
import { DeliveriesMapExperience } from '../components/deliveryMap/DeliveriesMapExperience';
import { TodaySummaryCard } from '../components/TodaySummaryCard';
import { DeliveryTimelineView } from '../components/schedule/DeliveryTimelineView';
import { NativeAssembliesScreen } from '../../assemblies/screens/NativeAssembliesScreen';
import { getAssemblyTasks } from '../../assemblies/assemblyTasks';
import type { AssemblyHandlingOption } from '../../../utils/aiSummaryHelper';
import { addDaysToLocalDateString, getLocalDateString } from '../../../utils/orderUtils';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { supabase } from '../../../services/supabaseClient';
import { useScopedOrderSchedule } from '../hooks/useScopedOrderSchedule';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';

export type DeliveriesSubTab = 'today' | 'schedule' | 'assemblies' | 'map';

const OPERATIONS_TABS = [
  { key: 'today', label: 'Resumo', Icon: LayoutGrid },
  { key: 'schedule', label: 'Programação', Icon: ListTodo },
  { key: 'assemblies', label: 'Montagens', Icon: Wrench },
  { key: 'map', label: 'Mapa', Icon: Map },
] as const;

interface Props {
  isDarkMode?: boolean;
  isAdmin?: boolean;
  initialTab?: DeliveriesSubTab;
  initialAssemblySubTab?: 'all' | 'internal' | 'outside';
  userProfile?: any;
  onSelectOrder: (order: any) => void;
}

export const DeliveriesHubScreen: React.FC<Props> = ({
  isDarkMode = false,
  isAdmin = false,
  initialTab = 'today',
  initialAssemblySubTab = 'all',
  userProfile,
  onSelectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<DeliveriesSubTab>(initialTab);
  const [scheduleDateScope, setScheduleDateScope] = useState<DeliveryRouteDateScope>('today');
  const [handlingOptions, setHandlingOptions] = useState<AssemblyHandlingOption[]>([]);

  useEffect(() => {
    let active = true;
    const loadHandlingOptions = async () => {
      const cached = await offlineStorageService
        .getWorkingSet<AssemblyHandlingOption[]>('order_handling_options_v1')
        .catch(() => null);
      if (active && Array.isArray(cached?.data)) setHandlingOptions(cached.data);

      try {
        const { data, error } = await withAbortTimeout(supabase.from('settings').select('data').eq('id', 'app').limit(1), 'operacoes:opcoes-manuseio', 15_000);
        if (active && !error && data?.length) {
          const settings = data[0]?.data || data[0];
          const options = [
            ...(settings.deliveryHandlingOptions || []),
            ...(settings.pickupHandlingOptions || []),
          ];
          setHandlingOptions(options);
          void offlineStorageService
            .cacheWorkingSet('order_handling_options_v1', options)
            .catch(() => {});
        }
      } catch {}
    };

    void loadHandlingOptions();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Hooks de dados e localização compartilhados entre Resumo, Programação e Mapa.
  const {
    orders,
    routeItems,
    dateScopeCounts,
    currentDelivery,
    nextDelivery,
    stats,
    loading,
    refreshing,
    showingOffline,
    error,
    onRefresh,
  } = useDeliveryRoute(scheduleDateScope);
  const summaryAssemblies = useScopedOrderSchedule('assembly_mobile', { dateScope: scheduleDateScope }, 'assemblies_orders', activeTab === 'today');
  const todayDate = getLocalDateString(new Date());
  const tomorrowDate = addDaysToLocalDateString(todayDate, 1);
  const assemblyTasks = useMemo(
    () => getAssemblyTasks(summaryAssemblies.orders, handlingOptions),
    [summaryAssemblies.orders, handlingOptions]
  );
  const visibleAssemblyTasks = useMemo(
    () =>
      assemblyTasks
        .filter((task) =>
          scheduleDateScope === 'today'
            ? task.dateKey === todayDate
            : scheduleDateScope === 'tomorrow'
              ? task.dateKey === tomorrowDate
              : task.dateKey > tomorrowDate
        )
        .sort(
          (a, b) =>
            a.dateKey.localeCompare(b.dateKey) ||
            (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
        ),
    [assemblyTasks, scheduleDateScope, todayDate, tomorrowDate]
  );
  const handleSelectDeliveryOrder = useCallback(
    (item: DeliveryRouteItem) => {
      onSelectOrder(item.order);
    },
    [onSelectOrder]
  );

  const handleOpenDeliveryFlow = useCallback(
    (item: DeliveryRouteItem) => {
      onSelectOrder({ ...item.order, _openDeliveryPreparation: true });
    },
    [onSelectOrder]
  );
  const handleViewOrder = handleSelectDeliveryOrder;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {showingOffline ? <Text style={styles.loadingText}>Sem conexão. Exibindo os pedidos salvos neste aparelho.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.loadingText}>{error}</Text> : null}
      {/* Barra de abas de Operações */}
      <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark]}>
        <View style={styles.titleRow}>
          <View style={[styles.dateScopeContainer, isDarkMode && styles.dateScopeContainerDark]}>
            <TouchableOpacity
              style={[
                styles.dateScopeBtn,
                scheduleDateScope === 'today' && styles.dateScopeBtnActive,
              ]}
              onPress={() => setScheduleDateScope('today')}
              accessibilityRole="button"
              accessibilityState={{ selected: scheduleDateScope === 'today' }}
              hitSlop={{ top: 5, bottom: 5 }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dateScopeBtnText,
                  isDarkMode && styles.dateScopeBtnTextDark,
                  scheduleDateScope === 'today' && styles.dateScopeBtnTextActive,
                ]}
              >
                Hoje {dateScopeCounts.today}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateScopeBtn,
                scheduleDateScope === 'tomorrow' && styles.dateScopeBtnActive,
              ]}
              onPress={() => setScheduleDateScope('tomorrow')}
              accessibilityRole="button"
              accessibilityState={{ selected: scheduleDateScope === 'tomorrow' }}
              hitSlop={{ top: 5, bottom: 5 }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dateScopeBtnText,
                  isDarkMode && styles.dateScopeBtnTextDark,
                  scheduleDateScope === 'tomorrow' && styles.dateScopeBtnTextActive,
                ]}
              >
                Amanhã {dateScopeCounts.tomorrow}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateScopeBtn,
                scheduleDateScope === 'next_days' && styles.dateScopeBtnActive,
              ]}
              onPress={() => setScheduleDateScope('next_days')}
              accessibilityRole="button"
              accessibilityState={{ selected: scheduleDateScope === 'next_days' }}
              hitSlop={{ top: 5, bottom: 5 }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dateScopeBtnText,
                  isDarkMode && styles.dateScopeBtnTextDark,
                  scheduleDateScope === 'next_days' && styles.dateScopeBtnTextActive,
                ]}
              >
                Próximos {dateScopeCounts.next_days}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Abas Resumo, Programação, Montagens e Mapa */}
        <View style={[styles.tabsViewport, isDarkMode && styles.tabsViewportDark]}>
          {OPERATIONS_TABS.map(({ key, label, Icon }) => {
            const selected = activeTab === key;
            const iconColor = selected
              ? isDarkMode
                ? '#60a5fa'
                : '#2563eb'
              : isDarkMode
                ? '#cbd5e1'
                : '#64748b';
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tabBtn,
                  isDarkMode && styles.tabBtnDark,
                  selected && styles.tabBtnActive,
                  selected && isDarkMode && styles.tabBtnActiveDark,
                ]}
                onPress={() => setActiveTab(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                activeOpacity={0.8}
              >
                <Icon size={17} color={iconColor} strokeWidth={2.2} />
                <Text
                  style={[
                    styles.tabBtnText,
                    isDarkMode && styles.tabBtnTextDark,
                    selected && styles.tabBtnTextActive,
                    selected && isDarkMode && styles.tabBtnTextActiveDark,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Conteúdo Dinâmico Conforme a Sub-aba Selecionada */}
      {activeTab === 'today' ? (
        /* Aba RESUMO: visão consolidada da operação */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
        >
          <TodaySummaryCard
            orders={orders && orders.length > 0 ? orders : routeItems.map((item) => item.order)}
            activities={routeItems}
            assemblyTasks={visibleAssemblyTasks}
            onViewSchedule={() => setActiveTab('schedule')}
            onViewAssemblies={() => setActiveTab('assemblies')}
            periodFilter={scheduleDateScope}
            isDarkMode={isDarkMode}
          />
        </ScrollView>
      ) : activeTab === 'schedule' ? (
        /* Aba PROGRAMAÇÃO: timeline vertical de atividades */
        loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>
              Carregando atividades...
            </Text>
          </View>
        ) : (
          <DeliveryTimelineView
            items={routeItems}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onViewOrder={handleViewOrder}
            handlingOptions={handlingOptions}
            dateScope={scheduleDateScope}
            isDarkMode={isDarkMode}
          />
        )
      ) : activeTab === 'assemblies' ? (
        <NativeAssembliesScreen
          isDarkMode={isDarkMode}
          initialSubTab={initialAssemblySubTab}
          dateScope={scheduleDateScope}
          handlingOptions={handlingOptions}
          onSelectOrder={onSelectOrder}
        />
      ) : (
        null
      )}

      <DeliveriesMapExperience
        active={activeTab === 'map'}
        isDarkMode={isDarkMode}
        userProfile={userProfile}
        routeItems={routeItems}
        currentDelivery={currentDelivery}
        loading={loading}
        dateScope={scheduleDateScope}
        onViewOrder={handleViewOrder}
        onOpenDeliveryFlow={handleOpenDeliveryFlow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContainerDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  titleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  dateScopeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 4,
    gap: 3,
  },
  dateScopeContainerDark: {
    backgroundColor: '#020617',
    borderColor: '#334155',
  },
  dateScopeBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 11,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateScopeBtnActive: {
    backgroundColor: '#2563eb',
  },
  dateScopeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dateScopeBtnTextDark: {
    color: '#cbd5e1',
  },
  dateScopeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  tabsViewport: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    minHeight: 60,
    marginTop: 8,
    padding: 4,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
  },
  tabsViewportDark: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 1,
    borderRadius: 10,
  },
  tabBtnDark: {
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#dbeafe',
  },
  tabBtnActiveDark: {
    backgroundColor: '#0f172a',
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabBtnTextDark: {
    color: '#cbd5e1',
  },
  tabBtnTextActive: {
    color: '#2563eb',
  },
  tabBtnTextActiveDark: { color: '#60a5fa' },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  floatingCardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
});
