import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Map, CalendarClock, Hammer, ChevronLeft, ChevronRight } from 'lucide-react-native';
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
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DeliveriesSubTab>(initialTab);
  const [selectedMarkerItem, setSelectedMarkerItem] = useState<DeliveryRouteItem | null>(null);
  const [scheduleDateScope, setScheduleDateScope] = useState<DeliveryRouteDateScope>('today');
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabsScrollMetrics = useRef({ viewport: 0, content: 0, offset: 0 });
  const tabLayouts = useRef<Partial<Record<DeliveriesSubTab, { x: number; width: number }>>>({});
  const [tabsScrollEdges, setTabsScrollEdges] = useState({ left: false, right: false });
  const tabsEndGutter = 48;
  const getTabsContentWidth = () => Math.max(tabsScrollMetrics.current.content - tabsEndGutter, 0);
  const updateTabsScrollMetrics = (update: Partial<typeof tabsScrollMetrics.current>) => {
    const metrics = { ...tabsScrollMetrics.current, ...update };
    tabsScrollMetrics.current = metrics;
    const contentWidth = Math.max(metrics.content - tabsEndGutter, 0);
    const edges = {
      left: metrics.offset > 1,
      right: contentWidth > metrics.viewport + 1 && metrics.offset + metrics.viewport < contentWidth + tabsEndGutter - 1,
    };
    setTabsScrollEdges(current => current.left === edges.left && current.right === edges.right ? current : edges);
  };
  const scrollTabs = (direction: -1 | 1) => {
    if (direction > 0) {
      tabsScrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    const metrics = tabsScrollMetrics.current;
    const maxOffset = Math.max(0, getTabsContentWidth() - metrics.viewport);
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
      <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, isDarkMode && styles.textLight]}>Operações</Text>

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
        <View
          style={styles.tabsViewport}
        >
          <ScrollView
            ref={tabsScrollRef}
            style={[
              styles.tabsScrollView,
              tabsScrollEdges.left && styles.tabsScrollWithLeftArrow,
              tabsScrollEdges.right && styles.tabsScrollWithRightArrow,
            ]}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsPillContainer}
            onLayout={({ nativeEvent }) => updateTabsScrollMetrics({ viewport: nativeEvent.layout.width })}
            onContentSizeChange={(_, content) => updateTabsScrollMetrics({ content })}
            onScroll={({ nativeEvent }) => updateTabsScrollMetrics({ offset: nativeEvent.contentOffset.x })}
            scrollEventThrottle={32}
          >
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'today' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('today', event)}
            onPress={() => setActiveTab('today')}
            activeOpacity={0.8}
          >
            <FileText size={15} color={activeTab === 'today' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'today' && styles.tabBtnTextActive]}>
              Resumo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('schedule', event)}
            onPress={() => setActiveTab('schedule')}
            activeOpacity={0.8}
          >
            <CalendarClock size={15} color={activeTab === 'schedule' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'schedule' && styles.tabBtnTextActive]}>
              Cronograma
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'assemblies' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('assemblies', event)}
            onPress={() => setActiveTab('assemblies')}
            activeOpacity={0.8}
          >
            <Hammer size={15} color={activeTab === 'assemblies' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'assemblies' && styles.tabBtnTextActive]}>
              Montagens
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'map' && styles.tabBtnActive]}
            onLayout={(event) => recordTabLayout('map', event)}
            onPress={() => setActiveTab('map')}
            activeOpacity={0.8}
          >
            <Map size={15} color={activeTab === 'map' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'map' && styles.tabBtnTextActive]}>
              Mapa
            </Text>
          </TouchableOpacity>
          </ScrollView>
          {tabsScrollEdges.left && (
            <>
              <View pointerEvents="none" style={[styles.scrollFade, styles.leftScrollFade]}>
                <View style={[styles.scrollFadeSegment, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', opacity: 0.9 }]} />
                <View style={[styles.scrollFadeSegment, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', opacity: 0.65 }]} />
                <View style={[styles.scrollFadeSegment, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', opacity: 0.3 }]} />
              </View>
              <TouchableOpacity
                style={[styles.scrollArrow, styles.leftScrollArrow, isDarkMode && styles.scrollArrowDark]}
                onPress={() => scrollTabs(-1)}
                accessibilityRole="button"
                accessibilityLabel="Rolar abas para a esquerda"
              >
                <ChevronLeft size={18} color={isDarkMode ? '#e2e8f0' : '#2563eb'} />
              </TouchableOpacity>
            </>
          )}
          {tabsScrollEdges.right && (
            <>
              <View pointerEvents="none" style={[styles.scrollFade, styles.rightScrollFade]}>
                <View style={[styles.scrollFadeSegment, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', opacity: 0.3 }]} />
                <View style={[styles.scrollFadeSegment, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', opacity: 0.65 }]} />
                <View style={[styles.scrollFadeSegment, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', opacity: 0.9 }]} />
              </View>
              <TouchableOpacity
                style={[styles.scrollArrow, styles.rightScrollArrow, isDarkMode && styles.rightScrollArrowDark]}
                onPress={() => scrollTabs(1)}
                accessibilityRole="button"
                accessibilityLabel="Rolar abas para a direita"
              >
                <ChevronRight size={18} color="#ffffff" />
              </TouchableOpacity>
            </>
          )}
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
    paddingBottom: 18,
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
    marginBottom: 12,
    paddingTop: 2,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
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
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 48,
  },
  tabsViewport: {
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  tabsScrollView: { alignSelf: 'stretch' },
  tabsScrollWithLeftArrow: { marginLeft: 42 },
  tabsScrollWithRightArrow: { marginRight: 42 },
  scrollFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 42,
    flexDirection: 'row',
  },
  leftScrollFade: { left: 0 },
  rightScrollFade: { right: 0 },
  scrollFadeSegment: { flex: 1 },
  scrollArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.94)',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  leftScrollArrow: { left: 4 },
  rightScrollArrow: { right: 4, backgroundColor: '#2563eb' },
  rightScrollArrowDark: { backgroundColor: '#1d4ed8' },
  scrollArrowDark: { backgroundColor: 'rgba(30,41,59,0.96)' },
  tabBtn: {
    flexShrink: 0,
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    flexShrink: 0,
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
