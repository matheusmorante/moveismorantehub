import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Calendar, Map, Sparkles, RefreshCw } from 'lucide-react-native';
import { useDeliveryRoute, DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useRoutesApi } from '../hooks/useRoutesApi';
import { DeliveryMapView } from '../components/deliveryMap/DeliveryMapView';
import { NextDeliveryCard } from '../components/deliveryMap/NextDeliveryCard';
import { DeliveryBottomSheet } from '../components/deliveryMap/DeliveryBottomSheet';
import { RouteProgressHeader } from '../components/deliveryMap/RouteProgressHeader';
import { RouteOptimizationModal } from '../components/deliveryMap/RouteOptimizationModal';
import { RouteListView } from '../components/routeList/RouteListView';
import { NativeLogisticsScreen } from './NativeLogisticsScreen';
import { calculateOptimizedRoute, applyOptimizedSequence, OptimizationResult } from '../services/routeOptimizationService';

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

  // Otimização de rota
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [applyingOptimization, setApplyingOptimization] = useState(false);

  // Hooks de Dados e Localização
  const { routeItems, currentDelivery, nextDelivery, stats, loading, refreshing, onRefresh } = useDeliveryRoute();
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

  const handleRegisterService = (item: DeliveryRouteItem) => {
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
      {/* Barra de Tabs Superior: [ Hoje ] [ Cronograma ] [ Mapa ] */}
      <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, isDarkMode && styles.textLight]}>Entregas</Text>
            <Text style={[styles.screenSubtitle, isDarkMode && styles.textMuted]}>
              {activeTab === 'today'
                ? `${stats.total} ${stats.total === 1 ? 'parada programada para hoje' : 'paradas programadas para hoje'}`
                : activeTab === 'schedule'
                ? 'Planejamento e agendamentos logísticos'
                : 'Visão geográfica e trajeto viário'}
            </Text>
          </View>

          {/* Botão de Otimizar Rota (ativo quando na aba Hoje ou Mapa e tiver mais de 1 pendente) */}
          {(activeTab === 'today' || activeTab === 'map') && stats.pending > 1 && (
            <TouchableOpacity
              style={[styles.optimizeBtn, isDarkMode && styles.optimizeBtnDark]}
              onPress={handleOpenOptimization}
              activeOpacity={0.8}
            >
              <Sparkles size={13} color="#2563eb" />
              <Text style={styles.optimizeBtnText}>Otimizar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs no Topo em Pílulas */}
        <View style={[styles.tabsPillContainer, isDarkMode && styles.tabsPillContainerDark]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'today' && styles.tabBtnActive]}
            onPress={() => setActiveTab('today')}
            activeOpacity={0.8}
          >
            <Clock size={13} color={activeTab === 'today' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.tabBtnText, activeTab === 'today' && styles.tabBtnTextActive]}>
              Hoje ({stats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]}
            onPress={() => setActiveTab('schedule')}
            activeOpacity={0.8}
          >
            <Calendar size={13} color={activeTab === 'schedule' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
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
      {activeTab === 'schedule' ? (
        <View style={{ flex: 1 }}>
          <NativeLogisticsScreen
            isDarkMode={isDarkMode}
            isAdmin={isAdmin}
            onSelectOrder={onSelectOrder}
            isEmbeddedInHub={true}
          />
        </View>
      ) : activeTab === 'today' ? (
        <View style={{ flex: 1 }}>
          {/* Progresso do Roteiro */}
          <RouteProgressHeader
            total={stats.total}
            completed={stats.completed}
            pending={stats.pending}
            percent={stats.percent}
            remainingKm={distanceKm}
            remainingMin={durationMin}
            isDarkMode={isDarkMode}
          />

          {/* Próxima Entrega / Em Andamento em Destaque no Topo */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
            <NextDeliveryCard
              currentDelivery={currentDelivery}
              nextDelivery={nextDelivery}
              allCompleted={stats.total > 0 && stats.pending === 0}
              onStartDelivery={handleStartDelivery}
              onViewOrder={handleViewOrder}
              onRegisterService={handleRegisterService}
              isDarkMode={isDarkMode}
            />
          </View>

          {/* Lista de Paradas do Dia */}
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>Carregando entregas de hoje...</Text>
            </View>
          ) : (
            <RouteListView
              items={routeItems}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onSelect={(item) => onSelectOrder(item.order)}
              onStartDelivery={handleStartDelivery}
              onViewOrder={handleViewOrder}
              isDarkMode={isDarkMode}
            />
          )}
        </View>
      ) : (
        /* activeTab === 'map' */
        <View style={styles.mapArea}>
          <RouteProgressHeader
            total={stats.total}
            completed={stats.completed}
            pending={stats.pending}
            percent={stats.percent}
            remainingKm={distanceKm}
            remainingMin={durationMin}
            isDarkMode={isDarkMode}
          />

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
                  onRegisterService={handleRegisterService}
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
