import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useDeliveryRoute, DeliveryRouteDateScope, DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useRoutesApi } from '../hooks/useRoutesApi';
import { useTeamLocations } from '../hooks/useTeamLocations';
import { DeliveryMapView } from '../components/deliveryMap/DeliveryMapView';
import { MapErrorBoundary } from '../components/deliveryMap/MapErrorBoundary';
import { DeliveryBottomSheet } from '../components/deliveryMap/DeliveryBottomSheet';
import { TodaySummaryCard } from '../components/TodaySummaryCard';
import { DeliveryTimelineView } from '../components/schedule/DeliveryTimelineView';
import { NativeAssembliesScreen } from '../../assemblies/screens/NativeAssembliesScreen';

export type DeliveriesSubTab = 'today' | 'schedule' | 'assemblies' | 'map';

interface Props {
  isDarkMode?: boolean;
  isAdmin?: boolean;
  initialTab?: DeliveriesSubTab;
  initialAssemblySubTab?: 'internal' | 'outside';
  userProfile?: any;
  onSelectOrder: (order: any) => void;
}

export const DeliveriesHubScreen: React.FC<Props> = ({
  isDarkMode = false,
  isAdmin = false,
  initialTab = 'today',
  initialAssemblySubTab = 'internal',
  userProfile,
  onSelectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<DeliveriesSubTab>(initialTab);
  const [selectedMarkerItem, setSelectedMarkerItem] = useState<DeliveryRouteItem | null>(null);
  const [scheduleDateScope, setScheduleDateScope] = useState<DeliveryRouteDateScope>('today');
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabsScrollMetrics = useRef({ viewport: 0, content: 0, offset: 0 });
  const tabLayouts = useRef<Partial<Record<DeliveriesSubTab, { x: number; width: number }>>>({});
  const [tabsScrollEdges, setTabsScrollEdges] = useState({ left: false, right: false });
  const [tabWidth, setTabWidth] = useState(78);
  const updateTabsScrollMetrics = (update: Partial<typeof tabsScrollMetrics.current>) => {
    const metrics = { ...tabsScrollMetrics.current, ...update };
    tabsScrollMetrics.current = metrics;
    const edges = {
      left: metrics.offset > 1,
      right: metrics.content > metrics.viewport + 1 && metrics.offset < metrics.content - metrics.viewport - 1,
    };
    setTabsScrollEdges(current => current.left === edges.left && current.right === edges.right ? current : edges);
  };
  const scrollTabs = (direction: -1 | 1) => {
    if (direction > 0) {
      tabsScrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    const metrics = tabsScrollMetrics.current;
    const maxOffset = Math.max(0, metrics.content - metrics.viewport);
    const nextOffset = Math.max(0, Math.min(maxOffset, metrics.offset + direction * Math.max(120, metrics.viewport * 0.75)));
    tabsScrollRef.current?.scrollTo({ x: nextOffset, animated: true });
  };

  const scrollTabIntoView = useCallback((tab: DeliveriesSubTab) => {
    const layout = tabLayouts.current[tab];
    const { viewport, offset } = tabsScrollMetrics.current;
    if (!layout || !viewport) return;

    if (layout.x < offset) {
      tabsScrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 8), animated: true });
    } else if (layout.x + layout.width > offset + viewport) {
      tabsScrollRef.current?.scrollTo({ x: layout.x + layout.width - viewport + 8, animated: true });
    }
  }, []);

  const recordTabLayout = useCallback((tab: DeliveriesSubTab, event: any) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[tab] = { x, width };
    if (tab === activeTab) setTimeout(() => scrollTabIntoView(tab), 0);
  }, [activeTab, scrollTabIntoView]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const timer = setTimeout(() => scrollTabIntoView(activeTab), 0);
    return () => clearTimeout(timer);
  }, [activeTab, scrollTabIntoView]);

  // Hooks de Dados e Localização (unificado para as 3 abas: Resumo, Cronograma e Mapa)
  const { orders, routeItems, currentDelivery, nextDelivery, stats, loading, refreshing, onRefresh } = useDeliveryRoute(
    scheduleDateScope,
  );
  const { coords: driverCoords } = useDriverLocation();
  const isDelivering = Boolean(currentDelivery);
  const activeOrder = currentDelivery ? { id: currentDelivery.id, code: currentDelivery.orderIndex } : null;

  const { teamMembers } = useTeamLocations({
    userProfile,
    myCoords: driverCoords,
    isGpsActive: Boolean(driverCoords),
    isDelivering,
    activeOrder,
  });

  // Coordenadas padrão do depósito Morante (Curitiba/Colombo - PR - R. Cascavel, 306 - Loja Física)
  const storeCoords = useMemo(() => ({
    latitude: -25.35212,
    longitude: -49.16933,
  }), []);

  // Alvo ativo da rota: SOMENTE a parada clicada pelo motorista no mapa (sem rota forçada por padrão)
  const activeDeliveryTarget = selectedMarkerItem;

  // Polyline e métricas da Routes API entre motorista e parada selecionada (somente quando houver seleção explícita)
  const { polylineCoords, distanceKm, durationMin } = useRoutesApi({
    origin: driverCoords || storeCoords,
    destination: activeDeliveryTarget?.coords || null,
    enabled: activeTab === 'map' && !!activeDeliveryTarget?.coords,
  });

  const handleStartDelivery = (item: DeliveryRouteItem) => {
    onSelectOrder(item.order);
  };

  const handleViewOrder = (item: DeliveryRouteItem) => {
    onSelectOrder(item.order);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Barra de Tabs Superior: [ Resumo ] [ Cronograma ] [ Montagens ] [ Mapa ] */}
      <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark]}>
        <View style={styles.titleRow}>
          {/* Filtro Global de Período posicionado na linha do título: [ Hoje ] [ Dias seguintes ] */}
          {activeTab !== 'assemblies' && <View style={[styles.dateScopeContainer, isDarkMode && styles.dateScopeContainerDark]}>
            <TouchableOpacity
              style={[styles.dateScopeBtn, scheduleDateScope === 'today' && styles.dateScopeBtnActive]}
              onPress={() => setScheduleDateScope('today')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateScopeBtnText, scheduleDateScope === 'today' && styles.dateScopeBtnTextActive]}>
                Hoje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateScopeBtn, scheduleDateScope === 'next_days' && styles.dateScopeBtnActive]}
              onPress={() => setScheduleDateScope('next_days')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateScopeBtnText, scheduleDateScope === 'next_days' && styles.dateScopeBtnTextActive]}>
                Dias Seguintes
              </Text>
            </TouchableOpacity>
          </View>}
        </View>

        {/* Tabs no Topo em Pílulas: [ Resumo ] [ Cronograma ] [ Montagens ] [ Mapa ] */}
        <View style={styles.tabsViewport}>
          <View style={styles.tabArrowSlot}>
            {tabsScrollEdges.left && <TouchableOpacity
                style={[styles.tabArrow, isDarkMode && styles.tabArrowDark]}
                onPress={() => scrollTabs(-1)}
                accessibilityRole="button"
                accessibilityLabel="Rolar abas para a esquerda"
                hitSlop={6}
              >
                <ChevronLeft size={18} color={isDarkMode ? '#e2e8f0' : '#2563eb'} />
              </TouchableOpacity>}
          </View>
          <ScrollView
            ref={tabsScrollRef}
            style={styles.tabsScrollView}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsPillContainer}
            onLayout={({ nativeEvent }) => {
              const width = nativeEvent.layout.width;
              setTabWidth(width / 3);
              updateTabsScrollMetrics({ viewport: width });
            }}
            onContentSizeChange={(content) => updateTabsScrollMetrics({ content })}
            onScroll={({ nativeEvent }) => updateTabsScrollMetrics({ offset: nativeEvent.contentOffset.x })}
            scrollEventThrottle={32}
          >
          <TouchableOpacity
            style={[styles.tabBtn, { width: tabWidth }, activeTab === 'today' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('today', event)}
            onPress={() => setActiveTab('today')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'today' && styles.tabBtnTextActive]}>
              Resumo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, { width: tabWidth }, activeTab === 'schedule' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('schedule', event)}
            onPress={() => setActiveTab('schedule')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'schedule' && styles.tabBtnTextActive]}>
              Cronograma
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, { width: tabWidth }, activeTab === 'assemblies' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('assemblies', event)}
            onPress={() => setActiveTab('assemblies')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'assemblies' && styles.tabBtnTextActive]}>
              Montagens
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, { width: tabWidth }, activeTab === 'map' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('map', event)}
            onPress={() => setActiveTab('map')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'map' && styles.tabBtnTextActive]}>
              Mapa
            </Text>
          </TouchableOpacity>
          </ScrollView>
          <View style={styles.tabArrowSlot}>
            {tabsScrollEdges.right && <TouchableOpacity
                style={[styles.tabArrow, styles.tabArrowActive, isDarkMode && styles.tabArrowActiveDark]}
                onPress={() => scrollTabs(1)}
                accessibilityRole="button"
                accessibilityLabel="Rolar abas para a direita"
                hitSlop={6}
              >
                <ChevronRight size={18} color={isDarkMode ? '#ffffff' : '#2563eb'} />
              </TouchableOpacity>}
          </View>
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
            orders={orders && orders.length > 0 ? orders : routeItems.map(item => item.order)}
            onSelectOrder={onSelectOrder}
            periodFilter={scheduleDateScope}
            isDarkMode={isDarkMode}
          />
        </ScrollView>
      ) : activeTab === 'schedule' ? (
        /* Aba CRONOGRAMA: Timeline vertical enxuta e focada */
        loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>Carregando cronograma de operação...</Text>
          </View>
        ) : (
          <DeliveryTimelineView
            items={routeItems}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onStartDelivery={handleStartDelivery}
            onViewOrder={handleViewOrder}
            isDarkMode={isDarkMode}
          />
        )
      ) : activeTab === 'assemblies' ? (
        <NativeAssembliesScreen
          isDarkMode={isDarkMode}
          initialSubTab={initialAssemblySubTab}
          onSelectOrder={onSelectOrder}
        />
      ) : (
        /* Aba MAPA: Visão geográfica limpa no mapa */
        <View style={styles.mapArea}>
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>Carregando mapa...</Text>
            </View>
          ) : (
            <View style={{ flex: 1, position: 'relative' }}>
              <MapErrorBoundary isDarkMode={isDarkMode}>
                <DeliveryMapView
                  items={routeItems}
                  driverCoords={driverCoords}
                  storeCoords={storeCoords}
                  polylineCoords={polylineCoords}
                  selectedItem={selectedMarkerItem}
                  onSelectMarker={(item) => setSelectedMarkerItem(item)}
                  isDarkMode={isDarkMode}
                  teamMembers={teamMembers}
                />
              </MapErrorBoundary>
            </View>
          )}
        </View>
      )}

      {/* Modal Resumido do Pedido (com botão de ver detalhes do pedido) */}
      <DeliveryBottomSheet
        item={selectedMarkerItem}
        distanceKm={distanceKm}
        durationMin={durationMin}
        onClose={() => setSelectedMarkerItem(null)}
        onStartDelivery={handleStartDelivery}
        onViewOrder={handleViewOrder}
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
    paddingTop: 4,
    paddingBottom: 6,
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
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateScopeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0055ff',
    borderRadius: 22,
    padding: 3,
  },
  dateScopeContainerDark: {
    backgroundColor: '#1d4ed8',
  },
  dateScopeBtn: {
    paddingHorizontal: 13,
    paddingVertical: 5.5,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  dateScopeBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
    elevation: 2.5,
  },
  dateScopeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateScopeBtnTextActive: {
    color: '#0055ff',
    fontWeight: '900',
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
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  tabsViewport: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 42,
  },
  tabsScrollView: { flex: 1, alignSelf: 'stretch' },
  tabArrowSlot: { width: 34, alignItems: 'center', justifyContent: 'center' },
  tabArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    backgroundColor: '#eff6ff',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  tabArrowDark: { backgroundColor: '#1e293b' },
  tabArrowActive: { backgroundColor: '#dbeafe' },
  tabArrowActiveDark: { backgroundColor: '#1d4ed8' },
  tabBtn: {
    flexShrink: 0,
    width: 78,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
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
  mapArea: {
    flex: 1,
  },
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
