import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Calendar, Map, Sparkles, RefreshCw } from 'lucide-react-native';
import { useDeliveryRoute, DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useRoutesApi } from '../hooks/useRoutesApi';
import { DeliveryMapView } from '../components/deliveryMap/DeliveryMapView';
import { NextDeliveryCard } from '../components/deliveryMap/NextDeliveryCard';
import { DeliveryBottomSheet } from '../components/deliveryMap/DeliveryBottomSheet';
import { RouteOptimizationModal } from '../components/deliveryMap/RouteOptimizationModal';
import { TodaySummaryCard } from '../components/TodaySummaryCard';
import { NativeLogisticsScreen } from './NativeLogisticsScreen';
import { calculateOptimizedRoute, applyOptimizedSequence, OptimizationResult } from '../services/routeOptimizationService';

export type DeliveriesSubTab = 'today' | 'map';

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
  const [activeTab, setActiveTab] = useState<DeliveriesSubTab>(initialTab === 'schedule' as any ? 'today' : initialTab);
  const [selectedMarkerItem, setSelectedMarkerItem] = useState<DeliveryRouteItem | null>(null);

  useEffect(() => {
    if (initialTab && initialTab !== ('schedule' as any)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Otimização de rota
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [applyingOptimization, setApplyingOptimization] = useState(false);

  // Hooks de Dados e Localização
  const { orders, routeItems, currentDelivery, nextDelivery, stats, loading, refreshing, onRefresh } = useDeliveryRoute();
  const { coords: driverCoords, refreshLocation } = useDriverLocation();

  // Coordenadas padrão do depósito Morante (Curitiba/Colombo - PR)
  const storeCoords = useMemo(() => ({
    latitude: -25.352,
    longitude: -49.169,
  }), []);

  // Alvo ativo da rota (próxima entrega ou entrega em andamento)
  const activeDeliveryTarget = currentDelivery || nextDelivery;

  // Polyline e métricas da Routes API entre motorista e próxima parada
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

  const handleOpenOptimization = async () => {
    try {
      const origin = driverCoords || storeCoords;
      const result = await calculateOptimizedRoute(routeItems, origin);
      setOptimizationResult(result);
      setShowOptimizationModal(true);
    } catch (e) {
      console.warn('Erro ao otimizar rota:', e);
    }
  };

  const handleConfirmOptimization = async () => {
    if (!optimizationResult) return;
    setApplyingOptimization(true);
    try {
      await applyOptimizedSequence(optimizationResult.optimizedItems);
      setShowOptimizationModal(false);
      onRefresh();
    } catch (e) {
      console.warn('Erro ao aplicar otimização:', e);
    } finally {
      setApplyingOptimization(false);
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Barra de Tabs Superior: [ Resumo ] [ Mapa ] */}
      <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, isDarkMode && styles.textLight]}>Entregas</Text>
            <Text style={[styles.screenSubtitle, isDarkMode && styles.textMuted]}>
              {activeTab === 'today'
                ? 'Resumo de inteligência operacional de entregas'
                : 'Visão geográfica e trajeto no mapa'}
            </Text>
          </View>
        </View>

        {/* Tabs no Topo em Pílulas */}
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
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>Carregando resumo...</Text>
            </View>
          ) : (
            <TodaySummaryCard
              orders={orders && orders.length > 0 ? orders : routeItems.map(item => item.order)}
              onSelectOrder={onSelectOrder}
              isDarkMode={isDarkMode}
            />
          )}
        </ScrollView>
      ) : (
        /* Aba MAPA: Visão geográfica limpa no mapa (sem barra de parada 1, 2, 3...) */
        <View style={styles.mapArea}>
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>Carregando mapa...</Text>
            </View>
          ) : (
            <View style={{ flex: 1, position: 'relative' }}>
              <DeliveryMapView
                items={routeItems}
                driverCoords={driverCoords}
                storeCoords={storeCoords}
                polylineCoords={polylineCoords}
                selectedItem={selectedMarkerItem}
                onSelectMarker={(item) => setSelectedMarkerItem(item)}
                isDarkMode={isDarkMode}
              />

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

      {/* Modal de Confirmação da Otimização */}
      <RouteOptimizationModal
        visible={showOptimizationModal}
        result={optimizationResult}
        applying={applyingOptimization}
        onApply={handleConfirmOptimization}
        onClose={() => setShowOptimizationModal(false)}
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
    paddingBottom: 10,
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
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  optimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  optimizeBtnDark: {
    backgroundColor: '#1e3a8a30',
    borderColor: '#1e40af',
  },
  optimizeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
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
  floatingCardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 10,
  },
});
