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
import {
  useDeliveryRoute,
  DeliveryRouteDateScope,
  DeliveryRouteItem,
} from '../hooks/useDeliveryRoute';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useRoutesApi } from '../hooks/useRoutesApi';
import { useTeamLocations } from '../hooks/useTeamLocations';
import { DeliveryMapView } from '../components/deliveryMap/DeliveryMapView';
import { MapErrorBoundary } from '../components/deliveryMap/MapErrorBoundary';
import { DeliveryBottomSheet } from '../components/deliveryMap/DeliveryBottomSheet';
import { TodaySummaryCard } from '../components/TodaySummaryCard';
import { DeliveryTimelineView } from '../components/schedule/DeliveryTimelineView';
import { NativeAssembliesScreen } from '../../assemblies/screens/NativeAssembliesScreen';
import { getAssemblyTasks } from '../../assemblies/assemblyTasks';
import type { AssemblyHandlingOption } from '../../../utils/aiSummaryHelper';
import { addDaysToLocalDateString, getLocalDateString } from '../../../utils/orderUtils';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { supabase } from '../../../services/supabaseClient';
import { classifyDeliveryService } from '../domain/deliveryServiceClassification';

export type DeliveriesSubTab = 'today' | 'schedule' | 'assemblies' | 'map';
type MapActivityFilter = 'delivery' | 'assistance' | 'return';

const MAP_ACTIVITY_FILTERS: { key: MapActivityFilter; label: string }[] = [
  { key: 'delivery', label: 'Entregas' },
  { key: 'assistance', label: 'Assistência' },
  { key: 'return', label: 'Coleta de devolução' },
];

const getMapActivityType = (item: DeliveryRouteItem): MapActivityFilter | null => {
  if (item.activityType === 'assistance') return 'assistance';
  if (item.activityType === 'return') return 'return';
  const service = classifyDeliveryService(item.order);
  if (service.isDelivery) return 'delivery';
  return null;
};

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
  const [selectedMarkerItem, setSelectedMarkerItem] = useState<DeliveryRouteItem | null>(null);
  const [selectedMapFilter, setSelectedMapFilter] = useState<MapActivityFilter>('delivery');
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
        const { data, error } = await supabase.from('settings').select('*').limit(1);
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

  // Hooks de dados e localização compartilhados entre Resumo, Entregas e Mapa.
  const {
    orders,
    routeItems,
    dateScopeCounts,
    currentDelivery,
    nextDelivery,
    stats,
    loading,
    refreshing,
    onRefresh,
  } = useDeliveryRoute(scheduleDateScope);
  const todayDate = getLocalDateString(new Date());
  const tomorrowDate = addDaysToLocalDateString(todayDate, 1);
  const assemblyTasks = useMemo(
    () => getAssemblyTasks(orders, handlingOptions),
    [orders, handlingOptions]
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
  useEffect(() => setSelectedMarkerItem(null), [scheduleDateScope]);
  const mapFilterCounts = useMemo(
    () =>
      routeItems.reduce(
        (counts, item) => {
          const type = getMapActivityType(item);
          if (type) counts[type] += 1;
          return counts;
        },
        { delivery: 0, assistance: 0, return: 0 }
      ),
    [routeItems]
  );
  const mapItems = useMemo(
    () => routeItems.filter((item) => getMapActivityType(item) === selectedMapFilter),
    [routeItems, selectedMapFilter]
  );
  useEffect(() => setSelectedMarkerItem(null), [selectedMapFilter]);
  const { coords: driverCoords, gpsEnabled } = useDriverLocation();
  const isDelivering = Boolean(currentDelivery);
  const activeOrder = currentDelivery
    ? { id: currentDelivery.id, code: currentDelivery.orderIndex }
    : null;

  const { teamMembers } = useTeamLocations({
    userProfile,
    myCoords: driverCoords,
    isGpsActive: gpsEnabled && Boolean(driverCoords),
    isDelivering,
    activeOrder,
  });

  // Coordenadas padrão do depósito Morante (Curitiba/Colombo - PR - R. Cascavel, 306 - Loja Física)
  const storeCoords = useMemo(
    () => ({
      latitude: -25.35212,
      longitude: -49.16933,
    }),
    []
  );

  // Alvo ativo da rota: SOMENTE a parada clicada pelo motorista no mapa (sem rota forçada por padrão)
  const activeDeliveryTarget = selectedMarkerItem;

  // Polyline e métricas da Routes API entre motorista e parada selecionada (somente quando houver seleção explícita)
  const { polylineCoords, distanceKm, durationMin } = useRoutesApi({
    origin: driverCoords || storeCoords,
    destination: activeDeliveryTarget?.coords || null,
    enabled: activeTab === 'map' && !!activeDeliveryTarget?.coords,
  });

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
                Hoje ({dateScopeCounts.today})
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
                Amanhã ({dateScopeCounts.tomorrow})
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
                Dias Seguintes ({dateScopeCounts.next_days})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Abas Resumo, Entregas, Montagens e Mapa */}
        <View style={styles.tabsViewport}>
          <ScrollView
            style={styles.tabsScrollView}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsPillContainer}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'today' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('today')}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'today' }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'today' && styles.tabBtnTextActive,
                  isDarkMode && activeTab === 'today' && styles.tabBtnTextActiveDark,
                ]}
              >
                Resumo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'schedule' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('schedule')}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'schedule' }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'schedule' && styles.tabBtnTextActive,
                  isDarkMode && activeTab === 'schedule' && styles.tabBtnTextActiveDark,
                ]}
              >
                Entregas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'assemblies' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('assemblies')}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'assemblies' }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'assemblies' && styles.tabBtnTextActive,
                  isDarkMode && activeTab === 'assemblies' && styles.tabBtnTextActiveDark,
                ]}
              >
                Montagens
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'map' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('map')}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'map' }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'map' && styles.tabBtnTextActive,
                  isDarkMode && activeTab === 'map' && styles.tabBtnTextActiveDark,
                ]}
              >
                Mapa
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
            onSelectOrder={onSelectOrder}
            onViewAssemblies={() => setActiveTab('assemblies')}
            periodFilter={scheduleDateScope}
            isDarkMode={isDarkMode}
          />
        </ScrollView>
      ) : activeTab === 'schedule' ? (
        /* Aba ENTREGAS: Timeline vertical enxuta e focada */
        loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>
              Carregando entregas...
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
        /* Aba MAPA: Visão geográfica limpa no mapa */
        <View style={styles.mapArea}>
          <View style={styles.mapCanvas}>
            {loading ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>
                  Carregando mapa...
                </Text>
              </View>
            ) : (
              <MapErrorBoundary isDarkMode={isDarkMode}>
                <DeliveryMapView
                  items={mapItems}
                  driverCoords={driverCoords}
                  storeCoords={storeCoords}
                  polylineCoords={polylineCoords}
                  selectedItem={selectedMarkerItem}
                  onSelectMarker={(item) => setSelectedMarkerItem(item)}
                  isDarkMode={isDarkMode}
                  teamMembers={teamMembers}
                />
              </MapErrorBoundary>
            )}
            <View style={styles.mapFilterOverlay} pointerEvents="box-none">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.mapFilterScroll}
                contentContainerStyle={styles.mapFilterList}
                accessibilityLabel="Filtrar atividades no mapa"
              >
                {MAP_ACTIVITY_FILTERS.map(({ key, label }) => {
                  const selected = selectedMapFilter === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.mapFilterChip,
                        isDarkMode && styles.mapFilterChipDark,
                        selected && styles.mapFilterChipActive,
                        isDarkMode && selected && styles.mapFilterChipActiveDark,
                      ]}
                      onPress={() => {
                        setSelectedMapFilter(key);
                        setSelectedMarkerItem(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${label}: ${mapFilterCounts[key]} no mapa`}
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.mapFilterText,
                          isDarkMode && styles.mapFilterTextDark,
                          selected && styles.mapFilterTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.mapFilterCount,
                          isDarkMode && styles.mapFilterCountDark,
                          selected && styles.mapFilterCountActive,
                        ]}
                      >
                        {mapFilterCounts[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* Modal Resumido do Pedido (com botão de ver detalhes do pedido) */}
      <DeliveryBottomSheet
        item={selectedMarkerItem}
        distanceKm={distanceKm}
        durationMin={durationMin}
        onClose={() => setSelectedMarkerItem(null)}
        onViewOrder={handleViewOrder}
        onOpenDeliveryFlow={handleOpenDeliveryFlow}
        isDarkMode={isDarkMode}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  dateScopeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 0,
    gap: 0,
  },
  dateScopeContainerDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  dateScopeBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateScopeBtnActive: {
    backgroundColor: '#0055ff',
  },
  dateScopeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0055ff',
  },
  dateScopeBtnTextDark: {
    color: '#60a5fa',
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
  tabsPillContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    minWidth: 240,
  },
  tabsViewport: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 44,
    marginTop: 12,
  },
  tabsScrollView: { flex: 1, alignSelf: 'stretch' },
  tabBtn: {
    flex: 1,
    flexShrink: 0,
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563eb',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    flexShrink: 0,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  tabBtnTextActive: {
    color: '#2563eb',
  },
  tabBtnTextActiveDark: { color: '#60a5fa' },
  mapArea: {
    flex: 1,
  },
  mapCanvas: { flex: 1, position: 'relative' },
  mapFilterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 20,
    elevation: 10,
  },
  mapFilterScroll: { flex: 1 },
  mapFilterList: {
    height: 50,
    flexDirection: 'row',
    flexGrow: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  mapFilterChip: {
    height: 34,
    alignSelf: 'center',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  mapFilterChipDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  mapFilterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  mapFilterChipActiveDark: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  mapFilterText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  mapFilterTextDark: { color: '#cbd5e1' },
  mapFilterTextActive: { color: '#ffffff' },
  mapFilterCount: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  mapFilterCountDark: { color: '#94a3b8' },
  mapFilterCountActive: { color: '#ffffff' },
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
