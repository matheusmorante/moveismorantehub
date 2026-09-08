import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Map, CalendarClock } from 'lucide-react-native';
import { useDeliveryRoute, DeliveryRouteDateScope, DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useRoutesApi } from '../hooks/useRoutesApi';
import { DeliveryMapView } from '../components/deliveryMap/DeliveryMapView';
import { MapErrorBoundary } from '../components/deliveryMap/MapErrorBoundary';
import { NextDeliveryCard } from '../components/deliveryMap/NextDeliveryCard';
import { DeliveryBottomSheet } from '../components/deliveryMap/DeliveryBottomSheet';
import { TodaySummaryCard } from '../components/TodaySummaryCard';
import { DeliveryTimelineView } from '../components/schedule/DeliveryTimelineView';

export type DeliveriesSubTab = 'today' | 'schedule' | 'map';

interface Props {
  isDarkMode?: boolean;
  isAdmin?: boolean;
  initialTab?: DeliveriesSubTab;
  onSelectOrder: (order: any) => void;
}

export const DeliveriesHubScreen: React.FC<Props> = ({
  isDarkMode = false,
  isAdmin = false,
  initialTab = 'today',
  onSelectOrder,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DeliveriesSubTab>(initialTab);
  const [selectedMarkerItem, setSelectedMarkerItem] = useState<DeliveryRouteItem | null>(null);
  const [scheduleDateScope, setScheduleDateScope] = useState<DeliveryRouteDateScope>('today');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Hooks de Dados e Localização
  const { orders, routeItems, currentDelivery, nextDelivery, stats, loading, refreshing, onRefresh } = useDeliveryRoute(
    activeTab === 'schedule' ? scheduleDateScope : 'today',
  );
  const { coords: driverCoords } = useDriverLocation();

  // Coordenadas padrão do depósito Morante (Curitiba/Colombo - PR)
  const storeCoords = useMemo(() => ({
    latitude: -25.352,
    longitude: -49.169,
  }), []);

  // Alvo ativo da rota (próxima entrega ou entrega em andamento)
  const activeDeliveryTarget = currentDelivery || nextDelivery;

  // Polyline e métricas da Routes API entre motorista e próxima parada
  const { polylineCoords } = useRoutesApi({
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
      {/* Barra de Tabs Superior: [ Resumo ] [ Cronograma ] [ Mapa ] */}
      <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, isDarkMode && styles.textLight]}>Entregas</Text>
          </View>
        </View>

        {/* Tabs no Topo em Pílulas: [ Resumo ] [ Cronograma ] [ Mapa ] */}
        <View style={[styles.tabsPillContainer, isDarkMode && styles.tabsPillContainerDark]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'today' && styles.tabBtnActive]}
            onPress={() => setActiveTab('today')}
            activeOpacity={0.8}
          >
            <FileText size={13} color={activeTab === 'today' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'today' && styles.tabBtnTextActive]}>
              Resumo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]}
            onPress={() => setActiveTab('schedule')}
            activeOpacity={0.8}
          >
            <CalendarClock size={13} color={activeTab === 'schedule' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'schedule' && styles.tabBtnTextActive]}>
              Cronograma
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'map' && styles.tabBtnActive]}
            onPress={() => setActiveTab('map')}
            activeOpacity={0.8}
          >
            <Map size={13} color={activeTab === 'map' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'map' && styles.tabBtnTextActive]}>
              Mapa
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo Dinâmico Conforme a Sub-aba Selecionada */}
      {activeTab === 'today' ? (
        /* Aba RESUMO: Contém estritamente o Card de Resumo de Entregas */
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
            isDarkMode={isDarkMode}
          />
        </ScrollView>
      ) : activeTab === 'schedule' ? (
        /* Aba CRONOGRAMA: Timeline vertical enxuta e focada */
        loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>Carregando cronograma...</Text>
          </View>
        ) : (
          <DeliveryTimelineView
            items={routeItems}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onStartDelivery={handleStartDelivery}
            onViewOrder={handleViewOrder}
            dateScope={scheduleDateScope}
            onChangeDateScope={setScheduleDateScope}
            isDarkMode={isDarkMode}
          />
        )
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
                />
              </MapErrorBoundary>

              {/* Card Flutuante Inferior */}
              <View style={styles.floatingCardContainer}>
                <NextDeliveryCard
                  currentDelivery={currentDelivery}
                  nextDelivery={nextDelivery}
                  allCompleted={stats.total > 0 && stats.pending === 0}
                  onStartDelivery={handleStartDelivery}
                  onViewOrder={handleViewOrder}
                  onRegisterService={handleViewOrder}
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Modal de Detalhes da Parada (Bottom Sheet ao tocar no marcador do mapa) */}
      <DeliveryBottomSheet
        item={selectedMarkerItem}
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
    paddingBottom: 8,
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
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  tabsPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
  },
  tabsPillContainerDark: {
    backgroundColor: '#0f172a',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
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
